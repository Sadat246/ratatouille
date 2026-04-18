import type { SortBy } from "@/lib/auctions/queries";

import { DEMO_AMBIENT_TITLE_PREFIX } from "./config";

export type DemoAnchorLocation = {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  addressLine1: string;
  addressLabel: string;
};

export type DemoAuctionSnapshot = {
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
};

export type DemoAmbientBusinessBlueprint = {
  key: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  addressLine1: string;
  addressLabel: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  pickupHours: string;
  pickupInstructions: string;
};

export type DemoAmbientConsumerBlueprint = {
  key: string;
  name: string;
  email: string;
  locationLabel: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  deliveryAddressLine1: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPostalCode: string;
  deliveryCountryCode: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
};

export type DemoAmbientScenarioBlueprint = {
  key: "fresh" | "active_bidding" | "ending_soon" | "sold";
  businessKey: string;
  listingTitle: string;
  category: string;
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  packageDate: string;
  expiresAt: Date;
  publishedAt: Date;
  scheduledEndAt: Date;
  currentBidAmountCents: number | null;
  currentLeaderKey: string | null;
  bidCount: number;
  lastBidAt: Date | null;
  endedAt: Date | null;
  listingStatus: "active" | "sold";
  auctionStatus: "active" | "closed";
  auctionResult: "pending" | "winning_bid";
  settlementBuyerKey?: string;
  settlementAmountCents?: number;
  sortBy?: SortBy;
};

export type AmbientDemoBlueprint = {
  businesses: DemoAmbientBusinessBlueprint[];
  consumers: DemoAmbientConsumerBlueprint[];
  scenarios: DemoAmbientScenarioBlueprint[];
};

export type AmbientSeedResult = {
  businessCount: number;
  consumerCount: number;
  listingCount: number;
  scenarioKeys: string[];
};

export type DemoSellerMembership = {
  businessId: string;
};

export type DemoCompetitor = {
  userId: string;
};

export type DemoRepository = {
  getAnchorLocation(anchorUserId?: string | null): Promise<DemoAnchorLocation>;
  replaceAmbientWorld(blueprint: AmbientDemoBlueprint): Promise<AmbientSeedResult>;
  getSellerMembership(userId: string): Promise<DemoSellerMembership | null>;
  clearHeroAuction(businessId: string): Promise<void>;
  createHeroAuction(params: {
    businessId: string;
    sellerUserId: string;
    scheduledEndAt: Date;
  }): Promise<DemoAuctionSnapshot>;
  ensureHeroCompetitor(anchor: DemoAnchorLocation): Promise<DemoCompetitor>;
  getAuctionSnapshot(auctionId: string): Promise<DemoAuctionSnapshot | null>;
  findHeroAuctionForSeller(userId: string): Promise<DemoAuctionSnapshot | null>;
  moveAuctionEnd(params: {
    auctionId: string;
    scheduledEndAt: Date;
    clearEndingSoon: boolean;
  }): Promise<void>;
};

export type DemoServiceDeps = {
  now?: () => Date;
  placeBid: (params: { auctionId: string; consumerUserId: string }) => Promise<unknown>;
  notifyAuctionsEndingSoon: (limit?: number, now?: Date) => Promise<string[]>;
  refreshAuctionIfOverdue: (auctionId: string) => Promise<unknown>;
};

const DEFAULT_DEMO_ANCHOR: DemoAnchorLocation = {
  latitude: 40.7128,
  longitude: -74.006,
  city: "New York",
  state: "NY",
  postalCode: "10001",
  countryCode: "US",
  addressLine1: "123 Demo Ave",
  addressLabel: "Demo Market District",
};

const HERO_ENDING_SOON_WINDOW_MS = 9 * 60 * 1_000;
const HERO_PREP_WINDOW_MS = 45 * 60 * 1_000;

function offsetLocation(
  anchor: DemoAnchorLocation,
  latOffset: number,
  lngOffset: number,
) {
  return {
    latitude: anchor.latitude + latOffset,
    longitude: anchor.longitude + lngOffset,
  };
}

function buildAmbientBusinessEmail(slug: string) {
  return `demo+ambient-${slug}@ratatouille.local`;
}

function buildAmbientConsumerEmail(key: string) {
  return `demo+ambient-${key}@ratatouille.local`;
}

