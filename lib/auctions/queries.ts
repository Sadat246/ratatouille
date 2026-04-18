import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  auctions,
  bids,
  businesses,
  listingImages,
  listings,
} from "@/db/schema";
import { getNextBidAmountCents, hasMockCardOnFile } from "@/lib/auctions/pricing";

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
  bidCount: number;
  lastBidAt: Date | null;
  scheduledEndAt: Date;
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

export async function getAuctionFeed(limit = 24): Promise<AuctionFeedItem[]> {
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
      listingDescription: listings.description,
      listingCategory: listings.category,
      listingPackageDate: listings.expiryText,
      listingExpiresAt: listings.expiresAt,
      businessId: businesses.id,
      businessName: businesses.name,
      businessCity: businesses.city,
      businessState: businesses.state,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(eq(auctions.status, "active"))
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

export async function getAuctionDetail(
  auctionId: string,
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
      businessPickupHours: businesses.pickupHours,
      businessPickupInstructions: businesses.pickupInstructions,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(eq(auctions.id, auctionId))
    .limit(1);

  if (!row) {
    return null;
  }

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
            eq(bids.auctionId, auctionId),
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
          : Number(stats.myTopBidAmountCents),
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
      pickupHours: row.businessPickupHours,
      pickupInstructions: row.businessPickupInstructions,
    },
    viewer,
  };
}
