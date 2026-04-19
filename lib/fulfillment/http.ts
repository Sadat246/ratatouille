import { NextResponse } from "next/server";

import { FulfillmentServiceError } from "./service";

export function jsonFulfillmentError(
  code: string,
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function toFulfillmentErrorResponse(error: unknown) {
  if (error instanceof FulfillmentServiceError) {
    return jsonFulfillmentError(error.code, error.message, error.status);
  }

  console.error("[fulfillment] unhandled error", error);
  return jsonFulfillmentError(
    "FULFILLMENT_REQUEST_FAILED",
    "The fulfillment request failed.",
    500,
  );
}
