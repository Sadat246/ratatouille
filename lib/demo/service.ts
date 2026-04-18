import "server-only";

import { and, desc, eq, like, or } from "drizzle-orm";

import { getInteractiveDb } from "@/db/interactive";
import {
  auctions,
  bids,
  businessMemberships,
  businesses,
  consumerProfiles,
  fulfillments,
  listingImages,
  listings,
  settlements,
  users,
} from "@/db/schema";
import { getSettlementAmounts } from "@/lib/auctions/pricing";
import { placeBid, refreshAuctionIfOverdue } from "@/lib/auctions/service";
import { notifyAuctionsEndingSoon } from "@/lib/push/notify";

import {
  DEMO_HERO_TITLE_PREFIX,
  DEMO_USER_EMAIL_DOMAIN,
} from "./config";
import {
  createDemoService,
  type AmbientDemoBlueprint,
  type AmbientSeedResult,
  type DemoAnchorLocation,
  type DemoAuctionSnapshot,
  type DemoCompetitor,
  type DemoRepository,
  type DemoSellerMembership,
} from "./service-shared";

const DEMO_HERO_IMAGE_URL = "/icons/icon.svg";
const DEFAULT_COUNTRY = "US";
const DEFAULT_CITY = "New York";
const DEFAULT_STATE = "NY";
const DEFAULT_POSTAL_CODE = "10001";
const DEFAULT_LATITUDE = 40.7128;
const DEFAULT_LONGITUDE = -74.006;

function makeAuctionSnapshot(row: {
  auctionId: string;
  listingId: string;
  listingTitle: string;
  status: "scheduled" | "active" | "closed" | "cancelled";
  result: "pending" | "reserve_not_met" | "winning_bid" | "buyout" | "cancelled";
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  currentLeaderUserId: string | null;
  bidCount: number;
  scheduledEndAt: Date;
  endedAt: Date | null;
}): DemoAuctionSnapshot {
  return {
    auctionId: row.auctionId,
    listingId: row.listingId,
    listingTitle: row.listingTitle,
    status: row.status,
    result: row.result,
    reservePriceCents: row.reservePriceCents,
    buyoutPriceCents: row.buyoutPriceCents,
    currentBidAmountCents: row.currentBidAmountCents,
    currentLeaderUserId: row.currentLeaderUserId,
    bidCount: row.bidCount,
    scheduledEndAt: row.scheduledEndAt,
    endedAt: row.endedAt,
  };
}

