import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { getAuctionFeed } from "@/lib/auctions/queries";
import { AUCTION_SWEEP_BATCH_SIZE } from "@/lib/auctions/pricing";
import { sweepOverdueAuctions } from "@/lib/auctions/service";

export const runtime = "nodejs";

export async function GET() {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);
  const auctions = await getAuctionFeed();

  return NextResponse.json({
    ok: true,
    auctions,
  });
}
