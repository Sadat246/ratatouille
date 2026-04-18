import "server-only";

import webpush from "web-push";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { getInteractiveDb } from "@/db/interactive";
import { auctions, businessMemberships, businesses, listings } from "@/db/schema";
import {
  AUCTION_ENDING_SOON_WINDOW_MS,
} from "@/lib/auctions/pricing";
import type { AuctionMutationResult } from "@/lib/auctions/service";
import {
  buildAuctionEndingSoonNotifications,
  buildAuctionMutationNotifications,
  shouldNotifyAuctionEndingSoon,
  type AuctionNotificationContext,
  type NotificationDispatch,
  type NotificationPayload,
} from "@/lib/push/notify-shared";
import {
  deletePushSubscriptionByEndpoint,
  listPushSubscriptionsForUsers,
} from "@/lib/push/subscriptions";
import { configureWebPush } from "@/lib/push/vapid";

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

async function getAuctionNotificationContext(
  auctionId: string,
): Promise<AuctionNotificationContext | null> {
  const [auction] = await db
    .select({
      id: auctions.id,
      businessId: auctions.businessId,
      result: auctions.result,
      currentBidAmountCents: auctions.currentBidAmountCents,
      bidCount: auctions.bidCount,
      scheduledEndAt: auctions.scheduledEndAt,
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

async function dispatchNotifications(dispatches: NotificationDispatch[]) {
  await Promise.all(
    dispatches.map((dispatch) =>
      sendNotificationToUsers(dispatch.userIds, dispatch.payload),
    ),
  );
}

export async function notifyAuctionMutation(result: AuctionMutationResult) {
  const context = await getAuctionNotificationContext(result.auctionId);

  if (!context) {
    return;
  }

  await dispatchNotifications(buildAuctionMutationNotifications(result, context));
}

export async function notifyAuctionsEndingSoon(limit = 12, now = new Date()) {
  const windowEnd = new Date(now.getTime() + AUCTION_ENDING_SOON_WINDOW_MS);

  const auctionIds = await getInteractiveDb().transaction(async (tx) => {
    const endingSoonRows = await tx.execute(sql<{ id: string }>`
      select a.id
      from auctions a
      inner join listings l on l.id = a.listing_id
      where a.status = 'active'
        and a.ending_soon_notified_at is null
        and a.scheduled_end_at > ${now}
        and a.scheduled_end_at <= ${windowEnd}
        and (l.expires_at is null or l.expires_at > ${now})
      for update of a skip locked
      limit ${limit}
    `);

    const ids: string[] = [];

    for (const row of endingSoonRows.rows as Array<{ id: string }>) {
      const [updatedAuction] = await tx
        .update(auctions)
        .set({
          endingSoonNotifiedAt: now,
          updatedAt: now,
        })
        .where(eq(auctions.id, row.id))
        .returning({
          id: auctions.id,
          status: auctions.status,
          scheduledEndAt: auctions.scheduledEndAt,
          endingSoonNotifiedAt: auctions.endingSoonNotifiedAt,
        });

      if (updatedAuction) {
        ids.push(updatedAuction.id);
      }
    }

    return ids;
  });

  const contexts = await Promise.all(
    auctionIds.map((auctionId) => getAuctionNotificationContext(auctionId)),
  );

  const dispatches = contexts
    .filter((context): context is AuctionNotificationContext => context !== null)
    .flatMap((context) => buildAuctionEndingSoonNotifications(context, now));

  await dispatchNotifications(dispatches);

  return auctionIds;
}

export {
  buildAuctionEndingSoonNotifications,
  buildAuctionMutationNotifications,
  shouldNotifyAuctionEndingSoon,
};
