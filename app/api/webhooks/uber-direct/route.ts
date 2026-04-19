import { NextResponse } from "next/server";

import { getRequiredEnv } from "@/lib/env";
import {
  markUberEventProcessed,
  wasUberEventProcessed,
} from "@/lib/fulfillment/idempotency";
import { applyUberDirectWebhookEvent } from "@/lib/fulfillment/service";
import {
  type UberDirectWebhookPayload,
  verifyUberWebhookSignature,
} from "@/lib/fulfillment/uber-direct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDedupEventId(payload: UberDirectWebhookPayload): string {
  return (
    payload.event_id?.trim() ||
    [
      payload.event_type ?? "dapi.status_changed",
      payload.meta?.external_order_id ?? payload.delivery_id ?? "unknown",
      payload.meta?.order_id ?? "unknown",
      payload.meta?.status ?? payload.status ?? "unknown",
    ].join(":")
  );
}

export async function POST(request: Request) {
  const signature =
    request.headers.get("x-uber-signature") ??
    request.headers.get("x-postmates-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "missing x-uber-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let signingKey: string;
  try {
    signingKey = getRequiredEnv("UBER_DIRECT_WEBHOOK_SIGNING_KEY");
  } catch (error) {
    const message = error instanceof Error ? error.message : "env misconfigured";
    console.error("[uber webhook] signing key unavailable", message);
    return NextResponse.json(
      { error: "webhook signing key not configured" },
      { status: 500 },
    );
  }

  if (!verifyUberWebhookSignature(rawBody, signature, signingKey)) {
    return NextResponse.json(
      { error: "signature verify failed" },
      { status: 400 },
    );
  }

  let payload: UberDirectWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as UberDirectWebhookPayload;
  } catch (error) {
    console.error("[uber webhook] invalid json payload", error);
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const eventId = getDedupEventId(payload);
  const eventType = payload.event_type ?? "dapi.status_changed";

  if (await wasUberEventProcessed(eventId)) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    await applyUberDirectWebhookEvent(payload);
    await markUberEventProcessed(eventId, eventType);
  } catch (error) {
    console.error("[uber webhook] handler error", eventId, eventType, error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
