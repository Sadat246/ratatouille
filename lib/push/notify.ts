import "server-only";

import webpush from "web-push";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auctions, businessMemberships, businesses, listings } from "@/db/schema";
import type { AuctionMutationResult } from "@/lib/auctions/service";
import { formatCurrency } from "@/lib/auctions/display";
import {
  deletePushSubscriptionByEndpoint,
  listPushSubscriptionsForUsers,
} from "@/lib/push/subscriptions";
import { configureWebPush } from "@/lib/push/vapid";

type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

async function sendNotificationToUsers(userIds: string[], payload: NotificationPayload) {
  if (!configureWebPush()) {
    return;
  }

  const subscriptions = await listPushSubscriptionsForUsers(userIds);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(subscription.endpoint);
          return;
        }

        console.error("push notification failed", error);
      }
    }),
  );
}

async function getAuctionNotificationContext(auctionId: string) {
  const [auction] = await db
    .select({
      id: auctions.id,
      businessId: auctions.businessId,
      result: auctions.result,
      currentBidAmountCents: auctions.currentBidAmountCents,
      bidCount: auctions.bidCount,
      listingTitle: listings.title,
      businessName: businesses.name,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(eq(auctions.id, auctionId))
    .limit(1);

  if (!auction) {
    return null;
  }

  const sellerMembers = await db
    .select({
      userId: businessMemberships.userId,
    })
    .from(businessMemberships)
    .where(eq(businessMemberships.businessId, auction.businessId));

  return {
    ...auction,
    sellerUserIds: sellerMembers.map((member) => member.userId),
  };
}

export async function notifyAuctionMutation(result: AuctionMutationResult) {
  const context = await getAuctionNotificationContext(result.auctionId);

  if (!context) {
    return;
  }

  const saleAmount = formatCurrency(context.currentBidAmountCents);

  switch (result.action) {
    case "bid_accepted": {
      await Promise.all([
        result.outbidUserId
          ? sendNotificationToUsers([result.outbidUserId], {
              title: "You were outbid",
              body: `${context.listingTitle} just moved to ${saleAmount}.`,
              url: `/shop/${context.id}`,
              tag: `auction:${context.id}:outbid`,
            })
          : Promise.resolve(),
        sendNotificationToUsers(context.sellerUserIds, {
          title: "New high bid",
          body: `${context.listingTitle} is now at ${saleAmount} across ${context.bidCount} bids.`,
          url: "/sell/auctions",
          tag: `auction:${context.id}:seller-high-bid`,
        }),
      ]);
      return;
    }
    case "auction_bought_out": {
      await Promise.all([
        result.outbidUserId
          ? sendNotificationToUsers([result.outbidUserId], {
              title: "Buyout ended this auction",
              body: `${context.listingTitle} was bought out at ${saleAmount}.`,
              url: `/shop/${context.id}`,
              tag: `auction:${context.id}:buyout-outbid`,
            })
          : Promise.resolve(),
        result.winningBidUserId
          ? sendNotificationToUsers([result.winningBidUserId], {
              title: "You bought it",
              body: `${context.listingTitle} is yours at ${saleAmount}.`,
              url: `/shop/${context.id}`,
              tag: `auction:${context.id}:won`,
            })
          : Promise.resolve(),
        sendNotificationToUsers(context.sellerUserIds, {
          title: "Auction bought out",
          body: `${context.listingTitle} closed instantly at ${saleAmount}.`,
          url: "/sell/outcomes",
          tag: `auction:${context.id}:seller-buyout`,
        }),
      ]);
      return;
    }
    case "auction_closed": {
      await Promise.all([
        result.winningBidUserId
          ? sendNotificationToUsers([result.winningBidUserId], {
              title: "You won",
              body: `${context.listingTitle} closed at ${saleAmount}.`,
              url: `/shop/${context.id}`,
              tag: `auction:${context.id}:won`,
            })
          : Promise.resolve(),
        sendNotificationToUsers(context.sellerUserIds, {
          title: "Auction closed",
          body: `${context.listingTitle} sold for ${saleAmount}.`,
          url: "/sell/outcomes",
          tag: `auction:${context.id}:seller-outcome`,
        }),
      ]);
      return;
    }
    case "auction_no_sale": {
      await sendNotificationToUsers(context.sellerUserIds, {
        title: "Auction ended with no sale",
        body: `${context.listingTitle} closed without any bids.`,
        url: "/sell/outcomes",
        tag: `auction:${context.id}:seller-no-sale`,
      });
      return;
    }
    case "auction_expired":
    case "auction_cancelled": {
      await sendNotificationToUsers(context.sellerUserIds, {
        title: result.action === "auction_expired" ? "Auction expired" : "Auction cancelled",
        body:
          result.action === "auction_expired"
            ? `${context.listingTitle} reached product expiry before settlement.`
            : `${context.listingTitle} was cancelled before settlement.`,
        url: "/sell/outcomes",
        tag: `auction:${context.id}:seller-cancelled`,
      });
    }
  }
}
