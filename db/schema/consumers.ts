import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  doublePrecision,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export const consumerProfiles = pgTable(
  "consumer_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationLabel: text("location_label").notNull(),
    postalCode: text("postal_code"),
    city: text("city"),
    state: text("state"),
    countryCode: text("country_code"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    geocodeProvider: text("geocode_provider").notNull(),
    geocodeFeatureId: text("geocode_feature_id"),
    geocodedAt: timestamp("geocoded_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    deliveryAddressLine1: text("delivery_address_line_1").notNull(),
    deliveryAddressLine2: text("delivery_address_line_2"),
    deliveryCity: text("delivery_city").notNull(),
    deliveryState: text("delivery_state").notNull(),
    deliveryPostalCode: text("delivery_postal_code").notNull(),
    deliveryCountryCode: text("delivery_country_code").notNull(),
    deliveryLatitude: doublePrecision("delivery_latitude").notNull(),
    deliveryLongitude: doublePrecision("delivery_longitude").notNull(),
    deliveryPlaceId: text("delivery_place_id"),
    deliveryGeocodeProvider: text("delivery_geocode_provider").notNull(),
    deliveryGeocodedAt: timestamp("delivery_geocoded_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    hasMockCardOnFile: boolean("has_mock_card_on_file").notNull().default(false),
    mockCardBrand: text("mock_card_brand"),
    mockCardLast4: text("mock_card_last4"),
    mockCardAddedAt: timestamp("mock_card_added_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("consumer_profiles_user_unique").on(table.userId)],
);