export function buildAmbientDemoBlueprint(
  anchor: DemoAnchorLocation = DEFAULT_DEMO_ANCHOR,
  now = new Date(),
): AmbientDemoBlueprint {
  const amberLocation = offsetLocation(anchor, 0.0045, 0.0045);
  const atlasLocation = offsetLocation(anchor, -0.0035, -0.004);
  const bidderLocation = offsetLocation(anchor, 0.001, -0.0015);
  const closerLocation = offsetLocation(anchor, -0.0015, 0.0015);

  return {
    businesses: [
      {
        key: "amber",
        name: "Amber Market",
        slug: "demo-ambient-amber-market",
        ownerName: "Amber Demo Owner",
        ownerEmail: buildAmbientBusinessEmail("amber-market"),
        addressLine1: "101 Demo Market St",
        addressLabel: `${anchor.city} Demo Corridor`,
        city: anchor.city,
        state: anchor.state,
        postalCode: anchor.postalCode,
        countryCode: anchor.countryCode,
        latitude: amberLocation.latitude,
        longitude: amberLocation.longitude,
        pickupHours: "Mon-Sat 9a-8p",
        pickupInstructions: "Ask for the demo order shelf near the register.",
      },
      {
        key: "atlas",
        name: "Atlas Grocer",
        slug: "demo-ambient-atlas-grocer",
        ownerName: "Atlas Demo Owner",
        ownerEmail: buildAmbientBusinessEmail("atlas-grocer"),
        addressLine1: "202 Demo Grocer Ln",
        addressLabel: `${anchor.city} Demo Corridor`,
        city: anchor.city,
        state: anchor.state,
        postalCode: anchor.postalCode,
        countryCode: anchor.countryCode,
        latitude: atlasLocation.latitude,
        longitude: atlasLocation.longitude,
        pickupHours: "Daily 8a-9p",
        pickupInstructions: "Pickup counter is beside the prepared-food fridge.",
      },
    ],
    consumers: [
      {
        key: "bidder",
        name: "Ambient Demo Bidder",
        email: buildAmbientConsumerEmail("bidder"),
        locationLabel: anchor.addressLabel,
        city: anchor.city,
        state: anchor.state,
        postalCode: anchor.postalCode,
        countryCode: anchor.countryCode,
        latitude: bidderLocation.latitude,
        longitude: bidderLocation.longitude,
        deliveryAddressLine1: "12 Demo Bidder Way",
        deliveryCity: anchor.city,
        deliveryState: anchor.state,
        deliveryPostalCode: anchor.postalCode,
        deliveryCountryCode: anchor.countryCode,
        deliveryLatitude: bidderLocation.latitude,
        deliveryLongitude: bidderLocation.longitude,
      },
      {
        key: "closer",
        name: "Ambient Demo Winner",
        email: buildAmbientConsumerEmail("closer"),
        locationLabel: anchor.addressLabel,
        city: anchor.city,
        state: anchor.state,
        postalCode: anchor.postalCode,
        countryCode: anchor.countryCode,
        latitude: closerLocation.latitude,
        longitude: closerLocation.longitude,
        deliveryAddressLine1: "34 Demo Winner Blvd",
        deliveryCity: anchor.city,
        deliveryState: anchor.state,
        deliveryPostalCode: anchor.postalCode,
        deliveryCountryCode: anchor.countryCode,
        deliveryLatitude: closerLocation.latitude,
        deliveryLongitude: closerLocation.longitude,
      },
    ],
    scenarios: [
      {
        key: "fresh",
        businessKey: "amber",
        listingTitle: `${DEMO_AMBIENT_TITLE_PREFIX} Fresh dairy crate`,
        category: "dairy",
        reservePriceCents: 900,
        buyoutPriceCents: 1600,
        packageDate: "2026-05-03",
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        publishedAt: new Date(now.getTime() - 5 * 60 * 1_000),
        scheduledEndAt: new Date(now.getTime() + 45 * 60 * 1_000),
        currentBidAmountCents: null,
        currentLeaderKey: null,
        bidCount: 0,
        lastBidAt: null,
        endedAt: null,
        listingStatus: "active",
        auctionStatus: "active",
        auctionResult: "pending",
      },
      {
        key: "active_bidding",
        businessKey: "atlas",
        listingTitle: `${DEMO_AMBIENT_TITLE_PREFIX} Bagel rescue box`,
        category: "bakery",
        reservePriceCents: 1200,
        buyoutPriceCents: 2100,
        packageDate: "2026-05-03",
        expiresAt: new Date(now.getTime() + 20 * 60 * 60 * 1_000),
        publishedAt: new Date(now.getTime() - 25 * 60 * 1_000),
        scheduledEndAt: new Date(now.getTime() + 28 * 60 * 1_000),
        currentBidAmountCents: 1450,
        currentLeaderKey: "bidder",
        bidCount: 1,
        lastBidAt: new Date(now.getTime() - 7 * 60 * 1_000),
        endedAt: null,
        listingStatus: "active",
        auctionStatus: "active",
        auctionResult: "pending",
      },
      {
        key: "ending_soon",
        businessKey: "amber",
        listingTitle: `${DEMO_AMBIENT_TITLE_PREFIX} Yogurt six-pack`,
        category: "dairy",
        reservePriceCents: 800,
        buyoutPriceCents: 1500,
        packageDate: "2026-05-02",
        expiresAt: new Date(now.getTime() + 10 * 60 * 60 * 1_000),
        publishedAt: new Date(now.getTime() - 45 * 60 * 1_000),
        scheduledEndAt: new Date(now.getTime() + 8 * 60 * 1_000),
        currentBidAmountCents: 950,
        currentLeaderKey: "closer",
        bidCount: 1,
        lastBidAt: new Date(now.getTime() - 3 * 60 * 1_000),
        endedAt: null,
        listingStatus: "active",
        auctionStatus: "active",
        auctionResult: "pending",
      },
      {
        key: "sold",
        businessKey: "atlas",
        listingTitle: `${DEMO_AMBIENT_TITLE_PREFIX} Produce bag sold`,
        category: "produce",
        reservePriceCents: 1100,
        buyoutPriceCents: 1800,
        packageDate: "2026-05-02",
        expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1_000),
        publishedAt: new Date(now.getTime() - 90 * 60 * 1_000),
        scheduledEndAt: new Date(now.getTime() - 18 * 60 * 1_000),
        currentBidAmountCents: 1400,
        currentLeaderKey: "closer",
        bidCount: 1,
        lastBidAt: new Date(now.getTime() - 25 * 60 * 1_000),
        endedAt: new Date(now.getTime() - 18 * 60 * 1_000),
        listingStatus: "sold",
        auctionStatus: "closed",
        auctionResult: "winning_bid",
        settlementBuyerKey: "closer",
        settlementAmountCents: 1400,
      },
    ],
  };
}

