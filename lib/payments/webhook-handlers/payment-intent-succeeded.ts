import "server-only";

import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { getInteractiveDb } from "@/db/interactive";
import { fulfillments, settlements } from "@/db/schema";

type SettlementLockRow = {
  id: string;
  listingId: string;
  paymentStatus: string;
};

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

  await getInteractiveDb().transaction(async (tx) => {
    const settlementRow = await tx.execute(sql<SettlementLockRow>`
      select id, listing_id as "listingId", payment_status as "paymentStatus"
      from settlements
      where id = ${settlementId}
      for update
    `);
    const settlement = settlementRow.rows[0] as SettlementLockRow | undefined;
    if (!settlement) {
      console.error(
        "[stripe:payment_intent.succeeded] settlement not found",
        { settlementId, paymentIntentId: paymentIntent.id },
      );
      return;
    }
    if (settlement.paymentStatus === "captured") {
      // Idempotent no-op — late redelivery after the authoritative capture.
      return;
    }

    const now = new Date();
    await tx
      .update(settlements)
      .set({
        status: "ready_for_fulfillment",
        paymentStatus: "captured",
        processor: "stripe",
        processorIntentId: paymentIntent.id,
        capturedAt: now,
        updatedAt: now,
      })
      .where(eq(settlements.id, settlementId));

    await tx
      .insert(fulfillments)
      .values({
        settlementId,
        listingId: settlement.listingId,
        mode: "pickup",
        status: "pending_choice",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: fulfillments.settlementId });
  });
}
