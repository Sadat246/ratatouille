import "server-only";

import {
  AUCTION_SWEEP_BATCH_SIZE,
  AUCTION_SWEEP_INTERVAL_MS,
} from "@/lib/auctions/pricing";
import { sweepOverdueAuctions } from "@/lib/auctions/service";

const globalForAuctionSweep = globalThis as typeof globalThis & {
  __auctionSweepTimer?: ReturnType<typeof setInterval>;
};

async function runSweep() {
  try {
    await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);
  } catch (error) {
    console.error("auction sweep failed", error);
  }
}

export function startAuctionSweepLoop() {
  if (globalForAuctionSweep.__auctionSweepTimer) {
    return;
  }

  void runSweep();

  const timer = setInterval(() => {
    void runSweep();
  }, AUCTION_SWEEP_INTERVAL_MS);

  timer.unref?.();
  globalForAuctionSweep.__auctionSweepTimer = timer;
}
