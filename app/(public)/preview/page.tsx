import type { Metadata } from "next";

import { PreviewGrid } from "@/components/preview/preview-grid";
import { PreviewShell } from "@/components/preview/preview-shell";
import { getAuctionFeed } from "@/lib/auctions/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live preview",
  description:
    "A read-only look at what local stores are listing right now on Ratatouille.",
  robots: { index: false, follow: false },
};

export default async function PreviewPage() {
  // Read-only on purpose: no viewer id, and no overdue-auction sweep (that is
  // a write path and must never be reachable by anonymous traffic).
  const items = await getAuctionFeed({
    sortBy: "ending_soon",
    limit: 12,
    offset: 0,
  });

  return (
    <PreviewShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Listed right now
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Sorted by ending soonest. This is a read-only snapshot; bidding
          requires signing in.
        </p>
      </div>

      {items.length === 0 ? (
        <section
          data-preview-empty
          className="flex flex-col items-center gap-3 rounded-2xl border border-[#ececec] bg-[#fafafa] px-6 py-16 text-center"
        >
          <p className="text-lg font-semibold tracking-[-0.02em]">
            No items are listed right now.
          </p>
          <p className="max-w-[48ch] text-sm leading-6 text-[#666]">
            Stores list sealed near-date items during the day; check back
            later.
          </p>
          <p className="max-w-[48ch] text-sm leading-6 text-[#666]">
            Ratatouille is a marketplace where grocery stores put sealed,
            soon-to-expire stock up for nearby shoppers to bid on or buy
            outright, then pick up.
          </p>
        </section>
      ) : (
        <PreviewGrid items={items} />
      )}
    </PreviewShell>
  );
}
