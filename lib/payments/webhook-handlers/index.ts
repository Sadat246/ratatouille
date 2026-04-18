import "server-only";

import type Stripe from "stripe";

import { handlePaymentIntentCanceled } from "./payment-intent-canceled";
import { handlePaymentIntentFailed } from "./payment-intent-payment-failed";
import { handlePaymentIntentSucceeded } from "./payment-intent-succeeded";
import { handleSetupIntentSucceeded } from "./setup-intent-succeeded";

export async function dispatchWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "setup_intent.succeeded":
      await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
      return;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent,
      );
      return;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent,
      );
      return;
    case "payment_intent.canceled":
      await handlePaymentIntentCanceled(
        event.data.object as Stripe.PaymentIntent,
      );
      return;
    default:
      // Ignore unlisted event types per CONTEXT D-12; returning 200 stops Stripe retries.
      return;
  }
}
