import { AUCTION_ENDING_SOON_WINDOW_MS } from "@/lib/auctions/pricing";
import type { AuctionMutationResult } from "@/lib/auctions/service";
import { formatCurrency } from "@/lib/auctions/display";

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type NotificationDispatch = {
  userIds: string[];
  payload: NotificationPayload;
};

export type AuctionNotificationContext = {
  id: string;
  businessId: string;
  result: "pending" | "reserve_not_met" | "winning_bid" | "buyout" | "cancelled";
  currentBidAmountCents: number | null;
  bidCount: number;
  scheduledEndAt: Date;
  listingTitle: string;
  businessName: string;
  sellerUserIds: string[];
};

export function shouldNotifyAuctionEndingSoon(
  auction: {
    status: "scheduled" | "active" | "closed" | "cancelled";
    scheduledEndAt: Date;
    endingSoonNotifiedAt: Date | null;
  },
  now: Date,
  windowMs = AUCTION_ENDING_SOON_WINDOW_MS,
) {
  if (auction.status !== "active" || auction.endingSoonNotifiedAt) {
    return false;
  }

  const msUntilEnd = auction.scheduledEndAt.getTime() - now.getTime();
  return msUntilEnd > 0 && msUntilEnd <= windowMs;
}

function getEndingSoonMinutesRemaining(scheduledEndAt: Date, now: Date) {
  return Math.max(1, Math.ceil((scheduledEndAt.getTime() - now.getTime()) / 60_000));
}

export function buildAuctionEndingSoonNotifications(
  context: AuctionNotificationContext,
  now: Date,
): NotificationDispatch[] {
  if (context.sellerUserIds.length === 0) {
    return [];
  }

  const minutesRemaining = getEndingSoonMinutesRemaining(context.scheduledEndAt, now);

  return [
    {
      userIds: context.sellerUserIds,
      payload: {
        title: "Auction ending soon",
        body: `${context.listingTitle} closes in about ${minutesRemaining} minute${
          minutesRemaining === 1 ? "" : "s"
        }.`,
        url: "/sell/auctions",
        tag: `auction:${context.id}:ending-soon`,
      },
    },
  ];
}

export function buildAuctionMutationNotifications(
  result: AuctionMutationResult,
  context: AuctionNotificationContext,
): NotificationDispatch[] {
  const saleAmount = formatCurrency(context.currentBidAmountCents);

  switch (result.action) {
    case "bid_accepted":
      return [
        ...(result.outbidUserId
          ? [
              {
                userIds: [result.outbidUserId],
                payload: {
                  title: "You were outbid",
                  body: `${context.listingTitle} just moved to ${saleAmount}.`,
                  url: `/shop/${context.id}`,
                  tag: `auction:${context.id}:outbid`,
                },
              } satisfies NotificationDispatch,
            ]
          : []),
        {
          userIds: context.sellerUserIds,
          payload: {
            title: "New high bid",
            body: `${context.listingTitle} is now at ${saleAmount} across ${context.bidCount} bids.`,
            url: "/sell/auctions",
            tag: `auction:${context.id}:seller-high-bid`,
          },
        },
      ];
    case "auction_bought_out":
      return [
        ...(result.outbidUserId
          ? [
              {
                userIds: [result.outbidUserId],
                payload: {
                  title: "Buyout ended this auction",
                  body: `${context.listingTitle} was bought out at ${saleAmount}.`,
                  url: `/shop/${context.id}`,
                  tag: `auction:${context.id}:buyout-outbid`,
                },
              } satisfies NotificationDispatch,
            ]
          : []),
        ...(result.winningBidUserId
          ? [
              {
                userIds: [result.winningBidUserId],
                payload: {
                  title: "You bought it",
                  body: `${context.listingTitle} is yours at ${saleAmount}.`,
                  url: `/shop/${context.id}`,
                  tag: `auction:${context.id}:won`,
                },
              } satisfies NotificationDispatch,
            ]
          : []),
        {
          userIds: context.sellerUserIds,
          payload: {
            title: "Item sold",
            body: `${context.listingTitle} sold immediately for ${saleAmount}.`,
            url: "/sell/outcomes",
            tag: `auction:${context.id}:seller-item-sold`,
          },
        },
      ];
    case "auction_closed":
      return [
        ...(result.winningBidUserId
          ? [
              {
                userIds: [result.winningBidUserId],
                payload: {
                  title: "You won",
                  body: `${context.listingTitle} closed at ${saleAmount}.`,
                  url: `/shop/${context.id}`,
                  tag: `auction:${context.id}:won`,
                },
              } satisfies NotificationDispatch,
            ]
          : []),
        {
          userIds: context.sellerUserIds,
          payload: {
            title: "Item sold",
            body: `${context.listingTitle} sold for ${saleAmount}.`,
            url: "/sell/outcomes",
            tag: `auction:${context.id}:seller-item-sold`,
          },
        },
      ];
    case "auction_no_sale":
      return [
        {
          userIds: context.sellerUserIds,
          payload: {
            title: "Auction ended with no sale",
            body: `${context.listingTitle} closed without any bids.`,
            url: "/sell/outcomes",
            tag: `auction:${context.id}:seller-no-sale`,
          },
        },
      ];
    case "auction_expired":
    case "auction_cancelled":
      return [
        {
          userIds: context.sellerUserIds,
          payload: {
            title: result.action === "auction_expired" ? "Auction expired" : "Auction cancelled",
            body:
              result.action === "auction_expired"
                ? `${context.listingTitle} reached product expiry before settlement.`
                : `${context.listingTitle} was cancelled before settlement.`,
            url: "/sell/outcomes",
            tag: `auction:${context.id}:seller-cancelled`,
          },
        },
      ];
  }
}
