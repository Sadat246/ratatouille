import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { settlements } from "@/db/schema";
import { getOptionalEnv } from "@/lib/env";

import type { AuctionMutationResult } from "@/lib/auctions/service";

function isPayableCloseResult(
  result: AuctionMutationResult,
): result is AuctionMutationResult & {
  winningBidId: string;
  winningBidUserId: string;
} {
  if (result.action !== "auction_closed" && result.action !== "auction_bought_out") {
    return false;
  }
  if (!result.winningBidId || !result.winningBidUserId) {
    return false;
  }
  return true;
}

export async function triggerAuctionPaymentIfCloseResult(
  result: AuctionMutationResult,
): Promise<void> {
  if (!isPayableCloseResult(result)) {
    return;
  }

  if (!getOptionalEnv("STRIPE_SECRET_KEY")) {
    console.info(
      "[auction-trigger] STRIPE_SECRET_KEY unset; skipping charge",
      { auctionId: result.auctionId, action: result.action },
    );
    return;
  }

  const settlement = await db.query.settlements.findFirst({
    columns: {
      id: true,
      auctionId: true,
      grossAmountCents: true,
      currency: true,
      buyerUserId: true,
      paymentStatus: true,
    },
    where: (table, operators) => operators.eq(table.auctionId, result.auctionId),
  });

  if (!settlement) {
    console.error(
      "[auction-trigger] no settlement for closed auction",
      { auctionId: result.auctionId, action: result.action },
    );
    return;
  }

  if (
    settlement.paymentStatus === "captured" ||
    settlement.paymentStatus === "capture_requested" ||
    settlement.paymentStatus === "failed"
  ) {
    return;
  }

  if (!settlement.buyerUserId) {
    console.error(
      "[auction-trigger] settlement missing buyerUserId",
      { settlementId: settlement.id },
    );
    return;
  }

  if (settlement.grossAmountCents === null) {
    console.error(
      "[auction-trigger] settlement missing grossAmountCents; cannot charge",
      { settlementId: settlement.id },
    );
    return;
  }

  const profile = await db.query.consumerProfiles.findFirst({
    columns: {
      userId: true,
      stripeCustomerId: true,
      stripePaymentMethodId: true,
    },
    where: (table, operators) => operators.eq(table.userId, settlement.buyerUserId!),
  });

  if (!profile?.stripeCustomerId || !profile.stripePaymentMethodId) {
    console.warn(
      "[auction-trigger] buyer has no Stripe card on file; falling back",
      { settlementId: settlement.id, buyerUserId: settlement.buyerUserId },
    );
    if (result.action === "auction_bought_out") {
      await db
        .update(settlements)
        .set({
          paymentStatus: "failed",
          status: "voided",
          updatedAt: new Date(),
        })
        .where(eq(settlements.id, settlement.id));
      return;
    }
    const { runFallbackBidderLoop } = await import("./fallback");
    await runFallbackBidderLoop(settlement.id);
    return;
  }

  const { chargeBidderOffSession, chargeBuyout } = await import("./payment-intents");

  const outcome =
    result.action === "auction_bought_out"
      ? await chargeBuyout({
          settlementId: settlement.id,
          amountCents: settlement.grossAmountCents,
          currency: settlement.currency,
          stripeCustomerId: profile.stripeCustomerId,
          stripePaymentMethodId: profile.stripePaymentMethodId,
          bidderUserId: settlement.buyerUserId,
          auctionId: settlement.auctionId,
        })
      : await chargeBidderOffSession({
          settlementId: settlement.id,
          attemptNumber: 1,
          amountCents: settlement.grossAmountCents,
          currency: settlement.currency,
          stripeCustomerId: profile.stripeCustomerId,
          stripePaymentMethodId: profile.stripePaymentMethodId,
          bidderUserId: settlement.buyerUserId,
          auctionId: settlement.auctionId,
        });

  if (outcome.kind === "captured") {
    await db
      .update(settlements)
      .set({
        processor: "stripe",
        processorIntentId: outcome.paymentIntentId,
        paymentStatus: "capture_requested",
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, settlement.id));
    return;
  }

  if (outcome.kind === "requires_action") {
    console.error(
      "[auction-trigger] PI landed in requires_action despite error_on_requires_action — treating as failure",
      { settlementId: settlement.id, paymentIntentId: outcome.paymentIntentId },
    );
  } else {
    console.warn(
      "[auction-trigger] charge failed; running fallback bidder loop",
      {
        settlementId: settlement.id,
        paymentIntentId: outcome.paymentIntentId,
        code: outcome.code,
        decline: outcome.decline,
      },
    );
  }

  if (result.action === "auction_bought_out") {
    await db
      .update(settlements)
      .set({
        paymentStatus: "failed",
        status: "voided",
        processor: "stripe",
        processorIntentId:
          outcome.kind === "requires_action" || outcome.kind === "failed"
            ? outcome.paymentIntentId
            : null,
        updatedAt: new Date(),
      })
      .where(eq(settlements.id, settlement.id));
    return;
  }

  const { runFallbackBidderLoop } = await import("./fallback");
  await runFallbackBidderLoop(settlement.id);
}
