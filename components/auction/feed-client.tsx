"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AuctionCard } from "@/components/auction/auction-card";
import { FeedCardSkeleton } from "@/components/auction/feed-card-skeleton";
import { FilterChipRow } from "@/components/auction/filter-chip-row";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { formatCurrency, formatLocationLabel, formatPackageLabel } from "@/lib/auctions/display";
import type { AuctionFeedItem } from "@/lib/auctions/queries";

type SortBy = "ending_soon" | "nearest" | "lowest_price";

type FeedClientProps = {
  initialItems: AuctionFeedItem[];
};

export function FeedClient({ initialItems }: FeedClientProps) {
  const [items, setItems] = useState<AuctionFeedItem[]>(initialItems);
  const [offset, setOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length >= 12);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("ending_soon");
  const [categories, setCategories] = useState<string[]>([]);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const installSentinelRef = useRef<HTMLDivElement>(null);
  const skipNextFilterReset = useRef(true);

  const loadMore = useCallback(
    async (
      currentOffset: number,
      currentSortBy: SortBy,
      currentCategories: string[],
      append: boolean,
    ) => {
      if (isLoading) return;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          offset: String(currentOffset),
          sortBy: currentSortBy,
        });
        for (const cat of currentCategories) {
          params.append("category", cat);
        }

        const res = await fetch(`/api/auctions/feed?${params.toString()}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as
          | { ok: true; items: AuctionFeedItem[]; nextOffset: number | null; hasMore: boolean }
          | { ok: false; error: string };

        if (!res.ok || !data.ok) {
          return;
        }

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setOffset(data.nextOffset ?? currentOffset + data.items.length);
        setHasMore(data.hasMore);
      } catch {
        // silent — no crash on network error
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && hasMore) {
          void loadMore(offset, sortBy, categories, true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, isLoading, sortBy, categories]);

  // Install banner sentinel — show after 3rd card
  useEffect(() => {
    const el = installSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShowInstallBanner(true);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset on filter/sort change (skip initial mount — server already provided `initialItems`)
  useEffect(() => {
    if (skipNextFilterReset.current) {
      skipNextFilterReset.current = false;
      return;
    }
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setItems([]);
      setOffset(0);
      setHasMore(true);
      void loadMore(0, sortBy, categories, false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, categories]);

  const isEmpty = !isLoading && items.length === 0;

  return (
    <>
      <FilterChipRow
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedCategories={categories}
        onCategoryChange={setCategories}
      />

      <main className="px-4 pb-32">
        <h1 className="sr-only">Nearby Deals</h1>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <svg
              className="h-16 w-16 text-[#dfc9b6]"
              fill="none"
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" />
              <path
                d="M20 36 Q32 44 44 36"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="24" cy="28" r="2.5" fill="currentColor" />
              <circle cx="40" cy="28" r="2.5" fill="currentColor" />
            </svg>
            <p className="text-xl font-semibold tracking-[-0.04em] text-[#22130e]">
              Nothing nearby right now
            </p>
            <p className="max-w-[28ch] text-sm leading-7 text-[#705446]">
              {categories.length > 0
                ? `No ${categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(" + ")} deals nearby. Try All or another category.`
                : "Active deals show up here when local stores list items. Check back soon — inventory moves fast."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((auction, idx) => (
              <div key={auction.id}>
                <AuctionCard
                  href={`/shop/${auction.id}`}
                  eyebrow={auction.business.name}
                  title={auction.listing.title}
                  description={auction.listing.description}
                  imageUrl={auction.listing.imageUrl}
                  metrics={[
                    {
                      label: "Current",
                      value: formatCurrency(
                        auction.currentBidAmountCents ?? auction.reservePriceCents,
                      ),
                    },
                    {
                      label: "Buyout",
                      value: formatCurrency(auction.buyoutPriceCents),
                    },
                    {
                      label: "Bids",
                      value: String(auction.bidCount),
                    },
                  ]}
                  footerLines={[
                    formatLocationLabel(auction.business.city, auction.business.state),
                    formatPackageLabel(auction.listing.packageDate),
                  ].filter(Boolean)}
                  distanceMiles={auction.distanceMiles}
                  categoryBadge={auction.listing.category}
                  endsAt={auction.scheduledEndAt}
                  status={auction.status}
                  result={auction.result}
                  badge={
                    auction.viewerIsLeading
                      ? { label: "Winning", tone: "green" }
                      : undefined
                  }
                />
                {/* Install banner sentinel — after 3rd card */}
                {idx === 2 && <div ref={installSentinelRef} className="h-px" />}
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-1" />}

            {/* Loading skeletons */}
            {isLoading && (
              <>
                <FeedCardSkeleton />
                <FeedCardSkeleton />
                <FeedCardSkeleton />
              </>
            )}
          </div>
        )}
      </main>

      {showInstallBanner && <InstallPromptBanner />}
    </>
  );
}
