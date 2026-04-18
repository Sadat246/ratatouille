import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getInteractiveDb } from "@/db/interactive";
import { listings, settlements } from "@/db/schema";
import { getSettlementAmounts } from "@/lib/auctions/pricing";

import { chargeBidderOffSession } from "./payment-intents";

export type FallbackResult =
  | {
      kind: "captured";
      settlementId: string;
      bidderUserId: string;
      paymentIntentId: string;
      amountCents: number;
    }
  | { kind: "exhausted"; settlementId: string };

type CandidateBid = {
  bidId: string;
  bidderUserId: string;
  amountCents: number;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
};

type SettlementRow = {
  id: string;
  auctionId: string;
  listingId: string;
  currency: string;
  paymentStatus: string;
  status: string;
};

export async function runFallbackBidderLoop(
  settlementId: string,
): Promise<FallbackResult> {
  // Step 1: Load settlement + full candidate list in a short tx with row lock.
  // Locking with FOR UPDATE serializes concurrent invocations (direct call from
  // Plan 06-05 AND webhook-triggered call from Plan 06-03): the loser reads a
  // settlement that the winner already flipped to captured/failed and no-ops.
  // Stripe calls are NOT issued inside this tx (Pitfall §1).
  const initial = await getInteractiveDb().transaction(async (tx) => {
    const settlementRow = await tx.execute(sql<SettlementRow>`
      select id, auction_id as "auctionId", listing_id as "listingId",
             currency, payment_status as "paymentStatus", status
      from settlements
      where id = ${settlementId}
      for update
    `);

    const settlement = settlementRow.rows[0] as SettlementRow | undefined;
    if (!settlement) {
      return { terminal: true as const, reason: "not_found" as const };
    }
    if (
      settlement.paymentStatus === "captured" ||
      settlement.paymentStatus === "failed" ||
      settlement.status === "failed" ||
      settlement.status === "completed"
    ) {
      return { terminal: true as const, reason: "already_resolved" as const };
    }

    const candidateRows = await tx.execute(sql<CandidateBid>`
      select
        b.id as "bidId",
        b.consumer_user_id as "bidderUserId",
        b.amount_cents as "amountCents",
        cp.stripe_customer_id as "stripeCustomerId",
        cp.stripe_payment_method_id as "stripePaymentMethodId"
      from bids b
      left join consumer_profiles cp on cp.user_id = b.consumer_user_id
      where b.auction_id = ${settlement.auctionId}
        and b.status <> 'withdrawn'
        and b.status <> 'voided'
      order by b.amount_cents desc, b.placed_at asc
    `);

    return {
      terminal: false as const,
      settlement,
      candidates: candidateRows.rows as unknown as CandidateBid[],
    };
  });

  if (initial.terminal) {
    return { kind: "exhausted", settlementId };
  }

  const { settlement, candidates } = initial;

  // Step 2: Iterate candidates, charging each in turn OUTSIDE the DB tx.
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const attemptNumber = i + 1;

    if (!candidate.stripeCustomerId || !candidate.stripePaymentMethodId) {
      // First-bid gate should prevent this; skip defensively for legacy bids.
      continue;
    }

    const amounts = getSettlementAmounts(candidate.amountCents);

    const outcome = await chargeBidderOffSession({
      settlementId,
      attemptNumber,
      amountCents: amounts.grossAmountCents,
      currency: settlement.currency,
      stripeCustomerId: candidate.stripeCustomerId,
      stripePaymentMethodId: candidate.stripePaymentMethodId,
      bidderUserId: candidate.bidderUserId,
      auctionId: settlement.auctionId,
    });

    if (outcome.kind === "captured") {
      // Mark 'capture_requested' only — webhook payment_intent.succeeded is the
      // authoritative 'captured' transition and spawns the fulfillment row
      // (single-sourced state machine).
      await db
        .update(settlements)
        .set({
          buyerUserId: candidate.bidderUserId,
          winningBidId: candidate.bidId,
          grossAmountCents: amounts.grossAmountCents,
          platformFeeCents: amounts.platformFeeCents,
          sellerNetAmountCents: amounts.sellerNetAmountCents,
          processor: "stripe",
          processorIntentId: outcome.paymentIntentId,
          paymentStatus: "capture_requested",
          updatedAt: new Date(),
        })
        .where(eq(settlements.id, settlementId));

      return {
        kind: "captured",
        settlementId,
        bidderUserId: candidate.bidderUserId,
        paymentIntentId: outcome.paymentIntentId,
        amountCents: amounts.grossAmountCents,
      };
    }

    // outcome.kind === "failed" or "requires_action" — continue to next candidate.
    // With error_on_requires_action: true on the PI, requires_action should be
    // unreachable; treat it as a failure defensively.
  }

  // Step 3: Exhausted — mark settlement failed and listing expired.
  await getInteractiveDb().transaction(async (tx) => {
    await tx
      .update(settlements)
      .set({
        status: "failed",
        paymentStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, settlementId));

    await tx
      .update(listings)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(listings.id, settlement.listingId));
  });

  return { kind: "exhausted", settlementId };
}
