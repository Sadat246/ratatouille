import "server-only";

import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db/client";
import { consumerProfiles } from "@/db/schema";

import { stripe } from "./stripe";
import { getOrCreateStripeCustomer } from "./customers";

export async function createSetupIntentForConsumer(params: {
  userId: string;
  email: string;
}): Promise<{
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
}> {
  const customerId = await getOrCreateStripeCustomer(params);

  const setupIntent = await stripe.setupIntents.create(
    {
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      usage: "off_session",
      metadata: { userId: params.userId },
    },
    {
      idempotencyKey: `setup_intent:${params.userId}:${Date.now()}`,
    },
  );

  if (!setupIntent.client_secret) {
    throw new Error(
      `createSetupIntentForConsumer: Stripe returned no client_secret for SI ${setupIntent.id}`,
    );
  }

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    customerId,
  };
}

function coerceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id;
}

function formatCardBrand(brand: string | null | undefined): string {
  if (!brand) return "Card";
  // Stripe returns "visa", "mastercard", "amex", etc. Capitalize for UI.
  return brand
    .split(/\s|_/g)
    .map((piece) => (piece ? piece[0].toUpperCase() + piece.slice(1) : piece))
    .join(" ");
}

/**
 * Persist a confirmed Stripe SetupIntent + its PaymentMethod onto the
 * consumer profile so the bid panel reflects "card on file" immediately.
 *
 * Used by:
 *   - the client `/confirm` endpoint (called right after Stripe.confirmSetup
 *     resolves, so we don't depend on webhook timing for the demo flow)
 *   - the `setup_intent.succeeded` webhook (authoritative path)
 *
 * Idempotent: re-applying the same SetupIntent / PaymentMethod just rewrites
 * the same fields. Safe to call concurrently with the webhook.
 */
export async function persistConfirmedSetupIntent(params: {
  setupIntent: Stripe.SetupIntent;
  /**
   * If provided, scope the consumer-profile update to this user. Used by the
   * authenticated confirm endpoint so a hostile client can't claim a card
   * attached to a different account by guessing a setup-intent id.
   */
  expectedUserId?: string;
}): Promise<{
  ok: true;
  brand: string;
  last4: string;
  paymentMethodId: string;
  customerId: string;
} | { ok: false; reason: "missing_customer" | "missing_payment_method" | "user_mismatch" | "profile_not_found" }> {
  const customerId = coerceId(
    params.setupIntent.customer as string | { id: string } | null | undefined,
  );
  const paymentMethodId = coerceId(
    params.setupIntent.payment_method as string | { id: string } | null | undefined,
  );

  if (!customerId) {
    return { ok: false, reason: "missing_customer" };
  }
  if (!paymentMethodId) {
    return { ok: false, reason: "missing_payment_method" };
  }

  const metadataUserId = params.setupIntent.metadata?.userId ?? null;
  if (params.expectedUserId && metadataUserId && metadataUserId !== params.expectedUserId) {
    return { ok: false, reason: "user_mismatch" };
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = paymentMethod.card ?? null;
  const brand = formatCardBrand(card?.brand);
  const last4 = card?.last4 ?? "****";

  const now = new Date();
  const updateValues = {
    stripeCustomerId: customerId,
    stripePaymentMethodId: paymentMethodId,
    hasMockCardOnFile: true,
    mockCardBrand: brand,
    mockCardLast4: last4,
    mockCardAddedAt: now,
    updatedAt: now,
  } as const;

  // Prefer the explicit user scope if we have it; otherwise update by Stripe
  // customer id (webhook path, where we trust Stripe to have routed the event).
  let updated = 0;
  if (params.expectedUserId) {
    const result = await db
      .update(consumerProfiles)
      .set(updateValues)
      .where(eq(consumerProfiles.userId, params.expectedUserId))
      .returning({ userId: consumerProfiles.userId });
    updated = result.length;
  } else {
    const result = await db
      .update(consumerProfiles)
      .set(updateValues)
      .where(eq(consumerProfiles.stripeCustomerId, customerId))
      .returning({ userId: consumerProfiles.userId });
    updated = result.length;
  }

  if (updated === 0) {
    return { ok: false, reason: "profile_not_found" };
  }

  return {
    ok: true,
    brand,
    last4,
    paymentMethodId,
    customerId,
  };
}

export async function confirmSetupIntentForConsumer(params: {
  userId: string;
  setupIntentId: string;
}) {
  const setupIntent = await stripe.setupIntents.retrieve(params.setupIntentId);

  if (setupIntent.status !== "succeeded") {
    return { ok: false as const, reason: "not_succeeded" as const, status: setupIntent.status };
  }

  const result = await persistConfirmedSetupIntent({
    setupIntent,
    expectedUserId: params.userId,
  });

  return result;
}
