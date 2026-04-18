import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { schema } from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

export function getDb() {
  return drizzle(getRequiredEnv("DATABASE_URL"), { schema });
}
