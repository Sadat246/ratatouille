import "server-only";

import { db } from "@/db/client";
import { uberDirectWebhookEvents } from "@/db/schema";

export async function wasUberEventProcessed(eventId: string): Promise<boolean> {
  const row = await db.query.uberDirectWebhookEvents.findFirst({
    columns: { eventId: true },
    where: (table, operators) => operators.eq(table.eventId, eventId),
  });

  return Boolean(row);
}

export async function markUberEventProcessed(
  eventId: string,
  eventType: string,
): Promise<void> {
  await db
    .insert(uberDirectWebhookEvents)
    .values({
      eventId,
      eventType,
      processedAt: new Date(),
    })
    .onConflictDoNothing({ target: uberDirectWebhookEvents.eventId });
}
