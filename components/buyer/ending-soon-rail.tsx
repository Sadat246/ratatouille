"use client";

import { useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/buyer/product-card";
import {
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";
import type { AuctionFeedItem } from "@/lib/auctions/queries";
import { listingCategoryLabels } from "@/lib/listings/categories";

type EndingSoonRailProps = {
  items: AuctionFeedItem[];
};

function getNearestEndMs(items: AuctionFeedItem[]) {
  let nearest = Infinity;
  for (const item of items) {
    if (item.status !== "active" && item.status !== "scheduled") continue;
    const t = new Date(item.scheduledEndAt).getTime();
    if (t < nearest) nearest = t;
  }
  return nearest === Infinity ? null : nearest;
}

function formatPair(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0"));
}

export function EndingSoonRail({ items }: EndingSoonRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  /** Match AuctionCountdown: no ticking until mounted — avoids useSyncExternalStore hydration mismatch (server 0 vs client Date.now()). */
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  const nearestEnd = getNearestEndMs(items);
  const remainingMs =
    mounted && nearestEnd ? Math.max(0, nearestEnd - now) : 0;
  const [hh, mm, ss] = formatPair(remainingMs);

  function scrollBy(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    const cardWidth = 240;
    el.scrollBy({ left: cardWidth * 2 * direction, behavior: "smooth" });
  }

  return (
    <section
      id="ending-soon"
      className="rounded-2xl border border-[#ececec] bg-white p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f75d36] text-white">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M13 3 4 14h6l-1 7 9-11h-6Z" />
            </svg>
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
            Ending Soon
          </h2>
          {nearestEnd ? (
            <div className="hidden items-center gap-1 sm:flex" suppressHydrationWarning>
              {!mounted ? (
                <span className="text-xs font-medium text-[#9a9a9a]">—</span>
              ) : (
                [hh, mm, ss].map((unit, idx) => (
                  <span
                    key={idx}
                    className="flex h-7 min-w-[28px] items-center justify-center rounded-md bg-[#f75d36] px-1.5 text-xs font-bold text-white"
                  >
                    {unit}
                  </span>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e4e4e4] text-[#4a4a4a] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a] text-white transition-colors hover:bg-[#f75d36]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((auction) => (
          <div
            key={auction.id}
            className="w-[240px] flex-shrink-0 snap-start sm:w-[260px]"
          >
            <ProductCard
              href={`/shop/${auction.id}`}
              title={auction.listing.title}
              sellerName={auction.business.name}
              imageUrl={auction.listing.imageUrl}
              reservePriceCents={auction.reservePriceCents}
              currentBidCents={auction.currentBidAmountCents}
              buyoutPriceCents={auction.buyoutPriceCents}
              bidCount={auction.bidCount}
              endsAt={auction.scheduledEndAt}
              status={auction.status}
              result={auction.result}
              viewerIsLeading={auction.viewerIsLeading}
              categoryLabel={
                auction.listing.category
                  ? listingCategoryLabels[
                      auction.listing.category as keyof typeof listingCategoryLabels
                    ] ?? auction.listing.category
                  : null
              }
              distanceMiles={auction.distanceMiles}
              packageLabel={
                auction.listing.packageDate
                  ? formatPackageLabel(auction.listing.packageDate)
                  : formatLocationLabel(
                      auction.business.city,
                      auction.business.state,
                    )
              }
              compact
            />
          </div>
        ))}
      </div>
    </section>
  );
}
