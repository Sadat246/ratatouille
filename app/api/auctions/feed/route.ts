import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { authorizeApiRole } from "@/lib/auth/api";
import { AUCTION_SWEEP_BATCH_SIZE } from "@/lib/auctions/pricing";
import { getAuctionFeed } from "@/lib/auctions/queries";
import { sweepOverdueAuctions } from "@/lib/auctions/service";
import { listingCategoryValues } from "@/lib/listings/categories";

export const runtime = "nodejs";

const VALID_SORT_BY = ["ending_soon", "nearest", "lowest_price"] as const;
type SortBy = (typeof VALID_SORT_BY)[number];

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, Number(searchParams.get("offset") ?? "0"));
    const LIMIT = 12;
    const rawSortBy = searchParams.get("sortBy") ?? "ending_soon";
    const sortBy: SortBy = VALID_SORT_BY.includes(rawSortBy as SortBy)
      ? (rawSortBy as SortBy)
      : "ending_soon";
    const rawCategories = searchParams.getAll("category");
    const categories = rawCategories.filter((c) =>
      (listingCategoryValues as readonly string[]).includes(c),
    );

    // SECURITY: read consumer lat/lng from DB — NEVER from request params
    const profile = await db.query.consumerProfiles.findFirst({
      columns: { latitude: true, longitude: true },
      where: (table, operators) =>
        operators.eq(table.userId, authorization.session.user.id),
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "No consumer profile found" },
        { status: 400 },
      );
    }

    await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);

    const items = await getAuctionFeed({
      lat: profile.latitude,
      lng: profile.longitude,
      sortBy,
      categories,
      limit: LIMIT + 1, // fetch one extra to detect hasMore
      offset,
      viewerUserId: authorization.session.user.id,
    });

    const hasMore = items.length > LIMIT;
    return NextResponse.json({
      ok: true,
      items: items.slice(0, LIMIT),
      nextOffset: hasMore ? offset + LIMIT : null,
      hasMore,
    });
  } catch (error) {
    console.error("[feed] GET error", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
