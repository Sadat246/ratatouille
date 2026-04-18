import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { auctions, businessMemberships, businesses, listings } from "@/db/schema";

export type SellerDeskMetricSnapshot = {
  draftCount: number;
  readyCount: number;
  publishedTodayCount: number;
};

export type SellerDeskRecentListing = {
  id: string;
  title: string;
  status: string;
  category: string;
  reservePriceCents: number | null;
  buyoutPriceCents: number | null;
  auctionEndsAt: Date | null;
  packageDate: string | null;
  updatedAt: Date;
};

export type SellerDeskData = {
  businessId: string;
  businessName: string;
  metrics: SellerDeskMetricSnapshot;
  recentListings: SellerDeskRecentListing[];
};

function toCount(value: unknown) {
  return Number(value ?? 0);
}

export async function getSellerMembership(userId: string) {
  return db.query.businessMemberships.findFirst({
    columns: {
      businessId: true,
    },
    where: (table, { eq }) => eq(table.userId, userId),
  });
}

export async function getSellerDeskData(userId: string): Promise<SellerDeskData | null> {
  const [membership] = await db
    .select({
      businessId: businessMemberships.businessId,
      businessName: businesses.name,
    })
    .from(businessMemberships)
    .innerJoin(businesses, eq(businessMemberships.businessId, businesses.id))
    .where(eq(businessMemberships.userId, userId))
    .limit(1);

  if (!membership) {
    return null;
  }

  const [metricsRow] = await db
    .select({
      draftCount: sql<number>`count(*) filter (where ${listings.status} = 'draft')`,
      readyCount: sql<number>`count(*) filter (where ${listings.status} in ('scheduled', 'active'))`,
      publishedTodayCount: sql<number>`count(*) filter (where ${listings.publishedAt} >= date_trunc('day', now()))`,
    })
    .from(listings)
    .where(eq(listings.businessId, membership.businessId));

  const recentListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      status: listings.status,
      category: listings.category,
      reservePriceCents: listings.reservePriceCents,
      buyoutPriceCents: listings.buyoutPriceCents,
      auctionEndsAt: auctions.scheduledEndAt,
      packageDate: listings.expiryText,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .leftJoin(auctions, and(eq(auctions.listingId, listings.id)))
    .where(eq(listings.businessId, membership.businessId))
    .orderBy(desc(listings.updatedAt))
    .limit(6);

  return {
    businessId: membership.businessId,
    businessName: membership.businessName,
    metrics: {
      draftCount: toCount(metricsRow?.draftCount),
      readyCount: toCount(metricsRow?.readyCount),
      publishedTodayCount: toCount(metricsRow?.publishedTodayCount),
    },
    recentListings,
  };
}
