import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "consumer",
  "business",
  "admin",
]);

export const membershipRoleEnum = pgEnum("business_membership_role", [
  "owner",
  "manager",
  "staff",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  preferredRole: userRoleEnum("preferred_role"),
  googleSubject: text("google_subject").unique(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
