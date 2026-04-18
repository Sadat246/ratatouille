import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { schema } from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

export const db = drizzle(getRequiredEnv("DATABASE_URL"), { schema });

export function getDb() {
  return db;
}
