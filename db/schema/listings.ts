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
import { listingCategoryValues } from "@/lib/listings/categories";
import {
  listingImageStorageProviderValues,
  packageDateKindValues,
} from "@/lib/listings/shared";

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

export const listingCategoryEnum = pgEnum(
  "listing_category",
  listingCategoryValues,
);

export const packageDateKindEnum = pgEnum(
  "package_date_kind",
  packageDateKindValues,
);

export const listingOcrStatusEnum = pgEnum("listing_ocr_status", [
  "not_requested",
  "succeeded",
  "manual_required",
  "unavailable",
]);

export const listingImageStorageProviderEnum = pgEnum(
  "listing_image_storage_provider",
  listingImageStorageProviderValues,
);

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
    category: listingCategoryEnum("category").notNull().default("other"),
    customCategory: text("custom_category"),
    quantity: integer("quantity").notNull().default(1),
    currency: text("currency").notNull().default("usd"),
    reservePriceCents: integer("reserve_price_cents"),
    buyoutPriceCents: integer("buyout_price_cents"),
    expiryText: text("expiry_text"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    packageDateLabel: text("package_date_label"),
    packageDateKind: packageDateKindEnum("package_date_kind")
      .notNull()
      .default("other"),
    packageDateConfirmedAt: timestamp("package_date_confirmed_at", {
      withTimezone: true,
    }),
    ocrStatus: listingOcrStatusEnum("ocr_status")
      .notNull()
      .default("not_requested"),
    ocrRawText: text("ocr_raw_text"),
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
    storageProvider: listingImageStorageProviderEnum("storage_provider")
      .notNull()
      .default("local"),
    storageKey: text("storage_key").notNull().default(""),
    originalFilename: text("original_filename"),
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
