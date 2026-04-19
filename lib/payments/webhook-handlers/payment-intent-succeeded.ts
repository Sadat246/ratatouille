import "server-only";

import type Stripe from "stripe";

import { finalizeSettlementCapture } from "@/lib/payments/settlement-capture";

export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const settlementId = paymentIntent.metadata?.settlementId;
  if (!settlementId) {
    console.error(
      "[stripe:payment_intent.succeeded] missing settlementId metadata",
      { paymentIntentId: paymentIntent.id },
    );
    return;
  }

  const result = await finalizeSettlementCapture({
    settlementId,
    paymentIntentId: paymentIntent.id,
    processor: "stripe",
  });

  if (!result.ok) {
    console.error(
      "[stripe:payment_intent.succeeded] finalize failed",
      { settlementId, paymentIntentId: paymentIntent.id },
    );
  }
}