export function createDemoService(repository: DemoRepository, deps: DemoServiceDeps) {
  const now = deps.now ?? (() => new Date());

  return {
    async seedAmbientWorld(params?: { anchorUserId?: string | null }) {
      const anchor = await repository.getAnchorLocation(params?.anchorUserId ?? null);
      const blueprint = buildAmbientDemoBlueprint(anchor, now());
      return repository.replaceAmbientWorld(blueprint);
    },

    async prepareHeroAuction(params: { sellerUserId: string }) {
      const membership = await repository.getSellerMembership(params.sellerUserId);

      if (!membership) {
        throw new Error("A business membership is required to prepare the hero auction.");
      }

      await repository.clearHeroAuction(membership.businessId);

      return repository.createHeroAuction({
        businessId: membership.businessId,
        sellerUserId: params.sellerUserId,
        scheduledEndAt: new Date(now().getTime() + HERO_PREP_WINDOW_MS),
      });
    },

    async getHeroAuctionStatus(params: { sellerUserId: string }) {
      return repository.findHeroAuctionForSeller(params.sellerUserId);
    },

    async injectCompetitorBid(params: {
      auctionId: string;
      anchorUserId?: string | null;
    }) {
      const anchor = await repository.getAnchorLocation(params.anchorUserId ?? null);
      const competitor = await repository.ensureHeroCompetitor(anchor);
      const snapshot = await repository.getAuctionSnapshot(params.auctionId);

      if (!snapshot) {
        throw new Error("The requested hero auction could not be found.");
      }

      if (!snapshot.currentLeaderUserId) {
        throw new Error("Place a real consumer bid before injecting the competitor outbid.");
      }

      if (snapshot.currentLeaderUserId === competitor.userId) {
        throw new Error("The competitor already leads this auction.");
      }

      await deps.placeBid({
        auctionId: params.auctionId,
        consumerUserId: competitor.userId,
      });

      return repository.getAuctionSnapshot(params.auctionId);
    },

    async forceHeroAuctionIntoEndingSoon(params: { auctionId: string }) {
      await repository.moveAuctionEnd({
        auctionId: params.auctionId,
        scheduledEndAt: new Date(now().getTime() + HERO_ENDING_SOON_WINDOW_MS),
        clearEndingSoon: true,
      });

      await deps.notifyAuctionsEndingSoon(12, now());
      return repository.getAuctionSnapshot(params.auctionId);
    },

    async forceCloseHeroAuction(params: { auctionId: string }) {
      await repository.moveAuctionEnd({
        auctionId: params.auctionId,
        scheduledEndAt: new Date(now().getTime() - 1_000),
        clearEndingSoon: false,
      });

      await deps.refreshAuctionIfOverdue(params.auctionId);
      return repository.getAuctionSnapshot(params.auctionId);
    },
  };
}
