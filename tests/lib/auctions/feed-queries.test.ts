import { describe, expect, it } from "vitest";

import { filterByCategories, sortItems } from "@/lib/auctions/feed-utils";
import type { AuctionFeedItem } from "@/lib/auctions/queries";

function makeItem(opts: {
  id?: string;
  scheduledEndAt?: string;
  reservePriceCents?: number;
  category?: string;
  distanceMiles?: number | null;
}): AuctionFeedItem {
  return {
    id: opts.id ?? "test-id",
    status: "active",
    result: "pending",
    reservePriceCents: opts.reservePriceCents ?? 1000,
    buyoutPriceCents: null,
    currentBidAmountCents: null,
    currentLeaderUserId: null,
    bidCount: 0,
    lastBidAt: null,
    scheduledEndAt: new Date(opts.scheduledEndAt ?? "2026-05-01T12:00:00Z"),
    viewerIsLeading: false,
    distanceMiles: opts.distanceMiles ?? null,
    listing: {
      id: "listing-id",
      title: "Test Item",
      description: null,
      category: opts.category ?? "other",
      packageDate: null,
      expiresAt: null,
      imageUrl: null,
    },
    business: {
      id: "business-id",
      name: "Test Business",
      city: "San Francisco",
      state: "CA",
    },
  };
}

const item1 = makeItem({
  id: "a",
  scheduledEndAt: "2026-05-01T10:00:00Z",
  reservePriceCents: 500,
  category: "dairy",
  distanceMiles: 1.5,
});

const item2 = makeItem({
  id: "b",
  scheduledEndAt: "2026-05-01T08:00:00Z",
  reservePriceCents: 2000,
  category: "bakery",
  distanceMiles: 3.2,
});

const item3 = makeItem({
  id: "c",
  scheduledEndAt: "2026-05-01T14:00:00Z",
  reservePriceCents: 100,
  category: "dairy",
  distanceMiles: 0.4,
});

describe("sortItems", () => {
  it('Test 5: sortBy "ending_soon" puts earliest scheduledEndAt first', () => {
    const items = [item1, item2, item3];
    const sorted = sortItems(items, "ending_soon");
    expect(sorted[0].id).toBe("b"); // 08:00 earliest
    expect(sorted[1].id).toBe("a"); // 10:00
    expect(sorted[2].id).toBe("c"); // 14:00 latest
  });

  it('Test 6: sortBy "lowest_price" puts lowest reservePriceCents first', () => {
    const items = [item1, item2, item3];
    const sorted = sortItems(items, "lowest_price");
    expect(sorted[0].id).toBe("c"); // 100 cents
    expect(sorted[1].id).toBe("a"); // 500 cents
    expect(sorted[2].id).toBe("b"); // 2000 cents
  });
});

describe("filterByCategories", () => {
  it('Test 7: category filter ["dairy"] excludes non-dairy items', () => {
    const items = [item1, item2, item3];
    const filtered = filterByCategories(items, ["dairy"]);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((i) => i.listing.category === "dairy")).toBe(true);
  });

  it("Test 8: empty categories array returns all categories", () => {
    const items = [item1, item2, item3];
    const filtered = filterByCategories(items, []);
    expect(filtered).toHaveLength(3);
  });
});
