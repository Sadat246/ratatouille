import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError, toAuctionErrorResponse } from "@/lib/auctions/http";
import { getAuctionDetail } from "@/lib/auctions/queries";
import { buyoutAuction } from "@/lib/auctions/service";

export const runtime = "nodejs";

export async function POST(
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
    const result = await buyoutAuction({
      auctionId,
      consumerUserId: authorization.session.user.id,
    });
    const auction = await getAuctionDetail(auctionId, authorization.session.user.id);

    if (!auction) {
      return jsonAuctionError(
        "AUCTION_NOT_FOUND",
        "This auction could not be found after buyout completed.",
        404,
      );
    }

    return NextResponse.json({
      ok: true,
      action: result.action,
      auction,
      meta: {
        outbidUserId: result.outbidUserId ?? null,
      },
    });
  } catch (error) {
    return toAuctionErrorResponse(error);
  }
}
