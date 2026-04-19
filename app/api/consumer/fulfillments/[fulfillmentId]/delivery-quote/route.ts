import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonFulfillmentError, toFulfillmentErrorResponse } from "@/lib/fulfillment/http";
import { quoteDeliveryForConsumer } from "@/lib/fulfillment/service";
import { fulfillmentDeliveryInputSchema } from "@/lib/validation/fulfillment";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ fulfillmentId: string }> },
) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const parsed = fulfillmentDeliveryInputSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonFulfillmentError(
        "DELIVERY_INPUT_INVALID",
        parsed.error.issues[0]?.message ?? "Check the delivery details and try again.",
        400,
      );
    }

    const { fulfillmentId } = await context.params;
    const quote = await quoteDeliveryForConsumer(
      fulfillmentId,
      authorization.session.user.id,
      parsed.data,
    );

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (error) {
    return toFulfillmentErrorResponse(error);
  }
}
