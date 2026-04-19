import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonFulfillmentError, toFulfillmentErrorResponse } from "@/lib/fulfillment/http";
import { getSellerFulfillmentById } from "@/lib/fulfillment/queries";
import { verifyPickupForBusiness } from "@/lib/fulfillment/service";
import { fulfillmentPickupVerificationSchema } from "@/lib/validation/fulfillment";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ fulfillmentId: string }> },
) {
  const authorization = await authorizeApiRole("business");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const parsed = fulfillmentPickupVerificationSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonFulfillmentError(
        "PICKUP_CODE_INVALID",
        parsed.error.issues[0]?.message ?? "Enter the pickup code and try again.",
        400,
      );
    }

    const { fulfillmentId } = await context.params;
    await verifyPickupForBusiness(
      fulfillmentId,
      authorization.session.user.id,
      parsed.data.code,
    );

    const fulfillment = await getSellerFulfillmentById(
      authorization.session.user.id,
      fulfillmentId,
    );

    if (!fulfillment) {
      return jsonFulfillmentError(
        "FULFILLMENT_NOT_FOUND",
        "This fulfillment could not be found after pickup verification.",
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
