import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { getConsumerFulfillments } from "@/lib/fulfillment/queries";
import { toFulfillmentErrorResponse } from "@/lib/fulfillment/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const items = await getConsumerFulfillments(authorization.session.user.id);

    return NextResponse.json({
      ok: true,
      fulfillments: items,
    });
  } catch (error) {
    return toFulfillmentErrorResponse(error);
  }
}
