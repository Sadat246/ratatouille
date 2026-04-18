import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError, toAuctionErrorResponse } from "@/lib/auctions/http";
import { getAuctionDetail } from "@/lib/auctions/queries";
import { refreshAuctionIfOverdue } from "@/lib/auctions/service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ auctionId: string }> },
) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const { auctionId } = await context.params;

    await refreshAuctionIfOverdue(auctionId);

    const auction = await getAuctionDetail(auctionId, authorization.session.user.id);

    if (!auction) {
      return jsonAuctionError(
        "AUCTION_NOT_FOUND",
        "This auction could not be found.",
        404,
      );
    }

    return NextResponse.json({
      ok: true,
      auction,
    });
  } catch (error) {
    return toAuctionErrorResponse(error);
  }
}
