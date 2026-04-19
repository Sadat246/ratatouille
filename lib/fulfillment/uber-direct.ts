import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { computeHaversine } from "@/lib/auctions/geo";
import { getOptionalEnv, hasEnv } from "@/lib/env";

const UBER_DIRECT_TOKEN_URL = "https://auth.uber.com/oauth/v2/token";
const UBER_DIRECT_API_BASE_URL = "https://api.uber.com";

type UberTokenResponse = {
  access_token: string;
  expires_in?: number;
};

type UberQuoteResponse = {
  id?: string;
  fee?: number;
  currency?: string;
  pickup_eta?: string;
  dropoff_eta?: string;
  expires?: string;
  duration?: number;
};

type UberCreateDeliveryResponse = {
  id?: string;
  quote_id?: string;
  status?: string;
  tracking_url?: string;
  fee?: number;
  currency?: string;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;

export type UberDirectAddress = {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

export type UberDirectQuoteRequest = {
  fulfillmentId: string;
  pickup: UberDirectAddress;
  dropoff: UberDirectAddress;
};

export type UberDirectDeliveryRequest = {
  fulfillmentId: string;
  quoteId: string;
  listingTitle: string;
  pickupName: string;
  pickupPhoneNumber: string;
  pickup: UberDirectAddress;
  dropoffName: string;
  dropoffPhoneNumber: string;
  dropoff: UberDirectAddress;
};

export type UberDirectQuoteResult = {
  quoteId: string;
  feeCents: number;
  currency: string;
  etaMinutes: number | null;
  isStub: boolean;
};

export type UberDirectDeliveryResult = {
  referenceId: string;
  quoteId: string;
  trackingUrl: string | null;
  rawStatus: string | null;
  isStub: boolean;
};

export type UberDirectWebhookPayload = {
  event_id?: string;
  event_type?: string;
  status?: string;
  delivery_id?: string;
  meta?: {
    status?: string;
    order_id?: string;
    external_order_id?: string;
  };
};

function getUberDirectConfig() {
  const clientId = getOptionalEnv("UBER_DIRECT_CLIENT_ID");
  const clientSecret = getOptionalEnv("UBER_DIRECT_CLIENT_SECRET");
  const customerId = getOptionalEnv("UBER_DIRECT_CUSTOMER_ID");

  return {
    clientId,
    clientSecret,
    customerId,
    configured: hasEnv(
      "UBER_DIRECT_CLIENT_ID",
      "UBER_DIRECT_CLIENT_SECRET",
      "UBER_DIRECT_CUSTOMER_ID",
    ),
  };
}

export function isUberDirectConfigured(): boolean {
  return getUberDirectConfig().configured;
}

function serializeAddress(address: UberDirectAddress): string {
  return JSON.stringify({
    street_address: [address.addressLine1, address.addressLine2 ?? ""],
    state: address.state,
    city: address.city,
    zip_code: address.postalCode,
    country: address.countryCode,
  });
}

function toUberPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/^\+/, "");
}

function computeEtaMinutes(payload: UberQuoteResponse): number | null {
  if (payload.dropoff_eta) {
    const etaMs = new Date(payload.dropoff_eta).getTime() - Date.now();
    if (!Number.isNaN(etaMs)) {
      return Math.max(1, Math.ceil(etaMs / 60_000));
    }
  }

  if (typeof payload.duration === "number" && Number.isFinite(payload.duration)) {
    return Math.max(1, Math.ceil(payload.duration / 60));
  }

  return null;
}

function buildStubQuote(
  request: UberDirectQuoteRequest,
): UberDirectQuoteResult {
  const distanceMiles = computeHaversine(
    request.pickup.latitude,
    request.pickup.longitude,
    request.dropoff.latitude,
    request.dropoff.longitude,
  );
  const feeCents = Math.max(499, Math.round(distanceMiles * 125) + 299);
  const etaMinutes = Math.max(18, Math.round(distanceMiles * 7) + 12);

  return {
    quoteId: `stub-quote-${request.fulfillmentId}`,
    feeCents,
    currency: "usd",
    etaMinutes,
    isStub: true,
  };
}

