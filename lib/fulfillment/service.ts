import "server-only";

import { eq, sql } from "drizzle-orm";

import { getInteractiveDb } from "@/db/interactive";
import {
  consumerProfiles,
  fulfillments,
  settlements,
} from "@/db/schema";
import {
  forwardGeocode,
  isGoogleGeocodingConfigured,
} from "@/lib/geo/google";
import type { FulfillmentDeliveryInput } from "@/lib/validation/fulfillment";

import {
  formatPickupCode,
  generatePickupCodeCandidate,
  getPickupCodeExpiresAt,
  normalizePickupCodeInput,
} from "./pickup-code";
import { normalizePhoneNumber } from "./phone";
import { mapUberDirectStatusToFulfillmentStatus } from "./status";
import type { UberDirectWebhookPayload } from "./uber-direct";
import {
  createUberDirectDelivery,
  createUberDirectQuote,
} from "./uber-direct";

type InteractiveTransaction = Parameters<
  Parameters<ReturnType<typeof getInteractiveDb>["transaction"]>[0]
>[0];

type LockedCapturedSettlementRow = {
  buyerUserId: string | null;
  buyerName: string | null;
  buyerEmail: string;
};

type LockedConsumerFulfillmentRow = {
  id: string;
  settlementId: string;
  listingId: string;
  status: string;
  mode: string;
  pickupCode: string | null;
  pickupCodeExpiresAt: Date | null;
  deliveryQuoteId: string | null;
  deliveryReferenceId: string | null;
  deliveryTrackingUrl: string | null;
  settlementStatus: string;
  businessName: string;
  businessContactPhone: string | null;
  businessAddressLine1: string | null;
  businessAddressLine2: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPostalCode: string | null;
  businessCountryCode: string | null;
  businessLatitude: number | null;
  businessLongitude: number | null;
  listingTitle: string;
  userName: string | null;
  userEmail: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryPostalCode: string;
  deliveryCountryCode: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryPlaceId: string | null;
  deliveryGeocodeProvider: string;
  deliveryGeocodedAt: Date;
};

type LockedBusinessFulfillmentRow = {
  id: string;
  settlementId: string;
  status: string;
  pickupCode: string | null;
  pickupCodeExpiresAt: Date | null;
};

type LockedWebhookFulfillmentRow = {
  id: string;
  settlementId: string;
  status: string;
  mode: string;
};

type ResolvedDeliveryAddress = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  geocodeProvider: string;
  geocodedAt: Date;
};