async function getAuctionSnapshotById(auctionId: string): Promise<DemoAuctionSnapshot | null> {
  const [row] = await getInteractiveDb()
    .select({
      auctionId: auctions.id,
      listingId: listings.id,
      listingTitle: listings.title,
      status: auctions.status,
      result: auctions.result,
      reservePriceCents: auctions.reservePriceCents,
      buyoutPriceCents: auctions.buyoutPriceCents,
      currentBidAmountCents: auctions.currentBidAmountCents,
      currentLeaderUserId: auctions.currentLeaderUserId,
      bidCount: auctions.bidCount,
      scheduledEndAt: auctions.scheduledEndAt,
      endedAt: auctions.endedAt,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .where(eq(auctions.id, auctionId))
    .limit(1);

  return row ? makeAuctionSnapshot(row) : null;
}

function buildDefaultAnchorLocation(): DemoAnchorLocation {
  return {
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    city: DEFAULT_CITY,
    state: DEFAULT_STATE,
    postalCode: DEFAULT_POSTAL_CODE,
    countryCode: DEFAULT_COUNTRY,
    addressLine1: "123 Demo Ave",
    addressLabel: "Demo Market District",
  };
}

async function getAnchorLocationFromSeller(
  userId?: string | null,
): Promise<DemoAnchorLocation | null> {
  if (!userId) {
    return null;
  }

  const [row] = await getInteractiveDb()
    .select({
      latitude: businesses.latitude,
      longitude: businesses.longitude,
      city: businesses.city,
      state: businesses.state,
      postalCode: businesses.postalCode,
      countryCode: businesses.countryCode,
      addressLine1: businesses.addressLine1,
      addressLabel: businesses.addressLabel,
    })
    .from(businessMemberships)
    .innerJoin(businesses, eq(businesses.id, businessMemberships.businessId))
    .where(eq(businessMemberships.userId, userId))
    .limit(1);

  if (!row?.latitude || !row?.longitude) {
    return null;
  }

  return {
    latitude: row.latitude,
    longitude: row.longitude,
    city: row.city ?? DEFAULT_CITY,
    state: row.state ?? DEFAULT_STATE,
    postalCode: row.postalCode ?? DEFAULT_POSTAL_CODE,
    countryCode: row.countryCode ?? DEFAULT_COUNTRY,
    addressLine1: row.addressLine1 ?? "123 Demo Ave",
    addressLabel: row.addressLabel ?? "Demo Market District",
  };
}

async function replaceAmbientWorld(blueprint: AmbientDemoBlueprint): Promise<AmbientSeedResult> {
  const tx = getInteractiveDb();
  const now = new Date();

  return tx.transaction(async (db) => {
    await db
      .delete(businesses)
      .where(like(businesses.slug, "demo-ambient-%"));

    await db
      .delete(users)
      .where(like(users.email, `demo+ambient-%@${DEMO_USER_EMAIL_DOMAIN}`));

    const businessIds = new Map<string, string>();
    const userIds = new Map<string, string>();

    for (const business of blueprint.businesses) {
      const ownerId = crypto.randomUUID();
      const businessId = crypto.randomUUID();

      userIds.set(business.ownerEmail, ownerId);
      businessIds.set(business.key, businessId);

      await db.insert(users).values({
        id: ownerId,
        name: business.ownerName,
        email: business.ownerEmail,
        role: "business",
        onboardingCompletedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(businesses).values({
        id: businessId,
        name: business.name,
        slug: business.slug,
        addressLabel: business.addressLabel,
        addressLine1: business.addressLine1,
        city: business.city,
        state: business.state,
        postalCode: business.postalCode,
        countryCode: business.countryCode,
        latitude: business.latitude,
        longitude: business.longitude,
        geocodeProvider: "demo-seed",
        geocodeFeatureId: `demo:${business.slug}`,
        geocodedAt: now,
        pickupHours: business.pickupHours,
        pickupInstructions: business.pickupInstructions,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(businessMemberships).values({
        id: crypto.randomUUID(),
        businessId,
        userId: ownerId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const consumer of blueprint.consumers) {
      const userId = crypto.randomUUID();
      userIds.set(consumer.key, userId);

      await db.insert(users).values({
        id: userId,
        name: consumer.name,
        email: consumer.email,
        role: "consumer",
        onboardingCompletedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(consumerProfiles).values({
        id: crypto.randomUUID(),
        userId,
        locationLabel: consumer.locationLabel,
        postalCode: consumer.postalCode,
        city: consumer.city,
        state: consumer.state,
        countryCode: consumer.countryCode,
        latitude: consumer.latitude,
        longitude: consumer.longitude,
        geocodeProvider: "demo-seed",
        geocodeFeatureId: `demo:${consumer.key}`,
        geocodedAt: now,
        deliveryAddressLine1: consumer.deliveryAddressLine1,
        deliveryCity: consumer.deliveryCity,
        deliveryState: consumer.deliveryState,
        deliveryPostalCode: consumer.deliveryPostalCode,
        deliveryCountryCode: consumer.deliveryCountryCode,
        deliveryLatitude: consumer.deliveryLatitude,
        deliveryLongitude: consumer.deliveryLongitude,
        deliveryGeocodeProvider: "demo-seed",
        deliveryGeocodedAt: now,
        hasMockCardOnFile: true,
        mockCardBrand: "visa",
        mockCardLast4: "4242",
        mockCardAddedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const scenario of blueprint.scenarios) {
      const listingId = crypto.randomUUID();
      const auctionId = crypto.randomUUID();
      const businessId = businessIds.get(scenario.businessKey);

      if (!businessId) {
        throw new Error(`Missing business for demo scenario ${scenario.key}`);
      }

      await db.insert(listings).values({
        id: listingId,
        businessId,
        createdByUserId: userIds.get(
          blueprint.businesses.find((business) => business.key === scenario.businessKey)
            ?.ownerEmail ?? "",
        ),
        status: scenario.listingStatus,
        title: scenario.listingTitle,
        category: scenario.category as "dairy" | "bakery" | "produce",
        quantity: 1,
        currency: "usd",
        reservePriceCents: scenario.reservePriceCents,
        buyoutPriceCents: scenario.buyoutPriceCents,
        expiryText: scenario.packageDate,
        expiresAt: scenario.expiresAt,
        packageDateLabel: "Use by",
        packageDateKind: "other",
        packageDateConfirmedAt: scenario.publishedAt,
        ocrStatus: "manual_required",
        publishedAt: scenario.publishedAt,
        createdAt: scenario.publishedAt,
        updatedAt: now,
      });

      await db.insert(listingImages).values({
        id: crypto.randomUUID(),
        listingId,
        kind: "product",
        imageUrl: DEMO_HERO_IMAGE_URL,
        storageProvider: "local",
        storageKey: "",
        originalFilename: "demo-icon.svg",
        sortOrder: 0,
        createdAt: scenario.publishedAt,
      });

      let winningBidId: string | null = null;

      if (scenario.currentLeaderKey) {
        winningBidId = crypto.randomUUID();

        await db.insert(bids).values({
          id: winningBidId,
          auctionId,
          consumerUserId: userIds.get(scenario.currentLeaderKey) ?? crypto.randomUUID(),
          kind: "standard",
          status: scenario.auctionStatus === "closed" ? "winning" : "winning",
          amountCents: scenario.currentBidAmountCents ?? scenario.reservePriceCents,
          placedAt: scenario.lastBidAt ?? scenario.publishedAt,
          createdAt: scenario.lastBidAt ?? scenario.publishedAt,
          updatedAt: now,
        });
      }

      await db.insert(auctions).values({
        id: auctionId,
        listingId,
        businessId,
        status: scenario.auctionStatus,
        result: scenario.auctionResult,
        reservePriceCents: scenario.reservePriceCents,
        buyoutPriceCents: scenario.buyoutPriceCents,
        currentBidAmountCents: scenario.currentBidAmountCents,
        currentLeaderBidId: winningBidId,
        currentLeaderUserId: scenario.currentLeaderKey
          ? (userIds.get(scenario.currentLeaderKey) ?? null)
          : null,
        bidCount: scenario.bidCount,
        lastBidAt: scenario.lastBidAt,
        scheduledStartAt: scenario.publishedAt,
        scheduledEndAt: scenario.scheduledEndAt,
        endedAt: scenario.endedAt,
        winningBidId,
        createdAt: scenario.publishedAt,
        updatedAt: now,
      });

      if (scenario.auctionStatus === "closed" && scenario.settlementBuyerKey) {
        const settlementId = crypto.randomUUID();
        const amounts = getSettlementAmounts(
          scenario.settlementAmountCents ?? scenario.reservePriceCents,
        );

        await db.insert(settlements).values({
          id: settlementId,
          auctionId,
          listingId,
          businessId,
          buyerUserId: userIds.get(scenario.settlementBuyerKey) ?? null,
          winningBidId,
          status: "completed",
          paymentStatus: "captured",
          grossAmountCents: amounts.grossAmountCents,
          platformFeeCents: amounts.platformFeeCents,
          sellerNetAmountCents: amounts.sellerNetAmountCents,
          currency: "usd",
          processor: "demo-seed",
          processorIntentId: `demo:${scenario.key}`,
          capturedAt: scenario.endedAt ?? now,
          createdAt: scenario.endedAt ?? now,
          updatedAt: now,
        });

        await db.insert(fulfillments).values({
          id: crypto.randomUUID(),
          settlementId,
          listingId,
          mode: "pickup",
          status: "picked_up",
          deliveryProvider: "none",
          pickupCode: "123456",
          pickupCodeExpiresAt: scenario.endedAt ?? now,
          recipientName: "Ambient Demo Winner",
          recipientPhone: "5555550100",
          createdAt: scenario.endedAt ?? now,
          updatedAt: now,
        });
      }
    }

    return {
      businessCount: blueprint.businesses.length,
      consumerCount: blueprint.consumers.length,
      listingCount: blueprint.scenarios.length,
      scenarioKeys: blueprint.scenarios.map((scenario) => scenario.key),
    };
  });
}

async function ensureHeroCompetitor(anchor: DemoAnchorLocation): Promise<DemoCompetitor> {
  const email = `demo+hero-competitor@${DEMO_USER_EMAIL_DOMAIN}`;
  const now = new Date();

  const existing = await getInteractiveDb().query.users.findFirst({
    columns: { id: true },
    where: (table, operators) => operators.eq(table.email, email),
  });

  if (existing) {
    return {
      userId: existing.id,
    };
  }

  const userId = crypto.randomUUID();

  await getInteractiveDb().transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      name: "Demo Hero Competitor",
      email,
      role: "consumer",
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(consumerProfiles).values({
      id: crypto.randomUUID(),
      userId,
      locationLabel: anchor.addressLabel,
      postalCode: anchor.postalCode,
      city: anchor.city,
      state: anchor.state,
      countryCode: anchor.countryCode,
      latitude: anchor.latitude + 0.001,
      longitude: anchor.longitude - 0.001,
      geocodeProvider: "demo-seed",
      geocodeFeatureId: "demo:hero-competitor",
      geocodedAt: now,
      deliveryAddressLine1: "88 Demo Competitor Ln",
      deliveryCity: anchor.city,
      deliveryState: anchor.state,
      deliveryPostalCode: anchor.postalCode,
      deliveryCountryCode: anchor.countryCode,
      deliveryLatitude: anchor.latitude + 0.001,
      deliveryLongitude: anchor.longitude - 0.001,
      deliveryGeocodeProvider: "demo-seed",
      deliveryGeocodedAt: now,
      hasMockCardOnFile: true,
      mockCardBrand: "visa",
      mockCardLast4: "4242",
      mockCardAddedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    userId,
  };
}

function buildHeroAuctionTitle() {
  return `${DEMO_HERO_TITLE_PREFIX} Sealed grocery rescue bag`;
}

const databaseDemoRepository: DemoRepository = {
  async getAnchorLocation(anchorUserId) {
    return (await getAnchorLocationFromSeller(anchorUserId)) ?? buildDefaultAnchorLocation();
  },

  replaceAmbientWorld,

  async getSellerMembership(userId): Promise<DemoSellerMembership | null> {
    const membership = await getInteractiveDb().query.businessMemberships.findFirst({
      columns: { businessId: true },
      where: (table, operators) => operators.eq(table.userId, userId),
    });

    return membership ?? null;
  },

  async clearHeroAuction(businessId) {
    await getInteractiveDb()
      .delete(listings)
      .where(
        and(
          eq(listings.businessId, businessId),
          like(listings.title, `${DEMO_HERO_TITLE_PREFIX}%`),
        ),
      );
  },

  async createHeroAuction({ businessId, sellerUserId, scheduledEndAt }) {
    const now = new Date();
    const listingId = crypto.randomUUID();
    const auctionId = crypto.randomUUID();

    await getInteractiveDb().transaction(async (tx) => {
      await tx.insert(listings).values({
        id: listingId,
        businessId,
        createdByUserId: sellerUserId,
        status: "active",
        title: buildHeroAuctionTitle(),
        description: "Scripted Phase 8 walkthrough listing.",
        category: "pantry",
        quantity: 1,
        currency: "usd",
        reservePriceCents: 1400,
        buyoutPriceCents: 2400,
        expiryText: "2026-05-03",
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        packageDateLabel: "Use by",
        packageDateKind: "other",
        packageDateConfirmedAt: now,
        ocrStatus: "manual_required",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(listingImages).values({
        id: crypto.randomUUID(),
        listingId,
        kind: "product",
        imageUrl: DEMO_HERO_IMAGE_URL,
        storageProvider: "local",
        storageKey: "",
        originalFilename: "demo-icon.svg",
        sortOrder: 0,
        createdAt: now,
      });

      await tx.insert(auctions).values({
        id: auctionId,
        listingId,
        businessId,
        status: "active",
        result: "pending",
        reservePriceCents: 1400,
        buyoutPriceCents: 2400,
        bidCount: 0,
        scheduledStartAt: now,
        scheduledEndAt,
        createdAt: now,
        updatedAt: now,
      });
    });

    const snapshot = await getAuctionSnapshotById(auctionId);

    if (!snapshot) {
      throw new Error("The hero auction could not be loaded after creation.");
    }

    return snapshot;
  },

  ensureHeroCompetitor,

  getAuctionSnapshot: getAuctionSnapshotById,

  async findHeroAuctionForSeller(userId) {
    const [row] = await getInteractiveDb()
      .select({
        auctionId: auctions.id,
        listingId: listings.id,
        listingTitle: listings.title,
        status: auctions.status,
        result: auctions.result,
        reservePriceCents: auctions.reservePriceCents,
        buyoutPriceCents: auctions.buyoutPriceCents,
        currentBidAmountCents: auctions.currentBidAmountCents,
        currentLeaderUserId: auctions.currentLeaderUserId,
        bidCount: auctions.bidCount,
        scheduledEndAt: auctions.scheduledEndAt,
        endedAt: auctions.endedAt,
      })
      .from(businessMemberships)
      .innerJoin(auctions, eq(auctions.businessId, businessMemberships.businessId))
      .innerJoin(listings, eq(listings.id, auctions.listingId))
      .where(
        and(
          eq(businessMemberships.userId, userId),
          like(listings.title, `${DEMO_HERO_TITLE_PREFIX}%`),
          or(eq(auctions.status, "active"), eq(auctions.status, "closed")),
        ),
      )
      .orderBy(desc(listings.createdAt))
      .limit(1);

    return row ? makeAuctionSnapshot(row) : null;
  },

  async moveAuctionEnd({ auctionId, scheduledEndAt, clearEndingSoon }) {
    await getInteractiveDb()
      .update(auctions)
      .set({
        scheduledEndAt,
        endingSoonNotifiedAt: clearEndingSoon ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(auctions.id, auctionId));
  },
};

const sharedDemoService = createDemoService(databaseDemoRepository, {
  placeBid,
  notifyAuctionsEndingSoon,
  refreshAuctionIfOverdue,
});

export const demoService = sharedDemoService;
export { buildAmbientDemoBlueprint } from "./service-shared";
