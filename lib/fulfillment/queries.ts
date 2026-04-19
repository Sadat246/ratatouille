import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  businessMemberships,
  businesses,
  consumerProfiles,
  fulfillments,
  listingImages,
  listings,
  settlements,
  users,
} from "@/db/schema";

import { formatPickupCode } from "./pickup-code";
import {
  canChooseDelivery,
  canChoosePickup,
  getConsumerFulfillmentStatusLabel,
  getFulfillmentTone,
  getSellerFulfillmentStatusLabel,
} from "./status";

async function getPrimaryImageUrls(listingIds: string[]) {
  if (listingIds.length === 0) {
    return new Map<string, string>();
  }

  const images = await db
    .select({
      listingId: listingImages.listingId,
      imageUrl: listingImages.imageUrl,
      sortOrder: listingImages.sortOrder,
    })
    .from(listingImages)
    .where(inArray(listingImages.listingId, listingIds))
    .orderBy(asc(listingImages.listingId), asc(listingImages.sortOrder));

  const imageMap = new Map<string, string>();

  for (const image of images) {
    if (!imageMap.has(image.listingId)) {
      imageMap.set(image.listingId, image.imageUrl);
    }
  }

  return imageMap;
}

export type ConsumerFulfillmentItem = {
  id: string;
  settlementId: string;
  auctionId: string;
  mode: string;
  status: string;
  statusLabel: string;
  statusTone: ReturnType<typeof getFulfillmentTone>;
  canChoosePickup: boolean;
  canChooseDelivery: boolean;
  pickupCode: string | null;
  pickupCodeFormatted: string | null;
  pickupCodeExpiresAt: Date | null;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryTrackingUrl: string | null;
  deliveredAt: Date | null;
  updatedAt: Date;
  listing: {
    id: string;
    title: string;
    packageDate: string | null;
    imageUrl: string | null;
  };
  business: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    pickupHours: string | null;
    pickupInstructions: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  deliveryAddress: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };
};

type ConsumerFulfillmentRow = {
  id: string;
  settlementId: string;
  auctionId: string;
  mode: string;
  status: string;
  pickupCode: string | null;
  pickupCodeExpiresAt: Date | null;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryTrackingUrl: string | null;
  deliveredAt: Date | null;
  updatedAt: Date;
  listingId: string;
  listingTitle: string;
  listingPackageDate: string | null;
  businessId: string;
  businessName: string;
  businessCity: string | null;
  businessState: string | null;
  businessPickupHours: string | null;
  businessPickupInstructions: string | null;
  businessContactEmail: string | null;
  businessContactPhone: string | null;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryPostalCode: string;
  deliveryCountryCode: string;
};

async function selectConsumerFulfillmentRows(
  userId: string,
  fulfillmentId?: string,
): Promise<ConsumerFulfillmentRow[]> {
  return db
    .select({
      id: fulfillments.id,
      settlementId: fulfillments.settlementId,
      auctionId: settlements.auctionId,
      mode: fulfillments.mode,
      status: fulfillments.status,
      pickupCode: fulfillments.pickupCode,
      pickupCodeExpiresAt: fulfillments.pickupCodeExpiresAt,
      recipientName: fulfillments.recipientName,
      recipientPhone: fulfillments.recipientPhone,
      deliveryTrackingUrl: fulfillments.deliveryTrackingUrl,
      deliveredAt: fulfillments.deliveredAt,
      updatedAt: fulfillments.updatedAt,
      listingId: listings.id,
      listingTitle: listings.title,
      listingPackageDate: listings.expiryText,
      businessId: businesses.id,
      businessName: businesses.name,
      businessCity: businesses.city,
      businessState: businesses.state,
      businessPickupHours: businesses.pickupHours,
      businessPickupInstructions: businesses.pickupInstructions,
      businessContactEmail: businesses.contactEmail,
      businessContactPhone: businesses.contactPhone,
      deliveryAddressLine1: consumerProfiles.deliveryAddressLine1,
      deliveryAddressLine2: consumerProfiles.deliveryAddressLine2,
      deliveryCity: consumerProfiles.deliveryCity,
      deliveryState: consumerProfiles.deliveryState,
      deliveryPostalCode: consumerProfiles.deliveryPostalCode,
      deliveryCountryCode: consumerProfiles.deliveryCountryCode,
    })
    .from(fulfillments)
    .innerJoin(settlements, eq(settlements.id, fulfillments.settlementId))
    .innerJoin(listings, eq(listings.id, fulfillments.listingId))
    .innerJoin(businesses, eq(businesses.id, settlements.businessId))
    .innerJoin(consumerProfiles, eq(consumerProfiles.userId, settlements.buyerUserId))
    .where(
      and(
        eq(settlements.buyerUserId, userId),
        fulfillmentId ? eq(fulfillments.id, fulfillmentId) : undefined,
      ),
    )
    .orderBy(desc(fulfillments.updatedAt));
}

