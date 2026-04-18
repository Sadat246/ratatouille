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

export async function POST(request: Request) {
  const authorization = await authorizeDemoRequest(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const body = bodySchema.parse(await request.json().catch(() => undefined));
    const anchorUserId =
      authorization.actor.kind === "session"
        ? authorization.actor.userId
        : (body?.sellerUserId ?? null);

    const result = await demoService.seedAmbientWorld({
      anchorUserId,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError("DEMO_INVALID_REQUEST", error.issues[0]?.message ?? "Invalid demo seed request.", 400);
    }

    console.error("demo seed failed", error);
    return jsonAuctionError(
      "DEMO_SEED_FAILED",
      "The ambient demo world could not be prepared.",
      500,
    );
  }
}
