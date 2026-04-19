import "server-only";

import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  auctions,
  bids,
  businesses,
  fulfillments,
  listingImages,
  listings,
  settlements,
} from "@/db/schema";
import { type ListingCategory, listingCategoryValues } from "@/lib/listings/categories";
import { getNextBidAmountCents, hasMockCardOnFile } from "@/lib/auctions/pricing";

export type SortBy = "ending_soon" | "nearest" | "lowest_price";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

async function getPrimaryImageUrls(listingIds: string[]) {
  if (listingIds.length === 0) {
    return new Map<string, string>();
  }

  const images = await db
    .select({
      listingId: listingImages.listingId,
      imageUrl: listingImages.imageUrl,
      sortOrder: listingImages.sortOrder,
    })
    .from(listingImages)
    .where(inArray(listingImages.listingId, listingIds))
    .orderBy(asc(listingImages.listingId), asc(listingImages.sortOrder));

  const imageMap = new Map<string, string>();

  for (const image of images) {
    if (!imageMap.has(image.listingId)) {
      imageMap.set(image.listingId, image.imageUrl);
    }
  }

  return imageMap;
}

export type AuctionFeedItem = {
  id: string;
  status: string;
  result: string;
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  currentLeaderUserId: string | null;
  bidCount: number;
  lastBidAt: Date | null;
  scheduledEndAt: Date;
  viewerIsLeading: boolean;
  distanceMiles: number | null;
  listing: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    packageDate: string | null;
    expiresAt: Date | null;
    imageUrl: string | null;
  };
  business: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  };
};

export async function getAuctionFeed(
  params:
    | {
        limit?: number;
        offset?: number;
        viewerUserId?: string;
        lat?: number | null;
        lng?: number | null;
        sortBy?: SortBy;
        categories?: string[];
      }
    | number = {},
  legacyViewerUserId?: string,
): Promise<AuctionFeedItem[]> {
  // Backward compat: if called as getAuctionFeed(24, userId) still works
  const normalizedParams =
    typeof params === "number"
      ? { limit: params, viewerUserId: legacyViewerUserId }
      : params;

  const {
    limit = 24,
    offset = 0,
    viewerUserId,
    sortBy = "ending_soon",
    categories = [],
  } = normalizedParams;

  const validCategories = categories.filter((c) =>
    listingCategoryValues.includes(c as ListingCategory),
  ) as ListingCategory[];
  const categoryCondition =
    validCategories.length > 0
      ? inArray(listings.category, validCategories)
      : undefined;

  /**
   * Shop feed: every live row in the DB — active auction + active listing, no geo filter.
   * `lat` / `lng` in params are ignored until a location-based feed ships.
   */
  const distanceMilesExpr = sql<number | null>`null`.as("distance_miles");

  const orderByClause =
    sortBy === "lowest_price"
      ? asc(auctions.reservePriceCents)
      : asc(auctions.scheduledEndAt);

  const rows = await db
    .select({
      id: auctions.id,
      status: auctions.status,
      result: auctions.result,
      reservePriceCents: auctions.reservePriceCents,
      buyoutPriceCents: auctions.buyoutPriceCents,
      currentBidAmountCents: auctions.currentBidAmountCents,
      currentLeaderUserId: auctions.currentLeaderUserId,
      bidCount: auctions.bidCount,
      lastBidAt: auctions.lastBidAt,
      scheduledEndAt: auctions.scheduledEndAt,
      listingId: listings.id,
      listingTitle: listings.title,
      listingDescription: listings.description,
      listingCategory: listings.category,
      listingPackageDate: listings.expiryText,
      listingExpiresAt: listings.expiresAt,
      businessId: businesses.id,
      businessName: businesses.name,
      businessCity: businesses.city,
      businessState: businesses.state,
      distanceMiles: distanceMilesExpr,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(
      and(
        eq(auctions.status, "active"),
        eq(listings.status, "active"),
        categoryCondition,
      ),
    )
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  const imageMap = await getPrimaryImageUrls(rows.map((row) => row.listingId));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    result: row.result,
    reservePriceCents: row.reservePriceCents,
    buyoutPriceCents: row.buyoutPriceCents,
    currentBidAmountCents: row.currentBidAmountCents,
    currentLeaderUserId: row.currentLeaderUserId,
    bidCount: row.bidCount,
    lastBidAt: row.lastBidAt,
    scheduledEndAt: row.scheduledEndAt,
    viewerIsLeading: Boolean(viewerUserId && row.currentLeaderUserId === viewerUserId),
    distanceMiles: row.distanceMiles ?? null,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
      description: row.listingDescription,
      category: row.listingCategory,
      packageDate: row.listingPackageDate,
      expiresAt: row.listingExpiresAt,
      imageUrl: imageMap.get(row.listingId) ?? null,
    },
    business: {
      id: row.businessId,
      name: row.businessName,
      city: row.businessCity,
      state: row.businessState,
    },
  }));
}

