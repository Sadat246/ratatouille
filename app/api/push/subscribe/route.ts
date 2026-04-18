import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAnyOnboardedApiUser } from "@/lib/auth/api";
import { jsonAuctionError } from "@/lib/auctions/http";
import {
  getPushSubscriptionCountForUser,
  parsePushSubscription,
  upsertPushSubscription,
  deletePushSubscriptionByEndpoint,
} from "@/lib/push/subscriptions";
import { getPushPublicKey, isPushConfigured } from "@/lib/push/vapid";

export const runtime = "nodejs";

const deleteSchema = z.object({
  endpoint: z.string().url(),
});

export async function GET() {
  const authorization = await authorizeAnyOnboardedApiUser();

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  const configured = isPushConfigured();
  const subscriptionCount = configured
    ? await getPushSubscriptionCountForUser(authorization.session.user.id)
    : 0;

  return NextResponse.json({
    ok: true,
    available: configured,
    publicKey: configured ? getPushPublicKey() : null,
    subscribed: subscriptionCount > 0,
  });
}

export async function POST(request: Request) {
  const authorization = await authorizeAnyOnboardedApiUser();

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  if (!isPushConfigured()) {
    return jsonAuctionError(
      "PUSH_NOT_CONFIGURED",
      "Push notifications are not configured on this deployment.",
      503,
    );
  }

  try {
    const subscription = parsePushSubscription(await request.json());

    await upsertPushSubscription({
      userId: authorization.session.user.id,
      subscription,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      subscribed: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError(
        "INVALID_PUSH_SUBSCRIPTION",
        error.issues[0]?.message ?? "Provide a valid push subscription.",
        400,
      );
    }

    console.error("push subscribe failed", error);
    return jsonAuctionError(
      "PUSH_SUBSCRIBE_FAILED",
      "The push subscription could not be saved.",
      500,
    );
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAnyOnboardedApiUser();

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const body = deleteSchema.parse(await request.json().catch(() => null));

    await deletePushSubscriptionByEndpoint(body.endpoint, authorization.session.user.id);

    return NextResponse.json({
      ok: true,
      subscribed: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError(
        "INVALID_PUSH_UNSUBSCRIBE",
        error.issues[0]?.message ?? "Provide a valid push endpoint.",
        400,
      );
    }

    console.error("push unsubscribe failed", error);
    return jsonAuctionError(
      "PUSH_UNSUBSCRIBE_FAILED",
      "The push subscription could not be removed.",
      500,
    );
  }
}
