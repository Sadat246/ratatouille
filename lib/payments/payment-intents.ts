import "server-only";

import Stripe from "stripe";

import { stripe } from "./stripe";

export type ChargeOutcome =
  | { kind: "captured"; paymentIntentId: string }
  | {
      kind: "failed";
      paymentIntentId: string | null;
      code: string;
      decline: string | null;
    }
  | {
      kind: "requires_action";
      paymentIntentId: string;
      clientSecret: string | null;
    };

export async function chargeBidderOffSession(params: {
  settlementId: string;
  attemptNumber: number;
  amountCents: number;
  currency: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  bidderUserId: string;
  auctionId: string;
}): Promise<ChargeOutcome> {
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency,
        customer: params.stripeCustomerId,
        payment_method: params.stripePaymentMethodId,
        confirm: true,
        off_session: true,
        error_on_requires_action: true,
        payment_method_types: ["card"],
        metadata: {
          settlementId: params.settlementId,
          attemptNumber: String(params.attemptNumber),
          auctionId: params.auctionId,
          bidderUserId: params.bidderUserId,
          kind: "auction_winner",
        },
      },
      {
        idempotencyKey: `pi:${params.settlementId}:attempt:${params.attemptNumber}`,
      },
    );

    if (pi.status === "succeeded") {
      return { kind: "captured", paymentIntentId: pi.id };
    }
    if (pi.status === "requires_action") {
      return {
        kind: "requires_action",
        paymentIntentId: pi.id,
        clientSecret: pi.client_secret,
      };
    }
    return {
      kind: "failed",
      paymentIntentId: pi.id,
      code: pi.last_payment_error?.code ?? "unknown",
      decline: pi.last_payment_error?.decline_code ?? null,
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      return {
        kind: "failed",
        paymentIntentId: err.payment_intent?.id ?? null,
        code: err.code ?? "card_error",
        decline: err.decline_code ?? null,
      };
    }
    throw err;
  }
}

export async function chargeBuyout(params: {
  settlementId: string;
  amountCents: number;
  currency: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  bidderUserId: string;
  auctionId: string;
}): Promise<ChargeOutcome> {
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency,
        customer: params.stripeCustomerId,
        payment_method: params.stripePaymentMethodId,
        confirm: true,
        payment_method_types: ["card"],
        metadata: {
          settlementId: params.settlementId,
          auctionId: params.auctionId,
          bidderUserId: params.bidderUserId,
          kind: "buyout",
        },
      },
      {
        idempotencyKey: `pi:buyout:${params.settlementId}`,
      },
    );

    if (pi.status === "succeeded") {
      return { kind: "captured", paymentIntentId: pi.id };
    }
    if (pi.status === "requires_action") {
      return {
        kind: "requires_action",
        paymentIntentId: pi.id,
        clientSecret: pi.client_secret,
      };
    }
    return {
      kind: "failed",
      paymentIntentId: pi.id,
      code: pi.last_payment_error?.code ?? "unknown",
      decline: pi.last_payment_error?.decline_code ?? null,
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      return {
        kind: "failed",
        paymentIntentId: err.payment_intent?.id ?? null,
        code: err.code ?? "card_error",
        decline: err.decline_code ?? null,
      };
    }
    throw err;
  }
}
