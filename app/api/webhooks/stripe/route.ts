import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getRequiredEnv } from "@/lib/env";
import {
  markEventProcessed,
  wasEventProcessed,
} from "@/lib/payments/idempotency";
import { stripe } from "@/lib/payments/stripe";
import { dispatchWebhookEvent } from "@/lib/payments/webhook-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "missing stripe-signature header" },
      { status: 400 },
    );
  }

  // MUST read the body as raw text — .json()/.formData()/.arrayBuffer()
  // all mutate the byte stream and break Stripe HMAC verification (Pitfall §2).
  const rawBody = await request.text();

  // Read the webhook secret inside the handler so the module can be loaded
  // (and type-checked, route-collected by `next build`) in environments
  // without STRIPE_WEBHOOK_SECRET configured. If the env var is missing at
  // request time we surface a clean 500; valid requests never see this.
  let webhookSecret: string;
  try {
    webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SECRET");
  } catch (err) {
    const message = err instanceof Error ? err.message : "env misconfigured";
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET unavailable", message);
    return NextResponse.json(
      { error: "webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    console.error("[stripe webhook] signature verify failed", message);
    return NextResponse.json(
      { error: "signature verify failed" },
      { status: 400 },
    );
  }

  if (await wasEventProcessed(event.id)) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    await dispatchWebhookEvent(event);
    await markEventProcessed(event.id, event.type);
  } catch (err) {
    // Do NOT mark the event processed — returning 500 lets Stripe retry per
    // its standard backoff, so handler failures never silently drop state.
    console.error(
      "[stripe webhook] handler error",
      event.id,
      event.type,
      err,
    );
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
