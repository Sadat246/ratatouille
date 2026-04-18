import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { schema } from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

function createInteractiveDb() {
  neonConfig.webSocketConstructor = WebSocket;

  const pool = new Pool({
    connectionString: getRequiredEnv("DATABASE_URL"),
  });

  pool.on("error", (error: Error) => {
    console.error("interactive db pool error", error);
  });

  return drizzle(pool, { schema });
}

type InteractiveDatabase = ReturnType<typeof createInteractiveDb>;

const globalForInteractiveDb = globalThis as typeof globalThis & {
  __interactiveAuctionDb?: InteractiveDatabase;
};

export function getInteractiveDb() {
  if (!globalForInteractiveDb.__interactiveAuctionDb) {
    // The production app runs as one long-lived Node process, so a shared pool is fine.
    globalForInteractiveDb.__interactiveAuctionDb = createInteractiveDb();
  }

  return globalForInteractiveDb.__interactiveAuctionDb;
}
