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

import { businesses } from "./businesses";
import { users } from "./identity";

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "scheduled",
  "active",
  "sold",
  "expired",
  "cancelled",
]);

export const listingImageKindEnum = pgEnum("listing_image_kind", [
  "product",
  "seal",
  "expiry",
  "other",
]);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: listingStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    currency: text("currency").notNull().default("usd"),
    reservePriceCents: integer("reserve_price_cents"),
    buyoutPriceCents: integer("buyout_price_cents"),
    expiryText: text("expiry_text"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("listings_business_idx").on(table.businessId, table.status),
    index("listings_expires_at_idx").on(table.expiresAt),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    kind: listingImageKindEnum("kind").notNull().default("other"),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("listing_images_listing_idx").on(table.listingId),
    uniqueIndex("listing_images_listing_kind_order_unique").on(
      table.listingId,
      table.kind,
      table.sortOrder,
    ),
  ],
);
