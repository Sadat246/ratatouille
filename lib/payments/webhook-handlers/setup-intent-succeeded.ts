import "server-only";

import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db/client";
import { consumerProfiles } from "@/db/schema";

function coerceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id;
}

export async function handleSetupIntentSucceeded(
  setupIntent: Stripe.SetupIntent,
): Promise<void> {
  const customerId = coerceId(
    setupIntent.customer as string | { id: string } | null | undefined,
  );
  const paymentMethodId = coerceId(
    setupIntent.payment_method as string | { id: string } | null | undefined,
  );

  if (!customerId || !paymentMethodId) {
    console.error(
      "[stripe:setup_intent.succeeded] missing customer or payment_method",
      { setupIntentId: setupIntent.id, customerId, paymentMethodId },
    );
    return;
  }

  const now = new Date();

  await db
    .update(consumerProfiles)
    .set({
      stripeCustomerId: customerId,
      stripePaymentMethodId: paymentMethodId,
      hasMockCardOnFile: true,
      mockCardBrand: "Card on file",
      mockCardLast4: "****",
      mockCardAddedAt: now,
      updatedAt: now,
    })
    .where(eq(consumerProfiles.stripeCustomerId, customerId));
}
