import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError } from "@/lib/auctions/http";
import { createSetupIntentForConsumer } from "@/lib/payments/setup-intents";

export const runtime = "nodejs";

export async function POST() {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const { clientSecret } = await createSetupIntentForConsumer({
      userId: authorization.session.user.id,
      email: authorization.session.user.email ?? "",
    });

    return NextResponse.json({
      ok: true,
      clientSecret,
    });
  } catch (err) {
    console.error("[setup-intent] create failed", err);
    return jsonAuctionError(
      "SETUP_INTENT_FAILED",
      "Could not start card setup. Please try again.",
      502,
    );
  }
}
