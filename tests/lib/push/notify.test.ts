import { describe, expect, it } from "vitest";

import type { AuctionMutationResult } from "@/lib/auctions/service";
import {
  buildAuctionEndingSoonNotifications,
  buildAuctionMutationNotifications,
  shouldNotifyAuctionEndingSoon,
  type AuctionNotificationContext,
} from "@/lib/push/notify-shared";

function makeContext(
  overrides: Partial<AuctionNotificationContext> = {},
): AuctionNotificationContext {
  return {
    id: "auction-1",
    businessId: "business-1",
    result: "pending",
    currentBidAmountCents: 1250,
    bidCount: 3,
    scheduledEndAt: new Date("2026-05-02T12:10:00Z"),
    listingTitle: "Bread bundle",
    businessName: "Corner Pantry",
    sellerUserIds: ["seller-1"],
    ...overrides,
  };
}

function makeResult(
  overrides: Partial<AuctionMutationResult> = {},
): AuctionMutationResult {
  return {
    action: "bid_accepted",
    auctionId: "auction-1",
    changed: true,
    closed: false,
    status: "active",
    result: "pending",
    endedAt: null,
    outbidUserId: "consumer-1",
    winningBidId: "bid-1",
    winningBidUserId: "consumer-2",
    ...overrides,
  };
}

describe("buildAuctionMutationNotifications", () => {
  it("routes outbid and seller high-bid notifications to the expected recipients", () => {
    const dispatches = buildAuctionMutationNotifications(makeResult(), makeContext());

    expect(dispatches).toHaveLength(2);
    expect(dispatches[0]).toEqual({
      userIds: ["consumer-1"],
      payload: expect.objectContaining({
        title: "You were outbid",
        url: "/shop/auction-1",
        tag: "auction:auction-1:outbid",
      }),
    });
    expect(dispatches[1]).toEqual({
      userIds: ["seller-1"],
      payload: expect.objectContaining({
        title: "New high bid",
        url: "/sell/auctions",
        tag: "auction:auction-1:seller-high-bid",
      }),
    });
  });

  it("sends consumer win and seller item-sold notifications when an auction closes", () => {
    const dispatches = buildAuctionMutationNotifications(
      makeResult({
        action: "auction_closed",
        closed: true,
        status: "closed",
        result: "winning_bid",
        outbidUserId: null,
      }),
      makeContext(),
    );

    expect(dispatches).toHaveLength(2);
    expect(dispatches[0]).toEqual({
      userIds: ["consumer-2"],
      payload: expect.objectContaining({
        title: "You won",
        tag: "auction:auction-1:won",
      }),
    });
    expect(dispatches[1]).toEqual({
      userIds: ["seller-1"],
      payload: expect.objectContaining({
        title: "Item sold",
        tag: "auction:auction-1:seller-item-sold",
      }),
    });
  });
});

describe("shouldNotifyAuctionEndingSoon", () => {
  const now = new Date("2026-05-02T12:00:00Z");

  it("returns true for active auctions inside the ending-soon window", () => {
    expect(
      shouldNotifyAuctionEndingSoon(
        {
          status: "active",
          scheduledEndAt: new Date("2026-05-02T12:08:00Z"),
          endingSoonNotifiedAt: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it("returns false after the ending-soon beat has already been recorded", () => {
    expect(
      shouldNotifyAuctionEndingSoon(
        {
          status: "active",
          scheduledEndAt: new Date("2026-05-02T12:08:00Z"),
          endingSoonNotifiedAt: new Date("2026-05-02T12:01:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});

describe("buildAuctionEndingSoonNotifications", () => {
  it("builds a seller-facing ending-soon notification with a one-shot tag", () => {
    const dispatches = buildAuctionEndingSoonNotifications(
      makeContext(),
      new Date("2026-05-02T12:01:00Z"),
    );

    expect(dispatches).toEqual([
      {
        userIds: ["seller-1"],
        payload: expect.objectContaining({
          title: "Auction ending soon",
          url: "/sell/auctions",
          tag: "auction:auction-1:ending-soon",
        }),
      },
    ]);
    expect(dispatches[0]?.payload.body).toContain("about 9 minutes");
  });
});