export type AuctionDetail = {
  id: string;
  status: string;
  result: string;
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  currentLeaderUserId: string | null;
  winningBidId: string | null;
  bidCount: number;
  lastBidAt: Date | null;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date;
  endedAt: Date | null;
  listing: {
    id: string;
    status: string;
    title: string;
    description: string | null;
    category: string;
    packageDate: string | null;
    expiresAt: Date | null;
    currency: string;
    images: string[];
  };
  business: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
    pickupHours: string | null;
    pickupInstructions: string | null;
  };
  viewer: null | {
    hasMockCardOnFile: boolean;
    mockCardBrand: string | null;
    mockCardLast4: string | null;
    isLeading: boolean;
    myBidCount: number;
    myTopBidAmountCents: number | null;
    minimumNextBidAmountCents: number;
  };
};

/**
 * Loads auction detail. `auctionOrListingId` may be either `auctions.id` or the parent
 * `listings.id` (so `/shop/<listingId>` and `/shop/<auctionId>` both work).
 */
export async function getAuctionDetail(
  auctionOrListingId: string,
  viewerUserId?: string,
): Promise<AuctionDetail | null> {
  const [row] = await db
    .select({
      id: auctions.id,
      status: auctions.status,
      result: auctions.result,
      reservePriceCents: auctions.reservePriceCents,
      buyoutPriceCents: auctions.buyoutPriceCents,
      currentBidAmountCents: auctions.currentBidAmountCents,
      currentLeaderUserId: auctions.currentLeaderUserId,
      winningBidId: auctions.winningBidId,
      bidCount: auctions.bidCount,
      lastBidAt: auctions.lastBidAt,
      scheduledStartAt: auctions.scheduledStartAt,
      scheduledEndAt: auctions.scheduledEndAt,
      endedAt: auctions.endedAt,
      listingId: listings.id,
      listingStatus: listings.status,
      listingTitle: listings.title,
      listingDescription: listings.description,
      listingCategory: listings.category,
      listingPackageDate: listings.expiryText,
      listingExpiresAt: listings.expiresAt,
      listingCurrency: listings.currency,
      businessId: businesses.id,
      businessName: businesses.name,
      businessCity: businesses.city,
      businessState: businesses.state,
      businessLatitude: businesses.latitude,
      businessLongitude: businesses.longitude,
      businessPickupHours: businesses.pickupHours,
      businessPickupInstructions: businesses.pickupInstructions,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(
      or(eq(auctions.id, auctionOrListingId), eq(listings.id, auctionOrListingId)),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const resolvedAuctionId = row.id;

  const images = await db
    .select({
      imageUrl: listingImages.imageUrl,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, row.listingId))
    .orderBy(asc(listingImages.sortOrder));

  let viewer: AuctionDetail["viewer"] = null;

  if (viewerUserId) {
    const [profile, stats] = await Promise.all([
      db.query.consumerProfiles.findFirst({
        columns: {
          hasMockCardOnFile: true,
          mockCardBrand: true,
          mockCardLast4: true,
        },
        where: (table, operators) => operators.eq(table.userId, viewerUserId),
      }),
      db
        .select({
          myBidCount: sql<number>`count(*)`,
          myTopBidAmountCents: sql<number | null>`max(${bids.amountCents})`,
        })
        .from(bids)
        .where(
          and(
            eq(bids.auctionId, resolvedAuctionId),
            eq(bids.consumerUserId, viewerUserId),
          ),
        )
        .then((rows) => rows[0]),
    ]);

    const profileSnapshot = {
      hasMockCardOnFile: profile?.hasMockCardOnFile ?? false,
      mockCardBrand: profile?.mockCardBrand ?? null,
      mockCardLast4: profile?.mockCardLast4 ?? null,
    };

    viewer = {
      hasMockCardOnFile: hasMockCardOnFile(profileSnapshot),
      mockCardBrand: profileSnapshot.mockCardBrand,
      mockCardLast4: profileSnapshot.mockCardLast4,
      isLeading: row.currentLeaderUserId === viewerUserId,
      myBidCount: toNumber(stats?.myBidCount),
      myTopBidAmountCents:
        stats?.myTopBidAmountCents === null || stats?.myTopBidAmountCents === undefined
          ? null
          : toNumber(stats.myTopBidAmountCents),
      minimumNextBidAmountCents: getNextBidAmountCents({
        currentBidAmountCents: row.currentBidAmountCents,
        reservePriceCents: row.reservePriceCents,
      }),
    };
  }

  return {
    id: row.id,
    status: row.status,
    result: row.result,
    reservePriceCents: row.reservePriceCents,
    buyoutPriceCents: row.buyoutPriceCents,
    currentBidAmountCents: row.currentBidAmountCents,
    currentLeaderUserId: row.currentLeaderUserId,
    winningBidId: row.winningBidId,
    bidCount: row.bidCount,
    lastBidAt: row.lastBidAt,
    scheduledStartAt: row.scheduledStartAt,
    scheduledEndAt: row.scheduledEndAt,
    endedAt: row.endedAt,
    listing: {
      id: row.listingId,
      status: row.listingStatus,
      title: row.listingTitle,
      description: row.listingDescription,
      category: row.listingCategory,
      packageDate: row.listingPackageDate,
      expiresAt: row.listingExpiresAt,
      currency: row.listingCurrency,
      images: images.map((image) => image.imageUrl),
    },
    business: {
      id: row.businessId,
      name: row.businessName,
      city: row.businessCity,
      state: row.businessState,
      latitude: row.businessLatitude,
      longitude: row.businessLongitude,
      pickupHours: row.businessPickupHours,
      pickupInstructions: row.businessPickupInstructions,
    },
    viewer,
  };
}

export type MyBidAuctionItem = {
  id: string;
  status: string;
  result: string;
  currentBidAmountCents: number | null;
  buyoutPriceCents: number | null;
  scheduledEndAt: Date;
  endedAt: Date | null;
  myBidCount: number;
  myTopBidAmountCents: number | null;
  myLastBidAt: Date | null;
  participationState:
    | "winning"
    | "outbid"
    | "won"
    | "lost"
    | "cancelled";
  listing: {
    id: string;
    title: string;
    category: string;
    packageDate: string | null;
    imageUrl: string | null;
  };
  business: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  };
};

export async function getMyBidAuctions(
  userId: string,
  limit = 24,
): Promise<MyBidAuctionItem[]> {
  const participation = await db
    .select({
      auctionId: bids.auctionId,
      myBidCount: sql<number>`count(*)`,
      myTopBidAmountCents: sql<number | null>`max(${bids.amountCents})`,
      myLastBidAt: sql<Date | null>`max(${bids.placedAt})`,
    })
    .from(bids)
    .where(eq(bids.consumerUserId, userId))
    .groupBy(bids.auctionId)
    .orderBy(desc(sql`max(${bids.placedAt})`))
    .limit(limit);

  if (participation.length === 0) {
    return [];
  }

  const auctionIds = participation.map((entry) => entry.auctionId);
  const auctionRows = await db
    .select({
      id: auctions.id,
      status: auctions.status,
      result: auctions.result,
      currentBidAmountCents: auctions.currentBidAmountCents,
      currentLeaderUserId: auctions.currentLeaderUserId,
      buyoutPriceCents: auctions.buyoutPriceCents,
      scheduledEndAt: auctions.scheduledEndAt,
      endedAt: auctions.endedAt,
      listingId: listings.id,
      listingTitle: listings.title,
      listingCategory: listings.category,
      listingPackageDate: listings.expiryText,
      businessId: businesses.id,
      businessName: businesses.name,
      businessCity: businesses.city,
      businessState: businesses.state,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(inArray(auctions.id, auctionIds));

  const imageMap = await getPrimaryImageUrls(auctionRows.map((row) => row.listingId));
  const auctionMap = new Map(auctionRows.map((row) => [row.id, row]));

  return participation.flatMap((entry) => {
    const auction = auctionMap.get(entry.auctionId);

    if (!auction) {
      return [];
    }

    let participationState: MyBidAuctionItem["participationState"] = "lost";

    if (auction.status === "active" || auction.status === "scheduled") {
      participationState =
        auction.currentLeaderUserId === userId ? "winning" : "outbid";
    } else if (
      auction.result === "winning_bid" ||
      auction.result === "buyout"
    ) {
      participationState =
        auction.currentLeaderUserId === userId ? "won" : "lost";
    } else if (auction.status === "cancelled" || auction.result === "cancelled") {
      participationState = "cancelled";
    }

    return {
      id: auction.id,
      status: auction.status,
      result: auction.result,
      currentBidAmountCents: auction.currentBidAmountCents,
      buyoutPriceCents: auction.buyoutPriceCents,
      scheduledEndAt: auction.scheduledEndAt,
      endedAt: auction.endedAt,
      myBidCount: toNumber(entry.myBidCount),
      myTopBidAmountCents:
        entry.myTopBidAmountCents === null || entry.myTopBidAmountCents === undefined
          ? null
          : toNumber(entry.myTopBidAmountCents),
      myLastBidAt: entry.myLastBidAt,
      participationState,
      listing: {
        id: auction.listingId,
        title: auction.listingTitle,
        category: auction.listingCategory,
        packageDate: auction.listingPackageDate,
        imageUrl: imageMap.get(auction.listingId) ?? null,
      },
      business: {
        id: auction.businessId,
        name: auction.businessName,
        city: auction.businessCity,
        state: auction.businessState,
      },
    } satisfies MyBidAuctionItem;
  });
}

export type SellerLiveAuctionItem = {
  id: string;
  status: string;
  result: string;
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  bidCount: number;
  lastBidAt: Date | null;
  scheduledEndAt: Date;
  listing: {
    id: string;
    title: string;
    category: string;
    packageDate: string | null;
    imageUrl: string | null;
  };
};

export async function getSellerLiveAuctions(
  businessId: string,
  limit = 24,
): Promise<SellerLiveAuctionItem[]> {
  const rows = await db
    .select({
      id: auctions.id,
      status: auctions.status,
      result: auctions.result,
      reservePriceCents: auctions.reservePriceCents,
      buyoutPriceCents: auctions.buyoutPriceCents,
      currentBidAmountCents: auctions.currentBidAmountCents,
      bidCount: auctions.bidCount,
      lastBidAt: auctions.lastBidAt,
      scheduledEndAt: auctions.scheduledEndAt,
      listingId: listings.id,
      listingTitle: listings.title,
      listingCategory: listings.category,
      listingPackageDate: listings.expiryText,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .where(
      and(eq(auctions.businessId, businessId), eq(auctions.status, "active")),
    )
    .orderBy(asc(auctions.scheduledEndAt), desc(auctions.lastBidAt))
    .limit(limit);

  const imageMap = await getPrimaryImageUrls(rows.map((row) => row.listingId));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    result: row.result,
    reservePriceCents: row.reservePriceCents,
    buyoutPriceCents: row.buyoutPriceCents,
    currentBidAmountCents: row.currentBidAmountCents,
    bidCount: row.bidCount,
    lastBidAt: row.lastBidAt,
    scheduledEndAt: row.scheduledEndAt,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
      category: row.listingCategory,
      packageDate: row.listingPackageDate,
      imageUrl: imageMap.get(row.listingId) ?? null,
    },
  }));
}

export type SellerOutcomeItem = {
  id: string;
  status: string;
  result: string;
  currentBidAmountCents: number | null;
  bidCount: number;
  endedAt: Date | null;
  listing: {
    id: string;
    title: string;
    category: string;
    packageDate: string | null;
    imageUrl: string | null;
  };
  settlement: null | {
    grossAmountCents: number | null;
    platformFeeCents: number;
    sellerNetAmountCents: number | null;
    status: string;
    paymentStatus: string;
  };
};

export async function getSellerOutcomes(
  businessId: string,
  limit = 24,
): Promise<SellerOutcomeItem[]> {
  const rows = await db
    .select({
      id: auctions.id,
      status: auctions.status,
      result: auctions.result,
      currentBidAmountCents: auctions.currentBidAmountCents,
      bidCount: auctions.bidCount,
      endedAt: auctions.endedAt,
      listingId: listings.id,
      listingTitle: listings.title,
      listingCategory: listings.category,
      listingPackageDate: listings.expiryText,
      settlementGrossAmountCents: settlements.grossAmountCents,
      settlementPlatformFeeCents: settlements.platformFeeCents,
      settlementSellerNetAmountCents: settlements.sellerNetAmountCents,
      settlementStatus: settlements.status,
      settlementPaymentStatus: settlements.paymentStatus,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .leftJoin(settlements, eq(settlements.auctionId, auctions.id))
    .where(
      and(
        eq(auctions.businessId, businessId),
        or(eq(auctions.status, "closed"), eq(auctions.status, "cancelled")),
      ),
    )
    .orderBy(desc(auctions.endedAt))
    .limit(limit);

  const imageMap = await getPrimaryImageUrls(rows.map((row) => row.listingId));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    result: row.result,
    currentBidAmountCents: row.currentBidAmountCents,
    bidCount: row.bidCount,
    endedAt: row.endedAt,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
      category: row.listingCategory,
      packageDate: row.listingPackageDate,
      imageUrl: imageMap.get(row.listingId) ?? null,
    },
    settlement: row.settlementStatus
      ? {
          grossAmountCents: row.settlementGrossAmountCents,
          platformFeeCents: row.settlementPlatformFeeCents ?? 0,
          sellerNetAmountCents: row.settlementSellerNetAmountCents,
          status: row.settlementStatus,
          paymentStatus: row.settlementPaymentStatus ?? "pending_authorization",
        }
      : null,
  }));
}

