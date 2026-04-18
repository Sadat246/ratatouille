import "server-only";

import Stripe from "stripe";

import { getOptionalEnv } from "@/lib/env";

// Lazy singleton: defer construction until first property access so module
// import does not throw when STRIPE_SECRET_KEY is unset (e.g. during
// `npx tsc --noEmit` or in environments without a .env.local). Mirrors the
// lazy pattern used by lib/push/vapid.ts for VAPID secrets.
let cachedStripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (cachedStripe) {
    return cachedStripe;
  }

  const secretKey = getOptionalEnv("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it in .env.local before invoking Stripe APIs.",
    );
  }

  cachedStripe = new Stripe(secretKey, {
    maxNetworkRetries: 2,
    appInfo: { name: "ratatouille", version: "0.1.0" },
  });

  return cachedStripe;
}

// Proxy so downstream modules can reference the `stripe` const directly and
// still get lazy initialization. The first property access triggers
// `getStripe()`; thereafter all calls route to the cached SDK instance.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