function mapConsumerFulfillmentRow(
  row: ConsumerFulfillmentRow,
  imageUrl: string | null,
): ConsumerFulfillmentItem {
  return {
    id: row.id,
    settlementId: row.settlementId,
    auctionId: row.auctionId,
    mode: row.mode,
    status: row.status,
    statusLabel: getConsumerFulfillmentStatusLabel(row.status, row.mode),
    statusTone: getFulfillmentTone(row.status),
    canChoosePickup: canChoosePickup(row.status),
    canChooseDelivery: canChooseDelivery(row.status),
    pickupCode: row.pickupCode,
    pickupCodeFormatted: formatPickupCode(row.pickupCode),
    pickupCodeExpiresAt: row.pickupCodeExpiresAt,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    deliveryTrackingUrl: row.deliveryTrackingUrl,
    deliveredAt: row.deliveredAt,
    updatedAt: row.updatedAt,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
      packageDate: row.listingPackageDate,
      imageUrl,
    },
    business: {
      id: row.businessId,
      name: row.businessName,
      city: row.businessCity,
      state: row.businessState,
      pickupHours: row.businessPickupHours,
      pickupInstructions: row.businessPickupInstructions,
      contactEmail: row.businessContactEmail,
      contactPhone: row.businessContactPhone,
    },
    deliveryAddress: {
      addressLine1: row.deliveryAddressLine1,
      addressLine2: row.deliveryAddressLine2,
      city: row.deliveryCity,
      state: row.deliveryState,
      postalCode: row.deliveryPostalCode,
      countryCode: row.deliveryCountryCode,
    },
  };
}

export async function getConsumerFulfillments(
  userId: string,
): Promise<ConsumerFulfillmentItem[]> {
  const rows = await selectConsumerFulfillmentRows(userId);
  const imageMap = await getPrimaryImageUrls(rows.map((row) => row.listingId));

  return rows.map((row) =>
    mapConsumerFulfillmentRow(row, imageMap.get(row.listingId) ?? null),
  );
}

export async function getConsumerFulfillmentById(
  userId: string,
  fulfillmentId: string,
): Promise<ConsumerFulfillmentItem | null> {
  const rows = await selectConsumerFulfillmentRows(userId, fulfillmentId);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const imageMap = await getPrimaryImageUrls([row.listingId]);
  return mapConsumerFulfillmentRow(row, imageMap.get(row.listingId) ?? null);
}

export type SellerFulfillmentItem = {
  id: string;
  settlementId: string;
  mode: string;
  status: string;
  statusLabel: string;
  statusTone: ReturnType<typeof getFulfillmentTone>;
  pickupCodeExpiresAt: Date | null;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryTrackingUrl: string | null;
  updatedAt: Date;
  listing: {
    id: string;
    title: string;
    packageDate: string | null;
    imageUrl: string | null;
  };
  buyer: {
    name: string | null;
    email: string | null;
  };
};

type SellerFulfillmentRow = {
  id: string;
  settlementId: string;
  mode: string;
  status: string;
  pickupCodeExpiresAt: Date | null;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryTrackingUrl: string | null;
  updatedAt: Date;
  listingId: string;
  listingTitle: string;
  listingPackageDate: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
};

async function selectSellerFulfillmentRows(
  userId: string,
  fulfillmentId?: string,
): Promise<SellerFulfillmentRow[]> {
  return db
    .select({
      id: fulfillments.id,
      settlementId: fulfillments.settlementId,
      mode: fulfillments.mode,
      status: fulfillments.status,
      pickupCodeExpiresAt: fulfillments.pickupCodeExpiresAt,
      recipientName: fulfillments.recipientName,
      recipientPhone: fulfillments.recipientPhone,
      deliveryTrackingUrl: fulfillments.deliveryTrackingUrl,
      updatedAt: fulfillments.updatedAt,
      listingId: listings.id,
      listingTitle: listings.title,
      listingPackageDate: listings.expiryText,
      buyerName: users.name,
      buyerEmail: users.email,
    })
    .from(fulfillments)
    .innerJoin(settlements, eq(settlements.id, fulfillments.settlementId))
    .innerJoin(listings, eq(listings.id, fulfillments.listingId))
    .innerJoin(
      businessMemberships,
      eq(businessMemberships.businessId, settlements.businessId),
    )
    .leftJoin(users, eq(users.id, settlements.buyerUserId))
    .where(
      and(
        eq(businessMemberships.userId, userId),
        fulfillmentId ? eq(fulfillments.id, fulfillmentId) : undefined,
      ),
    )
    .orderBy(desc(fulfillments.updatedAt));
}

export async function getSellerFulfillments(
  userId: string,
): Promise<SellerFulfillmentItem[]> {
  const rows = await selectSellerFulfillmentRows(userId);
  const imageMap = await getPrimaryImageUrls(rows.map((row) => row.listingId));

  return rows.map((row) => ({
    id: row.id,
    settlementId: row.settlementId,
    mode: row.mode,
    status: row.status,
    statusLabel: getSellerFulfillmentStatusLabel(row.status, row.mode),
    statusTone: getFulfillmentTone(row.status),
    pickupCodeExpiresAt: row.pickupCodeExpiresAt,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    deliveryTrackingUrl: row.deliveryTrackingUrl,
    updatedAt: row.updatedAt,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
      packageDate: row.listingPackageDate,
      imageUrl: imageMap.get(row.listingId) ?? null,
    },
    buyer: {
      name: row.buyerName,
      email: row.buyerEmail,
    },
  }));
}

export async function getSellerFulfillmentById(
  userId: string,
  fulfillmentId: string,
): Promise<SellerFulfillmentItem | null> {
  const rows = await selectSellerFulfillmentRows(userId, fulfillmentId);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const imageMap = await getPrimaryImageUrls([row.listingId]);

  return {
    id: row.id,
    settlementId: row.settlementId,
    mode: row.mode,
    status: row.status,
    statusLabel: getSellerFulfillmentStatusLabel(row.status, row.mode),
    statusTone: getFulfillmentTone(row.status),
    pickupCodeExpiresAt: row.pickupCodeExpiresAt,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    deliveryTrackingUrl: row.deliveryTrackingUrl,
    updatedAt: row.updatedAt,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
      packageDate: row.listingPackageDate,
      imageUrl: imageMap.get(row.listingId) ?? null,
    },
    buyer: {
      name: row.buyerName,
      email: row.buyerEmail,
    },
  };
}
