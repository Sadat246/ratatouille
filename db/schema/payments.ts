import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auctions, bids } from "./auctions";
import { businesses } from "./businesses";
import { users } from "./identity";
import { listings } from "./listings";

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending",
  "ready_for_fulfillment",
  "completed",
  "failed",
  "voided",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending_authorization",
  "authorized",
  "capture_requested",
  "captured",
  "failed",
  "refunded",
  "not_required",
]);

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    auctionId: uuid("auction_id")
      .notNull()
      .references(() => auctions.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    buyerUserId: uuid("buyer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    winningBidId: uuid("winning_bid_id").references(() => bids.id, {
      onDelete: "set null",
    }),
    status: settlementStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending_authorization"),
    grossAmountCents: integer("gross_amount_cents"),
    platformFeeCents: integer("platform_fee_cents").notNull().default(0),
    sellerNetAmountCents: integer("seller_net_amount_cents"),
    currency: text("currency").notNull().default("usd"),
    processor: text("processor"),
    processorIntentId: text("processor_intent_id"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("settlements_auction_unique").on(table.auctionId),
    uniqueIndex("settlements_listing_unique").on(table.listingId),
    uniqueIndex("settlements_winning_bid_unique").on(table.winningBidId),
    index("settlements_business_status_idx").on(table.businessId, table.status),
  ],
);
