import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError } from "@/lib/auctions/http";
import { confirmSetupIntentForConsumer } from "@/lib/payments/setup-intents";

export const runtime = "nodejs";

const confirmSchema = z.object({
  setupIntentId: z.string().trim().min(1).max(120),
});

/**
 * Called by `StripeCardSetup` immediately after `stripe.confirmSetup` resolves
 * on the client. Without this, the consumer profile only flips to "card on
 * file" when the `setup_intent.succeeded` webhook lands — which during local
 * dev (with `stripe listen`) can take several seconds and races the next
 * page render. This endpoint is idempotent with the webhook handler.
 */
export async function POST(request: Request) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  const payload = confirmSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!payload.success) {
    return jsonAuctionError(
      "INVALID_CONFIRM_REQUEST",
      payload.error.issues[0]?.message ?? "Provide a valid setupIntentId.",
      400,
    );
  }

  try {
    const result = await confirmSetupIntentForConsumer({
      userId: authorization.session.user.id,
      setupIntentId: payload.data.setupIntentId,
    });

    if (!result.ok) {
      return jsonAuctionError(
        "SETUP_INTENT_CONFIRM_FAILED",
        result.reason === "user_mismatch"
          ? "This card belongs to a different account."
          : `Card setup is not ready yet (${result.reason}). Try again in a moment.`,
        result.reason === "user_mismatch" ? 403 : 409,
      );
    }

    return NextResponse.json({
      ok: true,
      mockCard: {
        enabled: true,
        brand: result.brand,
        last4: result.last4,
      },
    });
  } catch (err) {
    console.error("[setup-intent/confirm] failed", err);
    return jsonAuctionError(
      "SETUP_INTENT_CONFIRM_FAILED",
      "Could not confirm card setup. Please try again.",
      502,
    );
  }
}
