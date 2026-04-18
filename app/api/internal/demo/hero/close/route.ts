import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonAuctionError } from "@/lib/auctions/http";
import { authorizeDemoRequest } from "@/lib/demo/auth";
import { demoService } from "@/lib/demo/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  auctionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const authorization = await authorizeDemoRequest(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const body = bodySchema.parse(await request.json());

    return NextResponse.json({
      ok: true,
      auction: await demoService.forceCloseHeroAuction({
        auctionId: body.auctionId,
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError("DEMO_INVALID_REQUEST", error.issues[0]?.message ?? "Invalid force-close request.", 400);
    }

    console.error("demo close failed", error);
    return jsonAuctionError(
      "DEMO_CLOSE_FAILED",
      error instanceof Error ? error.message : "The hero auction could not be force-closed.",
      500,
    );
  }
}