export class FulfillmentServiceError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function buildAddressQuery(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeConsumerPhoneOrThrow(phone: string): string {
  try {
    return normalizePhoneNumber(phone);
  } catch {
    throw new FulfillmentServiceError(
      "DELIVERY_PHONE_INVALID",
      "Add a valid US phone number for delivery.",
      409,
    );
  }
}

async function ensureUniquePickupCode(
  tx: InteractiveTransaction,
): Promise<string> {
  const now = new Date();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generatePickupCodeCandidate();
    const existing = await tx.execute(sql<{ id: string }>`
      select id
      from fulfillments
      where pickup_code = ${code}
        and (
          pickup_code_expires_at is null
          or pickup_code_expires_at >= ${now}
        )
        and status <> 'picked_up'
      limit 1
    `);

    if (existing.rows.length === 0) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique pickup code.");
}

function assertMutableSelectionStatus(status: string) {
  if (
    status !== "pending_choice" &&
    status !== "ready_for_pickup" &&
    status !== "failed"
  ) {
    throw new FulfillmentServiceError(
      "FULFILLMENT_LOCKED",
      "This fulfillment can no longer change pickup or delivery mode.",
      409,
    );
  }
}

function getRecipientName(
  row: Pick<LockedConsumerFulfillmentRow, "userName" | "userEmail">,
  inputName?: string | null,
): string {
  return inputName?.trim() || row.userName?.trim() || row.userEmail;
}

function getRequiredBusinessAddress(row: LockedConsumerFulfillmentRow) {
  if (
    !row.businessAddressLine1 ||
    !row.businessCity ||
    !row.businessState ||
    !row.businessPostalCode ||
    !row.businessCountryCode ||
    row.businessLatitude === null ||
    row.businessLongitude === null
  ) {
    throw new FulfillmentServiceError(
      "BUSINESS_ADDRESS_MISSING",
      "The store is missing the address details required for delivery.",
      409,
    );
  }

  return {
    addressLine1: row.businessAddressLine1,
    addressLine2: row.businessAddressLine2,
    city: row.businessCity,
    state: row.businessState,
    postalCode: row.businessPostalCode,
    countryCode: row.businessCountryCode,
    latitude: row.businessLatitude,
    longitude: row.businessLongitude,
  };
}

function getRequiredBusinessPhone(row: LockedConsumerFulfillmentRow): string {
  if (!row.businessContactPhone) {
    throw new FulfillmentServiceError(
      "BUSINESS_PHONE_MISSING",
      "The store is missing the phone number required for delivery.",
      409,
    );
  }

  try {
    return normalizePhoneNumber(row.businessContactPhone);
  } catch {
    throw new FulfillmentServiceError(
      "BUSINESS_PHONE_INVALID",
      "The store phone number is not valid enough for delivery.",
      409,
    );
  }
}

async function resolveDeliveryAddress(
  row: LockedConsumerFulfillmentRow,
  input: FulfillmentDeliveryInput,
): Promise<ResolvedDeliveryAddress> {
  const sameAsProfile =
    row.deliveryAddressLine1 === input.deliveryAddressLine1.trim() &&
    (row.deliveryAddressLine2 ?? "") ===
      (input.deliveryAddressLine2?.trim() ?? "") &&
    row.deliveryCity === input.deliveryCity.trim() &&
    row.deliveryState === input.deliveryState.trim() &&
    row.deliveryPostalCode === input.deliveryPostalCode.trim() &&
    row.deliveryCountryCode === input.deliveryCountryCode.trim();

  if (sameAsProfile) {
    return {
      addressLine1: row.deliveryAddressLine1,
      addressLine2: row.deliveryAddressLine2 ?? "",
      city: row.deliveryCity,
      state: row.deliveryState,
      postalCode: row.deliveryPostalCode,
      countryCode: row.deliveryCountryCode,
      latitude: row.deliveryLatitude,
      longitude: row.deliveryLongitude,
      placeId: row.deliveryPlaceId ?? undefined,
      geocodeProvider: row.deliveryGeocodeProvider,
      geocodedAt: row.deliveryGeocodedAt,
    };
  }

  const query = buildAddressQuery([
    input.deliveryAddressLine1,
    input.deliveryAddressLine2,
    input.deliveryCity,
    input.deliveryState,
    input.deliveryPostalCode,
    input.deliveryCountryCode,
  ]);
  const geocoded = await forwardGeocode(query);

  if (!geocoded) {
    if (!isGoogleGeocodingConfigured) {
      throw new FulfillmentServiceError(
        "DELIVERY_ADDRESS_UNVERIFIED",
        "Edited delivery addresses need Google geocoding in this environment.",
        409,
      );
    }

    throw new FulfillmentServiceError(
      "DELIVERY_ADDRESS_UNVERIFIED",
      "We could not verify that delivery address yet. Tighten the address details and try again.",
      409,
    );
  }

  return {
    addressLine1: input.deliveryAddressLine1.trim(),
    addressLine2: input.deliveryAddressLine2?.trim() ?? "",
    city: input.deliveryCity.trim(),
    state: input.deliveryState.trim(),
    postalCode: input.deliveryPostalCode.trim(),
    countryCode: input.deliveryCountryCode.trim(),
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    placeId: geocoded.geocodeFeatureId,
    geocodeProvider: geocoded.geocodeProvider,
    geocodedAt: geocoded.geocodedAt,
  };
}

async function lockCapturedSettlement(
  tx: InteractiveTransaction,
  settlementId: string,
): Promise<LockedCapturedSettlementRow | null> {
  const result = await tx.execute(sql<LockedCapturedSettlementRow>`
    select
      s.buyer_user_id as "buyerUserId",
      u.display_name as "buyerName",
      u.email as "buyerEmail"
    from settlements s
    left join users u on u.id = s.buyer_user_id
    where s.id = ${settlementId}
    for update of s
  `);

  return (result.rows[0] as LockedCapturedSettlementRow | undefined) ?? null;
}

async function loadConsumerFulfillment(
  fulfillmentId: string,
  userId: string,
): Promise<LockedConsumerFulfillmentRow | null> {
  const result = await getInteractiveDb().execute(sql<LockedConsumerFulfillmentRow>`
    select
      f.id,
      f.settlement_id as "settlementId",
      f.listing_id as "listingId",
      f.status,
      f.mode,
      f.pickup_code as "pickupCode",
      f.pickup_code_expires_at as "pickupCodeExpiresAt",
      f.delivery_quote_id as "deliveryQuoteId",
      f.delivery_reference_id as "deliveryReferenceId",
      f.delivery_tracking_url as "deliveryTrackingUrl",
      s.status as "settlementStatus",
      b.name as "businessName",
      b.phone as "businessContactPhone",
      b.address_line_1 as "businessAddressLine1",
      b.address_line_2 as "businessAddressLine2",
      b.city as "businessCity",
      b.state as "businessState",
      b.postal_code as "businessPostalCode",
      b.country_code as "businessCountryCode",
      b.latitude as "businessLatitude",
      b.longitude as "businessLongitude",
      l.title as "listingTitle",
      u.display_name as "userName",
      u.email as "userEmail",
      cp.delivery_address_line_1 as "deliveryAddressLine1",
      cp.delivery_address_line_2 as "deliveryAddressLine2",
      cp.delivery_city as "deliveryCity",
      cp.delivery_state as "deliveryState",
      cp.delivery_postal_code as "deliveryPostalCode",
      cp.delivery_country_code as "deliveryCountryCode",
      cp.delivery_latitude as "deliveryLatitude",
      cp.delivery_longitude as "deliveryLongitude",
      cp.delivery_place_id as "deliveryPlaceId",
      cp.delivery_geocode_provider as "deliveryGeocodeProvider",
      cp.delivery_geocoded_at as "deliveryGeocodedAt"
    from fulfillments f
    inner join settlements s on s.id = f.settlement_id
    inner join businesses b on b.id = s.business_id
    inner join listings l on l.id = f.listing_id
    inner join consumer_profiles cp on cp.user_id = s.buyer_user_id
    inner join users u on u.id = s.buyer_user_id
    where f.id = ${fulfillmentId}
      and s.buyer_user_id = ${userId}
    limit 1
  `);

  return (result.rows[0] as LockedConsumerFulfillmentRow | undefined) ?? null;
}

async function lockConsumerFulfillment(
  tx: InteractiveTransaction,
  fulfillmentId: string,
  userId: string,
): Promise<LockedConsumerFulfillmentRow | null> {
  const result = await tx.execute(sql<LockedConsumerFulfillmentRow>`
    select
      f.id,
      f.settlement_id as "settlementId",
      f.listing_id as "listingId",
      f.status,
      f.mode,
      f.pickup_code as "pickupCode",
      f.pickup_code_expires_at as "pickupCodeExpiresAt",
      f.delivery_quote_id as "deliveryQuoteId",
      f.delivery_reference_id as "deliveryReferenceId",
      f.delivery_tracking_url as "deliveryTrackingUrl",
      s.status as "settlementStatus",
      b.name as "businessName",
      b.phone as "businessContactPhone",
      b.address_line_1 as "businessAddressLine1",
      b.address_line_2 as "businessAddressLine2",
      b.city as "businessCity",
      b.state as "businessState",
      b.postal_code as "businessPostalCode",
      b.country_code as "businessCountryCode",
      b.latitude as "businessLatitude",
      b.longitude as "businessLongitude",
      l.title as "listingTitle",
      u.display_name as "userName",
      u.email as "userEmail",
      cp.delivery_address_line_1 as "deliveryAddressLine1",
      cp.delivery_address_line_2 as "deliveryAddressLine2",
      cp.delivery_city as "deliveryCity",
      cp.delivery_state as "deliveryState",
      cp.delivery_postal_code as "deliveryPostalCode",
      cp.delivery_country_code as "deliveryCountryCode",
      cp.delivery_latitude as "deliveryLatitude",
      cp.delivery_longitude as "deliveryLongitude",
      cp.delivery_place_id as "deliveryPlaceId",
      cp.delivery_geocode_provider as "deliveryGeocodeProvider",
      cp.delivery_geocoded_at as "deliveryGeocodedAt"
    from fulfillments f
    inner join settlements s on s.id = f.settlement_id
    inner join businesses b on b.id = s.business_id
    inner join listings l on l.id = f.listing_id
    inner join consumer_profiles cp on cp.user_id = s.buyer_user_id
    inner join users u on u.id = s.buyer_user_id
    where f.id = ${fulfillmentId}
      and s.buyer_user_id = ${userId}
    for update of f, s, cp
  `);

  return (result.rows[0] as LockedConsumerFulfillmentRow | undefined) ?? null;
}

async function lockBusinessFulfillment(
  tx: InteractiveTransaction,
  fulfillmentId: string,
  userId: string,
): Promise<LockedBusinessFulfillmentRow | null> {
  const result = await tx.execute(sql<LockedBusinessFulfillmentRow>`
    select
      f.id,
      f.settlement_id as "settlementId",
      f.status,
      f.pickup_code as "pickupCode",
      f.pickup_code_expires_at as "pickupCodeExpiresAt"
    from fulfillments f
    inner join settlements s on s.id = f.settlement_id
    inner join business_memberships bm on bm.business_id = s.business_id
    where f.id = ${fulfillmentId}
      and bm.user_id = ${userId}
    for update of f, s
  `);

  return (result.rows[0] as LockedBusinessFulfillmentRow | undefined) ?? null;
}

async function lockWebhookFulfillmentById(
  tx: InteractiveTransaction,
  fulfillmentId: string,
): Promise<LockedWebhookFulfillmentRow | null> {
  const result = await tx.execute(sql<LockedWebhookFulfillmentRow>`
    select
      f.id,
      f.settlement_id as "settlementId",
      f.status,
      f.mode
    from fulfillments f
    where f.id = ${fulfillmentId}
    for update of f
  `);

  return (result.rows[0] as LockedWebhookFulfillmentRow | undefined) ?? null;
}

async function lockWebhookFulfillmentByReferenceId(
  tx: InteractiveTransaction,
  referenceId: string,
): Promise<LockedWebhookFulfillmentRow | null> {
  const result = await tx.execute(sql<LockedWebhookFulfillmentRow>`
    select
      f.id,
      f.settlement_id as "settlementId",
      f.status,
      f.mode
    from fulfillments f
    where f.delivery_reference_id = ${referenceId}
    for update of f
  `);

  return (result.rows[0] as LockedWebhookFulfillmentRow | undefined) ?? null;
}

export async function insertFulfillmentForCapturedSettlement(
  tx: InteractiveTransaction,
  params: {
    settlementId: string;
    listingId: string;
    createdAt: Date;
  },
): Promise<void> {
  const settlement = await lockCapturedSettlement(tx, params.settlementId);

  if (!settlement) {
    return;
  }

  const pickupCode = await ensureUniquePickupCode(tx);
  const pickupCodeExpiresAt = getPickupCodeExpiresAt(params.createdAt);

  await tx
    .insert(fulfillments)
    .values({
      settlementId: params.settlementId,
      listingId: params.listingId,
      mode: "pickup",
      status: "pending_choice",
      deliveryProvider: "none",
      pickupCode,
      pickupCodeExpiresAt,
      recipientName:
        settlement.buyerName?.trim() || settlement.buyerEmail || "Shopper",
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
    })
    .onConflictDoNothing({ target: fulfillments.settlementId });
}

export async function selectPickupForConsumer(
  fulfillmentId: string,
  userId: string,
): Promise<{ pickupCodeFormatted: string | null }> {
  return getInteractiveDb().transaction(async (tx) => {
    const row = await lockConsumerFulfillment(tx, fulfillmentId, userId);

    if (!row) {
      throw new FulfillmentServiceError(
        "FULFILLMENT_NOT_FOUND",
        "This fulfillment could not be found.",
        404,
      );
    }

    assertMutableSelectionStatus(row.status);

    const now = new Date();
    await tx
      .update(fulfillments)
      .set({
        mode: "pickup",
        status: "ready_for_pickup",
        deliveryProvider: "none",
        deliveryQuoteId: null,
        deliveryReferenceId: null,
        deliveryTrackingUrl: null,
        updatedAt: now,
      })
      .where(eq(fulfillments.id, row.id));

    await tx
      .update(settlements)
      .set({
        status: "ready_for_fulfillment",
        updatedAt: now,
      })
      .where(eq(settlements.id, row.settlementId));

    return {
      pickupCodeFormatted: formatPickupCode(row.pickupCode),
    };
  });
}

export async function quoteDeliveryForConsumer(
  fulfillmentId: string,
  userId: string,
  input: FulfillmentDeliveryInput,
) {
  const row = await loadConsumerFulfillment(fulfillmentId, userId);

  if (!row) {
    throw new FulfillmentServiceError(
      "FULFILLMENT_NOT_FOUND",
      "This fulfillment could not be found.",
      404,
    );
  }

  assertMutableSelectionStatus(row.status);

  const recipientPhone = normalizeConsumerPhoneOrThrow(input.recipientPhone);
  const businessAddress = getRequiredBusinessAddress(row);
  const dropoffAddress = await resolveDeliveryAddress(row, input);
  const quote = await createUberDirectQuote({
    fulfillmentId: row.id,
    pickup: businessAddress,
    dropoff: dropoffAddress,
  });

  return {
    quoteId: quote.quoteId,
    feeCents: quote.feeCents,
    currency: quote.currency,
    etaMinutes: quote.etaMinutes,
    isStub: quote.isStub,
    normalizedAddress: dropoffAddress,
    recipientName: getRecipientName(row, input.recipientName),
    recipientPhone,
  };
}

export async function requestDeliveryForConsumer(
  fulfillmentId: string,
  userId: string,
  input: FulfillmentDeliveryInput,
) {
  const initialRow = await loadConsumerFulfillment(fulfillmentId, userId);

  if (!initialRow) {
    throw new FulfillmentServiceError(
      "FULFILLMENT_NOT_FOUND",
      "This fulfillment could not be found.",
      404,
    );
  }

  assertMutableSelectionStatus(initialRow.status);

  const recipientName = getRecipientName(initialRow, input.recipientName);
  const recipientPhone = normalizeConsumerPhoneOrThrow(input.recipientPhone);
  const businessAddress = getRequiredBusinessAddress(initialRow);
  const businessPhone = getRequiredBusinessPhone(initialRow);
  const dropoffAddress = await resolveDeliveryAddress(initialRow, input);

  const quote =
    input.quoteId?.trim().length
      ? {
          quoteId: input.quoteId.trim(),
        }
      : await createUberDirectQuote({
          fulfillmentId: initialRow.id,
          pickup: businessAddress,
          dropoff: dropoffAddress,
        });

  const delivery = await createUberDirectDelivery({
    fulfillmentId: initialRow.id,
    quoteId: quote.quoteId,
    listingTitle: initialRow.listingTitle,
    pickupName: initialRow.businessName,
    pickupPhoneNumber: businessPhone,
    pickup: businessAddress,
    dropoffName: recipientName,
    dropoffPhoneNumber: recipientPhone,
    dropoff: dropoffAddress,
  });

  await getInteractiveDb().transaction(async (tx) => {
    const row = await lockConsumerFulfillment(tx, fulfillmentId, userId);

    if (!row) {
      throw new FulfillmentServiceError(
        "FULFILLMENT_NOT_FOUND",
        "This fulfillment could not be found.",
        404,
      );
    }

    assertMutableSelectionStatus(row.status);

    const now = new Date();
    await tx
      .update(consumerProfiles)
      .set({
        deliveryAddressLine1: dropoffAddress.addressLine1,
        deliveryAddressLine2: dropoffAddress.addressLine2,
        deliveryCity: dropoffAddress.city,
        deliveryState: dropoffAddress.state,
        deliveryPostalCode: dropoffAddress.postalCode,
        deliveryCountryCode: dropoffAddress.countryCode,
        deliveryLatitude: dropoffAddress.latitude,
        deliveryLongitude: dropoffAddress.longitude,
        deliveryPlaceId: dropoffAddress.placeId,
        deliveryGeocodeProvider: dropoffAddress.geocodeProvider,
        deliveryGeocodedAt: dropoffAddress.geocodedAt,
        updatedAt: now,
      })
      .where(eq(consumerProfiles.userId, userId));

    await tx
      .update(fulfillments)
      .set({
        mode: "delivery",
        status: mapUberDirectStatusToFulfillmentStatus(delivery.rawStatus),
        deliveryProvider: "uber_direct",
        recipientName,
        recipientPhone,
        deliveryQuoteId: delivery.quoteId,
        deliveryReferenceId: delivery.referenceId,
        deliveryTrackingUrl: delivery.trackingUrl,
        updatedAt: now,
      })
      .where(eq(fulfillments.id, row.id));

    await tx
      .update(settlements)
      .set({
        status: "ready_for_fulfillment",
        updatedAt: now,
      })
      .where(eq(settlements.id, row.settlementId));
  });
}

export async function verifyPickupForBusiness(
  fulfillmentId: string,
  userId: string,
  rawCode: string,
): Promise<void> {
  await getInteractiveDb().transaction(async (tx) => {
    const row = await lockBusinessFulfillment(tx, fulfillmentId, userId);

    if (!row) {
      throw new FulfillmentServiceError(
        "FULFILLMENT_NOT_FOUND",
        "This fulfillment could not be found.",
        404,
      );
    }

    if (row.status !== "ready_for_pickup") {
      throw new FulfillmentServiceError(
        "PICKUP_NOT_READY",
        "This pickup is not ready to be verified.",
        409,
      );
    }

    if (!row.pickupCode) {
      throw new FulfillmentServiceError(
        "PICKUP_CODE_MISSING",
        "This fulfillment is missing its pickup code.",
        409,
      );
    }

    const now = new Date();
    if (row.pickupCodeExpiresAt && row.pickupCodeExpiresAt < now) {
      throw new FulfillmentServiceError(
        "PICKUP_CODE_EXPIRED",
        "This pickup code has expired.",
        409,
      );
    }

    if (normalizePickupCodeInput(rawCode) !== normalizePickupCodeInput(row.pickupCode)) {
      throw new FulfillmentServiceError(
        "PICKUP_CODE_INVALID",
        "That pickup code does not match this order.",
        409,
      );
    }

    await tx
      .update(fulfillments)
      .set({
        status: "picked_up",
        updatedAt: now,
      })
      .where(eq(fulfillments.id, row.id));

    await tx
      .update(settlements)
      .set({
        status: "completed",
        updatedAt: now,
      })
      .where(eq(settlements.id, row.settlementId));
  });
}

export async function applyUberDirectWebhookEvent(
  payload: UberDirectWebhookPayload,
): Promise<void> {
  const externalOrderId = payload.meta?.external_order_id?.trim();
  const referenceId =
    payload.meta?.order_id?.trim() || payload.delivery_id?.trim();
  const rawStatus = payload.meta?.status?.trim() || payload.status?.trim();

  if (!externalOrderId && !referenceId) {
    return;
  }

  await getInteractiveDb().transaction(async (tx) => {
    const row =
      (externalOrderId
        ? await lockWebhookFulfillmentById(tx, externalOrderId)
        : null) ??
      (referenceId
        ? await lockWebhookFulfillmentByReferenceId(tx, referenceId)
        : null);

    if (!row) {
      return;
    }

    if (row.mode !== "delivery" || row.status === "picked_up") {
      return;
    }

    const nextStatus = mapUberDirectStatusToFulfillmentStatus(rawStatus);
    const rank = {
      delivery_requested: 1,
      out_for_delivery: 2,
      delivered: 3,
      failed: 3,
    } as const;

    const currentRank =
      row.status in rank
        ? rank[row.status as keyof typeof rank]
        : 0;
    const nextRank = rank[nextStatus];

    if (currentRank > nextRank && row.status !== "failed") {
      return;
    }

    if (row.status === "delivered" && nextStatus !== "delivered") {
      return;
    }

    const now = new Date();

    await tx
      .update(fulfillments)
      .set({
        status: nextStatus,
        deliveredAt: nextStatus === "delivered" ? now : null,
        updatedAt: now,
      })
      .where(eq(fulfillments.id, row.id));

    const settlementStatus =
      nextStatus === "delivered"
        ? "completed"
        : nextStatus === "failed"
          ? "failed"
          : "ready_for_fulfillment";

    await tx
      .update(settlements)
      .set({
        status: settlementStatus,
        updatedAt: now,
      })
      .where(eq(settlements.id, row.settlementId));
  });
}
