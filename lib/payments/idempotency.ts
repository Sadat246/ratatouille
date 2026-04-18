import "server-only";

import { db } from "@/db/client";
import { stripeWebhookEvents } from "@/db/schema";

export async function wasEventProcessed(eventId: string): Promise<boolean> {
  const row = await db.query.stripeWebhookEvents.findFirst({
    columns: { eventId: true },
    where: (table, operators) => operators.eq(table.eventId, eventId),
  });
  return Boolean(row);
}

export async function markEventProcessed(
  eventId: string,
  eventType: string,
): Promise<void> {
  await db
    .insert(stripeWebhookEvents)
    .values({
      eventId,
      eventType,
      processedAt: new Date(),
    })
    .onConflictDoNothing({ target: stripeWebhookEvents.eventId });
}
