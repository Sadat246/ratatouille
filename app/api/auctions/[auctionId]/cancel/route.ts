import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError, toAuctionErrorResponse } from "@/lib/auctions/http";
import { getAuctionDetail } from "@/lib/auctions/queries";
import { cancelAuction } from "@/lib/auctions/service";
import { getSellerMembership } from "@/lib/listings/queries";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ auctionId: string }> },
) {
  const authorization = await authorizeApiRole("business");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  const membership = await getSellerMembership(authorization.session.user.id);

  if (!membership) {
    return jsonAuctionError(
      "SELLER_MEMBERSHIP_REQUIRED",
      "This seller account does not have a storefront membership yet.",
      403,
    );
  }

  try {
    const { auctionId } = await context.params;
    const result = await cancelAuction({
      auctionId,
      businessId: membership.businessId,
    });
    const auction = await getAuctionDetail(auctionId);

    if (!auction) {
      return jsonAuctionError(
        "AUCTION_NOT_FOUND",
        "This auction could not be found after cancellation.",
        404,
      );
    }

    return NextResponse.json({
      ok: true,
      action: result.action,
      auction,
    });
  } catch (error) {
    return toAuctionErrorResponse(error);
  }
}
