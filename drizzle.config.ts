import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/*.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(migrationUrl
    ? {
        dbCredentials: {
          url: migrationUrl,
        },
      }
    : {}),
});
