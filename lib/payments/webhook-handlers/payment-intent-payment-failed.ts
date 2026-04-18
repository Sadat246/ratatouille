import "server-only";

import type Stripe from "stripe";

import { db } from "@/db/client";
import { runFallbackBidderLoop } from "@/lib/payments/fallback";

export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const settlementId = paymentIntent.metadata?.settlementId;
  if (!settlementId) {
    console.error(
      "[stripe:payment_intent.payment_failed] missing settlementId metadata",
      { paymentIntentId: paymentIntent.id },
    );
    return;
  }

  const settlement = await db.query.settlements.findFirst({
    columns: { id: true, paymentStatus: true, status: true },
    where: (table, operators) => operators.eq(table.id, settlementId),
  });

  if (!settlement) return;
  if (
    settlement.paymentStatus === "captured" ||
    settlement.paymentStatus === "failed" ||
    settlement.status === "completed" ||
    settlement.status === "failed" ||
    settlement.status === "voided"
  ) {
    // Already resolved; late Stripe retry must not re-enter the fallback loop
    // after it exhausted (or a concurrent path already captured the settlement).
    return;
  }

  await runFallbackBidderLoop(settlementId);
}
