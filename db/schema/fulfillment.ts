import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { listings } from "./listings";
import { settlements } from "./payments";

export const fulfillmentModeEnum = pgEnum("fulfillment_mode", [
  "pickup",
  "delivery",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "pending_choice",
  "awaiting_business",
  "ready_for_pickup",
  "picked_up",
  "delivery_requested",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
]);

export const deliveryProviderEnum = pgEnum("delivery_provider", [
  "none",
  "uber_direct",
]);

export const fulfillments = pgTable(
  "fulfillments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    settlementId: uuid("settlement_id")
      .notNull()
      .references(() => settlements.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    mode: fulfillmentModeEnum("mode").notNull().default("pickup"),
    status: fulfillmentStatusEnum("status")
      .notNull()
      .default("pending_choice"),
    deliveryProvider: deliveryProviderEnum("delivery_provider")
      .notNull()
      .default("none"),
    pickupCode: text("pickup_code"),
    pickupCodeExpiresAt: timestamp("pickup_code_expires_at", {
      withTimezone: true,
    }),
    recipientName: text("recipient_name"),
    recipientPhone: text("recipient_phone"),
    deliveryQuoteId: text("delivery_quote_id"),
    deliveryReferenceId: text("delivery_reference_id"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("fulfillments_settlement_unique").on(table.settlementId),
    index("fulfillments_status_idx").on(table.status, table.mode),
  ],
);
