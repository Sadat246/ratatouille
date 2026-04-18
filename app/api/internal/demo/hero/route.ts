import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonAuctionError } from "@/lib/auctions/http";
import { authorizeDemoRequest } from "@/lib/demo/auth";
import { demoService } from "@/lib/demo/service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    sellerUserId: z.string().uuid().optional(),
  })
  .optional();

export async function GET(request: Request) {
  const authorization = await authorizeDemoRequest(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const url = new URL(request.url);
    const sellerUserId =
      authorization.actor.kind === "session"
        ? authorization.actor.userId
        : (url.searchParams.get("sellerUserId") ?? null);

    if (!sellerUserId) {
      return jsonAuctionError(
        "DEMO_SELLER_REQUIRED",
        "Provide a seller user id when calling this endpoint with a demo token.",
        400,
      );
    }

    return NextResponse.json({
      ok: true,
      auction: await demoService.getHeroAuctionStatus({ sellerUserId }),
    });
  } catch (error) {
    console.error("demo hero status failed", error);
    return jsonAuctionError(
      "DEMO_STATUS_FAILED",
      "The hero auction status could not be loaded.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeDemoRequest(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const body = bodySchema.parse(await request.json().catch(() => undefined));
    const sellerUserId =
      authorization.actor.kind === "session"
        ? authorization.actor.userId
        : (body?.sellerUserId ?? null);

    if (!sellerUserId) {
      return jsonAuctionError(
        "DEMO_SELLER_REQUIRED",
        "Provide a seller user id when calling this endpoint with a demo token.",
        400,
      );
    }

    return NextResponse.json({
      ok: true,
      auction: await demoService.prepareHeroAuction({ sellerUserId }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError("DEMO_INVALID_REQUEST", error.issues[0]?.message ?? "Invalid hero prepare request.", 400);
    }

    console.error("demo hero prepare failed", error);
    return jsonAuctionError(
      "DEMO_HERO_PREP_FAILED",
      error instanceof Error ? error.message : "The hero auction could not be prepared.",
      500,
    );
  }
}
