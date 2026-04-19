import "server-only";

import type Stripe from "stripe";

import { persistConfirmedSetupIntent } from "@/lib/payments/setup-intents";

export async function handleSetupIntentSucceeded(
  setupIntent: Stripe.SetupIntent,
): Promise<void> {
  const result = await persistConfirmedSetupIntent({ setupIntent });

  if (!result.ok) {
    console.error(
      "[stripe:setup_intent.succeeded] could not persist payment method",
      { setupIntentId: setupIntent.id, reason: result.reason },
    );
  }
}
