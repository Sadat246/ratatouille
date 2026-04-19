import "server-only";

import { getOptionalEnv } from "@/lib/env";

export type StripeKeyMode = "test" | "live" | "unset";

/** Derive mode from secret key prefix (sk_test_ / sk_live_). */
export function getStripeSecretKeyMode(secretKey: string | undefined): StripeKeyMode {
  if (!secretKey?.trim()) return "unset";
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unset";
}

/** Derive mode from publishable key prefix (pk_test_ / pk_live_). */
export function getStripePublishableKeyMode(publishableKey: string | undefined): StripeKeyMode {
  if (!publishableKey?.trim()) return "unset";
  if (publishableKey.startsWith("pk_test_")) return "test";
  if (publishableKey.startsWith("pk_live_")) return "live";
  return "unset";
}

let warnedModeMismatch = false;

/**
 * Logs once per process if server secret and client publishable key disagree (test vs live).
 * Safe to call from getStripe(); avoids silent misconfiguration on Vercel.
 */
export function warnIfStripeKeyModesMismatch(): void {
  if (warnedModeMismatch) return;
  const secret = getStripeSecretKeyMode(getOptionalEnv("STRIPE_SECRET_KEY"));
  const pub = getStripePublishableKeyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  if (secret === "unset" || pub === "unset") return;
  if (secret !== pub) {
    warnedModeMismatch = true;
    console.warn(
      "[stripe] STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must both be test mode or both live mode. Check Vercel environment variables.",
    );
  }
}