export type SellerFulfillmentItem = {
  id: string;
  mode: string;
  status: string;
  deliveryProvider: string;
  pickupCode: string | null;
  deliveredAt: Date | null;
  updatedAt: Date;
  listing: {
    id: string;
    title: string;
  };
  settlement: {
    id: string;
    status: string;
    paymentStatus: string;
  };
};

export async function getSellerFulfillments(
  businessId: string,
  limit = 48,
): Promise<SellerFulfillmentItem[]> {
  const rows = await db
    .select({
      id: fulfillments.id,
      mode: fulfillments.mode,
      status: fulfillments.status,
      deliveryProvider: fulfillments.deliveryProvider,
      pickupCode: fulfillments.pickupCode,
      deliveredAt: fulfillments.deliveredAt,
      updatedAt: fulfillments.updatedAt,
      listingId: listings.id,
      listingTitle: listings.title,
      settlementId: settlements.id,
      settlementStatus: settlements.status,
      settlementPaymentStatus: settlements.paymentStatus,
    })
    .from(fulfillments)
    .innerJoin(settlements, eq(settlements.id, fulfillments.settlementId))
    .innerJoin(listings, eq(listings.id, fulfillments.listingId))
    .where(eq(settlements.businessId, businessId))
    .orderBy(desc(fulfillments.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    mode: row.mode,
    status: row.status,
    deliveryProvider: row.deliveryProvider,
    pickupCode: row.pickupCode,
    deliveredAt: row.deliveredAt,
    updatedAt: row.updatedAt,
    listing: {
      id: row.listingId,
      title: row.listingTitle,
    },
    settlement: {
      id: row.settlementId,
      status: row.settlementStatus,
      paymentStatus: row.settlementPaymentStatus,
    },
  }));
}
