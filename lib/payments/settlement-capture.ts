import "server-only";

import { randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { getInteractiveDb } from "@/db/interactive";
import { fulfillments, listings, settlements } from "@/db/schema";

function generatePickupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}

function computePickupCodeExpiresAt(params: {
  listingExpiresAt: Date | null;
  fallbackFrom: Date;
}): Date {
  if (params.listingExpiresAt) {
    return params.listingExpiresAt;
  }
  return new Date(params.fallbackFrom.getTime() + 7 * 24 * 60 * 60 * 1_000);
}

/**
 * Authoritative transition: settlement → captured + fulfillment row.
 * Safe to call from Stripe webhooks and from synchronous charge success.
 * Idempotent if already captured.
 */
export async function finalizeSettlementCapture(params: {
  settlementId: string;
  paymentIntentId: string;
  processor: "stripe" | "dev_mock";
}): Promise<{ ok: true; alreadyCaptured: boolean } | { ok: false; reason: "not_found" }> {
  return getInteractiveDb().transaction(async (tx) => {
    const locked = await tx.execute(sql<{
      id: string;
      listingId: string;
      paymentStatus: string;
    }>`
      select id, listing_id as "listingId", payment_status as "paymentStatus"
      from settlements
      where id = ${params.settlementId}
      for update
    `);

    const row = locked.rows[0] as
      | {
          id: string;
          listingId: string;
          paymentStatus: string;
        }
      | undefined;
    if (!row) {
      return { ok: false, reason: "not_found" };
    }

    if (row.paymentStatus === "captured") {
      return { ok: true, alreadyCaptured: true };
    }

    const [listingRow] = await tx
      .select({
        expiresAt: listings.expiresAt,
      })
      .from(listings)
      .where(eq(listings.id, row.listingId))
      .limit(1);

    const now = new Date();
    const pickupCodeExpiresAt = computePickupCodeExpiresAt({
      listingExpiresAt: listingRow?.expiresAt ?? null,
      fallbackFrom: now,
    });

    await tx
      .update(settlements)
      .set({
        status: "ready_for_fulfillment",
        paymentStatus: "captured",
        processor: params.processor,
        processorIntentId: params.paymentIntentId,
        capturedAt: now,
        updatedAt: now,
      })
      .where(eq(settlements.id, params.settlementId));

    await tx
      .insert(fulfillments)
      .values({
        settlementId: params.settlementId,
        listingId: row.listingId,
        mode: "pickup",
        status: "pending_choice",
        pickupCode: generatePickupCode(),
        pickupCodeExpiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: fulfillments.settlementId });

    return { ok: true, alreadyCaptured: false };
  });
}
