import { describe, expect, it, vi } from "vitest";

import {
  buildAmbientDemoBlueprint,
  createDemoService,
  type AmbientDemoBlueprint,
  type AmbientSeedResult,
  type DemoAnchorLocation,
  type DemoAuctionSnapshot,
  type DemoCompetitor,
  type DemoRepository,
  type DemoSellerMembership,
} from "@/lib/demo/service-shared";

const anchor: DemoAnchorLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  city: "San Francisco",
  state: "CA",
  postalCode: "94103",
  countryCode: "US",
  addressLine1: "1 Market St",
  addressLabel: "Downtown",
};

function makeSnapshot(
  overrides: Partial<DemoAuctionSnapshot> = {},
): DemoAuctionSnapshot {
  return {
    auctionId: "auction-1",
    listingId: "listing-1",
    listingTitle: "[Demo Hero] Sealed grocery rescue bag",
    status: "active",
    result: "pending",
    reservePriceCents: 1400,
    buyoutPriceCents: 2400,
    currentBidAmountCents: 1450,
    currentLeaderUserId: "real-consumer",
    bidCount: 1,
    scheduledEndAt: new Date("2026-05-02T12:30:00Z"),
    endedAt: null,
    ...overrides,
  };
}

function createMemoryRepository() {
  let currentSnapshot: DemoAuctionSnapshot | null = null;
  let ambientBlueprint: AmbientDemoBlueprint | null = null;
  let lastClearedBusinessId: string | null = null;
  let lastCreatedHeroParams:
    | {
        businessId: string;
        sellerUserId: string;
        scheduledEndAt: Date;
      }
    | null = null;

  const repository: DemoRepository = {
    async getAnchorLocation() {
      return anchor;
    },
    async replaceAmbientWorld(blueprint) {
      ambientBlueprint = blueprint;
      return {
        businessCount: blueprint.businesses.length,
        consumerCount: blueprint.consumers.length,
        listingCount: blueprint.scenarios.length,
        scenarioKeys: blueprint.scenarios.map((scenario) => scenario.key),
      } satisfies AmbientSeedResult;
    },
    async getSellerMembership(): Promise<DemoSellerMembership | null> {
      return { businessId: "business-1" };
    },
    async clearHeroAuction(businessId) {
      lastClearedBusinessId = businessId;
      currentSnapshot = null;
    },
    async createHeroAuction(params): Promise<DemoAuctionSnapshot> {
      lastCreatedHeroParams = params;
      currentSnapshot = makeSnapshot({
        currentBidAmountCents: null,
        currentLeaderUserId: null,
        bidCount: 0,
      });
      return currentSnapshot;
    },
    async ensureHeroCompetitor(): Promise<DemoCompetitor> {
      return { userId: "demo-competitor" };
    },
    async getAuctionSnapshot() {
      return currentSnapshot;
    },
    async findHeroAuctionForSeller() {
      return currentSnapshot;
    },
    async moveAuctionEnd({ scheduledEndAt }) {
      if (currentSnapshot) {
        currentSnapshot = {
          ...currentSnapshot,
          scheduledEndAt,
        };
      }
    },
  };

  return {
    repository,
    getAmbientBlueprint: () => ambientBlueprint,
    getLastClearedBusinessId: () => lastClearedBusinessId,
    getLastCreatedHeroParams: () => lastCreatedHeroParams,
    setCurrentSnapshot: (snapshot: DemoAuctionSnapshot | null) => {
      currentSnapshot = snapshot;
    },
  };
}

describe("buildAmbientDemoBlueprint", () => {
  it("covers the four required ambient states with deterministic scenario keys", () => {
    const blueprint = buildAmbientDemoBlueprint(anchor, new Date("2026-05-02T12:00:00Z"));

    expect(blueprint.scenarios.map((scenario) => scenario.key)).toEqual([
      "fresh",
      "active_bidding",
      "ending_soon",
      "sold",
    ]);
    expect(new Set(blueprint.businesses.map((business) => business.slug)).size).toBe(
      blueprint.businesses.length,
    );
  });
});

describe("createDemoService", () => {
  it("reseeds the ambient world idempotently instead of appending duplicate scenarios", async () => {
    const memory = createMemoryRepository();
    const service = createDemoService(memory.repository, {
      placeBid: vi.fn(),
      notifyAuctionsEndingSoon: vi.fn(async () => []),
      refreshAuctionIfOverdue: vi.fn(async () => null),
      now: () => new Date("2026-05-02T12:00:00Z"),
    });

    const first = await service.seedAmbientWorld();
    const second = await service.seedAmbientWorld();

    expect(first.listingCount).toBe(4);
    expect(second.listingCount).toBe(4);
    expect(memory.getAmbientBlueprint()?.scenarios).toHaveLength(4);
  });

  it("reuses the real placeBid dependency for competitor injection", async () => {
    const placeBid = vi.fn(async () => null);
    const memory = createMemoryRepository();
    memory.setCurrentSnapshot(makeSnapshot());
    const service = createDemoService(memory.repository, {
      placeBid,
      notifyAuctionsEndingSoon: vi.fn(async () => []),
      refreshAuctionIfOverdue: vi.fn(async () => null),
      now: () => new Date("2026-05-02T12:00:00Z"),
    });

    await service.injectCompetitorBid({
      auctionId: "auction-1",
    });

    expect(placeBid).toHaveBeenCalledWith({
      auctionId: "auction-1",
      consumerUserId: "demo-competitor",
    });
  });

  it("prepares the hero auction under the seller membership scope", async () => {
    const memory = createMemoryRepository();
    const service = createDemoService(memory.repository, {
      placeBid: vi.fn(),
      notifyAuctionsEndingSoon: vi.fn(async () => []),
      refreshAuctionIfOverdue: vi.fn(async () => null),
      now: () => new Date("2026-05-02T12:00:00Z"),
    });

    await service.prepareHeroAuction({
      sellerUserId: "seller-123",
    });

    expect(memory.getLastClearedBusinessId()).toBe("business-1");
    expect(memory.getLastCreatedHeroParams()).toMatchObject({
      businessId: "business-1",
      sellerUserId: "seller-123",
    });
  });

  it("forces the hero auction into ending soon via the shared notification path", async () => {
    const notifyAuctionsEndingSoon = vi.fn(async () => ["auction-1"]);
    const memory = createMemoryRepository();
    memory.setCurrentSnapshot(makeSnapshot());
    const service = createDemoService(memory.repository, {
      placeBid: vi.fn(),
      notifyAuctionsEndingSoon,
      refreshAuctionIfOverdue: vi.fn(async () => null),
      now: () => new Date("2026-05-02T12:00:00Z"),
    });

    await service.forceHeroAuctionIntoEndingSoon({
      auctionId: "auction-1",
    });

    expect(notifyAuctionsEndingSoon).toHaveBeenCalled();
  });

  it("forces the hero auction closed via the shared overdue refresh path", async () => {
    const refreshAuctionIfOverdue = vi.fn(async () => null);
    const memory = createMemoryRepository();
    memory.setCurrentSnapshot(makeSnapshot());
    const service = createDemoService(memory.repository, {
      placeBid: vi.fn(),
      notifyAuctionsEndingSoon: vi.fn(async () => []),
      refreshAuctionIfOverdue,
      now: () => new Date("2026-05-02T12:00:00Z"),
    });

    await service.forceCloseHeroAuction({
      auctionId: "auction-1",
    });

    expect(refreshAuctionIfOverdue).toHaveBeenCalledWith("auction-1");
  });
});