function buildStubDelivery(
  request: UberDirectDeliveryRequest,
): UberDirectDeliveryResult {
  return {
    referenceId: `stub-delivery-${request.fulfillmentId}`,
    quoteId: request.quoteId,
    trackingUrl: `https://www.ubereats.com/orders/demo-${request.fulfillmentId}`,
    rawStatus: "pending",
    isStub: true,
  };
}

async function getUberAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getUberDirectConfig();

  if (!clientId || !clientSecret) {
    throw new Error("Uber Direct credentials are not configured.");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "eats.deliveries",
  });

  const response = await fetch(UBER_DIRECT_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Uber Direct token request failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as UberTokenResponse;
  if (!payload.access_token) {
    throw new Error("Uber Direct token response was missing access_token.");
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };

  return payload.access_token;
}

async function runUberDirectRequest<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = await getUberAccessToken();
  const response = await fetch(`${UBER_DIRECT_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Uber Direct request failed with status ${response.status}: ${message}`,
    );
  }

  return (await response.json()) as T;
}

export async function createUberDirectQuote(
  request: UberDirectQuoteRequest,
): Promise<UberDirectQuoteResult> {
  const { customerId, configured } = getUberDirectConfig();

  if (!configured || !customerId) {
    return buildStubQuote(request);
  }

  const payload = await runUberDirectRequest<UberQuoteResponse>(
    `/v1/customers/${customerId}/delivery_quotes`,
    {
      pickup_address: serializeAddress(request.pickup),
      pickup_latitude: request.pickup.latitude,
      pickup_longitude: request.pickup.longitude,
      dropoff_address: serializeAddress(request.dropoff),
      dropoff_latitude: request.dropoff.latitude,
      dropoff_longitude: request.dropoff.longitude,
    },
  );

  return {
    quoteId: payload.id ?? `uber-quote-${request.fulfillmentId}`,
    feeCents: payload.fee ?? 0,
    currency: payload.currency ?? "usd",
    etaMinutes: computeEtaMinutes(payload),
    isStub: false,
  };
}

export async function createUberDirectDelivery(
  request: UberDirectDeliveryRequest,
): Promise<UberDirectDeliveryResult> {
  const { customerId, configured } = getUberDirectConfig();

  if (!configured || !customerId) {
    return buildStubDelivery(request);
  }

  const payload = await runUberDirectRequest<UberCreateDeliveryResponse>(
    `/v1/customers/${customerId}/deliveries`,
    {
      quote_id: request.quoteId,
      pickup_address: serializeAddress(request.pickup),
      pickup_name: request.pickupName,
      pickup_phone_number: toUberPhoneNumber(request.pickupPhoneNumber),
      pickup_latitude: request.pickup.latitude,
      pickup_longitude: request.pickup.longitude,
      dropoff_address: serializeAddress(request.dropoff),
      dropoff_name: request.dropoffName,
      dropoff_phone_number: toUberPhoneNumber(request.dropoffPhoneNumber),
      dropoff_latitude: request.dropoff.latitude,
      dropoff_longitude: request.dropoff.longitude,
      external_id: request.fulfillmentId,
      manifest_items: [
        {
          name: request.listingTitle,
          quantity: 1,
          weight: 1,
          dimensions: {
            length: 10,
            height: 10,
            depth: 10,
          },
        },
      ],
    },
  );

  return {
    referenceId: payload.id ?? `uber-delivery-${request.fulfillmentId}`,
    quoteId: payload.quote_id ?? request.quoteId,
    trackingUrl: payload.tracking_url ?? null,
    rawStatus: payload.status ?? null,
    isStub: false,
  };
}

export function verifyUberWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  signingKey: string,
): boolean {
  const expectedDigest = createHmac("sha256", signingKey)
    .update(rawBody, "utf8")
    .digest("hex");

  const candidates = new Set(
    signatureHeader
      .split(",")
      .map((part) => part.trim())
      .flatMap((part) => {
        const value = part.includes("=") ? part.split("=").pop() ?? "" : part;
        return [part, value];
      })
      .filter(Boolean),
  );

  for (const candidate of candidates) {
    const normalized = candidate.replace(/^sha256=/i, "");
    if (normalized.length !== expectedDigest.length) {
      continue;
    }
    if (
      timingSafeEqual(
        Buffer.from(normalized, "utf8"),
        Buffer.from(expectedDigest, "utf8"),
      )
    ) {
      return true;
    }
  }

  return false;
}
