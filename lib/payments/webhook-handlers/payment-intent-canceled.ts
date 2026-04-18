import "server-only";

import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/db/client";
import { settlements } from "@/db/schema";

export async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const settlementId = paymentIntent.metadata?.settlementId;
  if (!settlementId) return;

  await db
    .update(settlements)
    .set({
      status: "voided",
      paymentStatus: "failed",
      processor: "stripe",
      processorIntentId: paymentIntent.id,
      updatedAt: new Date(),
    })
    .where(eq(settlements.id, settlementId));
}
