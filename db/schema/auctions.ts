import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { businesses } from "./businesses";
import { users } from "./identity";
import { listings } from "./listings";

export const auctionStatusEnum = pgEnum("auction_status", [
  "scheduled",
  "active",
  "closed",
  "cancelled",
]);

export const auctionResultEnum = pgEnum("auction_result", [
  "pending",
  "reserve_not_met",
  "winning_bid",
  "buyout",
  "cancelled",
]);

export const bidKindEnum = pgEnum("bid_kind", ["standard", "buyout"]);

export const bidStatusEnum = pgEnum("bid_status", [
  "active",
  "outbid",
  "winning",
  "withdrawn",
  "voided",
]);

export const auctions = pgTable(
  "auctions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: auctionStatusEnum("status").notNull().default("scheduled"),
    result: auctionResultEnum("result").notNull().default("pending"),
    reservePriceCents: integer("reserve_price_cents").notNull(),
    buyoutPriceCents: integer("buyout_price_cents"),
    currentBidAmountCents: integer("current_bid_amount_cents"),
    currentLeaderBidId: uuid("current_leader_bid_id"),
    currentLeaderUserId: uuid("current_leader_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    bidCount: integer("bid_count").notNull().default(0),
    lastBidAt: timestamp("last_bid_at", { withTimezone: true }),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }).notNull(),
    endingSoonNotifiedAt: timestamp("ending_soon_notified_at", {
      withTimezone: true,
    }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    winningBidId: uuid("winning_bid_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("auctions_listing_unique").on(table.listingId),
    index("auctions_business_status_idx").on(table.businessId, table.status),
    index("auctions_status_end_idx").on(table.status, table.scheduledEndAt),
  ],
);

export const bids = pgTable(
  "bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    auctionId: uuid("auction_id")
      .notNull()
      .references(() => auctions.id, { onDelete: "cascade" }),
    consumerUserId: uuid("consumer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: bidKindEnum("kind").notNull().default("standard"),
    status: bidStatusEnum("status").notNull().default("active"),
    amountCents: integer("amount_cents").notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bids_auction_placed_idx").on(table.auctionId, table.placedAt),
    index("bids_user_placed_idx").on(table.consumerUserId, table.placedAt),
  ],
);
