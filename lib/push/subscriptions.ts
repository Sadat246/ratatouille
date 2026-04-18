import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type BrowserPushSubscription = z.infer<typeof pushSubscriptionSchema>;

function toExpirationDate(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parsePushSubscription(input: unknown) {
  return pushSubscriptionSchema.parse(input);
}

export async function upsertPushSubscription({
  userId,
  subscription,
  userAgent,
}: {
  userId: string;
  subscription: BrowserPushSubscription;
  userAgent?: string | null;
}) {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: toExpirationDate(subscription.expirationTime),
      userAgent: userAgent ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: toExpirationDate(subscription.expirationTime),
        userAgent: userAgent ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function deletePushSubscriptionByEndpoint(
  endpoint: string,
  userId?: string,
) {
  if (userId) {
    await db
      .delete(pushSubscriptions)
      .where(
        sql`${pushSubscriptions.endpoint} = ${endpoint} and ${pushSubscriptions.userId} = ${userId}`,
      );
    return;
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getPushSubscriptionCountForUser(userId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return Number(row?.count ?? 0);
}

export async function listPushSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  return db
    .select({
      userId: pushSubscriptions.userId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
}
