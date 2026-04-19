import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonFulfillmentError, toFulfillmentErrorResponse } from "@/lib/fulfillment/http";
import { getConsumerFulfillmentById } from "@/lib/fulfillment/queries";
import { selectPickupForConsumer } from "@/lib/fulfillment/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ fulfillmentId: string }> },
) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const { fulfillmentId } = await context.params;
    await selectPickupForConsumer(fulfillmentId, authorization.session.user.id);

    const fulfillment = await getConsumerFulfillmentById(
      authorization.session.user.id,
      fulfillmentId,
    );

    if (!fulfillment) {
      return jsonFulfillmentError(
        "FULFILLMENT_NOT_FOUND",
        "This fulfillment could not be found after pickup selection.",
        404,
      );
    }

    return NextResponse.json({
      ok: true,
      fulfillment,
    });
  } catch (error) {
    return toFulfillmentErrorResponse(error);
  }
}
