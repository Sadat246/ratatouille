import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { schema } from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

// neon-http does not support transactions; WebSocket Pool does (see Neon + Drizzle guide).
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: getRequiredEnv("DATABASE_URL") });

export const db = drizzle(pool, { schema });

export function getDb() {
  return db;
}
