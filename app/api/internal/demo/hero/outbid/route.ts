import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonAuctionError } from "@/lib/auctions/http";
import { authorizeDemoRequest } from "@/lib/demo/auth";
import { demoService } from "@/lib/demo/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  auctionId: z.string().uuid(),
  sellerUserId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const authorization = await authorizeDemoRequest(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const body = bodySchema.parse(await request.json());
    const anchorUserId =
      authorization.actor.kind === "session"
        ? authorization.actor.userId
        : (body.sellerUserId ?? null);

    return NextResponse.json({
      ok: true,
      auction: await demoService.injectCompetitorBid({
        auctionId: body.auctionId,
        anchorUserId,
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError("DEMO_INVALID_REQUEST", error.issues[0]?.message ?? "Invalid competitor bid request.", 400);
    }

    console.error("demo competitor outbid failed", error);
    return jsonAuctionError(
      "DEMO_OUTBID_FAILED",
      error instanceof Error ? error.message : "The competitor outbid could not be triggered.",
      500,
    );
  }
}
