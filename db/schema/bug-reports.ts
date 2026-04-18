import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export const bugReportReporterRoleEnum = pgEnum("bug_report_reporter_role", [
  "anonymous",
  "consumer",
  "business",
]);

export const bugReports = pgTable(
  "bug_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull(),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reporterRole: bugReportReporterRoleEnum("reporter_role")
      .notNull()
      .default("anonymous"),
    pageUrl: text("page_url").notNull(),
    pagePath: text("page_path").notNull(),
    viewport: text("viewport").notNull(),
    userAgent: text("user_agent"),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    markdown: text("markdown").notNull(),
    screenshotDataUrl: text("screenshot_data_url"),
    captureError: text("capture_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("bug_reports_public_id_unique").on(table.publicId),
    index("bug_reports_created_at_idx").on(table.createdAt),
    index("bug_reports_reporter_role_idx").on(table.reporterRole),
  ],
);
