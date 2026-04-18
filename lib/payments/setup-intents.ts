import "server-only";

import { stripe } from "./stripe";
import { getOrCreateStripeCustomer } from "./customers";

export async function createSetupIntentForConsumer(params: {
  userId: string;
  email: string;
}): Promise<{
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
}> {
  const customerId = await getOrCreateStripeCustomer(params);

  const setupIntent = await stripe.setupIntents.create(
    {
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      usage: "off_session",
      metadata: { userId: params.userId },
    },
    {
      idempotencyKey: `setup_intent:${params.userId}:${Date.now()}`,
    },
  );

  if (!setupIntent.client_secret) {
    throw new Error(
      `createSetupIntentForConsumer: Stripe returned no client_secret for SI ${setupIntent.id}`,
    );
  }

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    customerId,
  };
}
