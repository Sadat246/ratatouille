import "server-only";

import { NextResponse } from "next/server";

import { AuctionServiceError } from "@/lib/auctions/service";

export function jsonAuctionError(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    {
      status,
    },
  );
}

export function toAuctionErrorResponse(error: unknown) {
  if (error instanceof AuctionServiceError) {
    return jsonAuctionError(error.code, error.message, error.status);
  }

  console.error("auction route failed", error);

  return jsonAuctionError(
    "AUCTION_INTERNAL_ERROR",
    "The auction request failed. Try again in a moment.",
    500,
  );
}
