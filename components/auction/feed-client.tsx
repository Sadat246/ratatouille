"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AuctionCard } from "@/components/auction/auction-card";
import { FeedCardSkeleton } from "@/components/auction/feed-card-skeleton";
import { FilterChipRow } from "@/components/auction/filter-chip-row";
import { formatCurrency, formatLocationLabel, formatPackageLabel } from "@/lib/auctions/display";
import type { AuctionFeedItem, SortBy } from "@/lib/auctions/queries";

type FeedClientProps = {
  initialItems: AuctionFeedItem[];
};

function haveSameCategories(nextCategories: string[], currentCategories: string[]) {
  return (
    nextCategories.length === currentCategories.length &&
    nextCategories.every((category, index) => category === currentCategories[index])
  );
}

export function FeedClient({ initialItems }: FeedClientProps) {
  const [items, setItems] = useState<AuctionFeedItem[]>(initialItems);
  const [offset, setOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length >= 12);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("ending_soon");
  const [categories, setCategories] = useState<string[]>([]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadMore = useCallback(
    async (
      currentOffset: number,
      currentSortBy: SortBy,
      currentCategories: string[],
      append: boolean,
    ) => {
      if (isLoadingRef.current) return;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isLoadingRef.current = true;
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
          signal: controller.signal,
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
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        // silent — no crash on network error
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const resetFeed = useCallback(
    (nextSortBy: SortBy, nextCategories: string[]) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isLoadingRef.current = false;
      setIsLoading(false);
      setItems([]);
      setOffset(0);
      setHasMore(true);
      void loadMore(0, nextSortBy, nextCategories, false);
    },
    [loadMore],
  );

  const handleSortChange = useCallback(
    (nextSortBy: SortBy) => {
      if (nextSortBy === sortBy) {
        return;
      }

      setSortBy(nextSortBy);
      resetFeed(nextSortBy, categories);
    },
    [categories, resetFeed, sortBy],
  );

  const handleCategoryChange = useCallback(
    (nextCategories: string[]) => {
      if (haveSameCategories(nextCategories, categories)) {
        return;
      }

      setCategories(nextCategories);
      resetFeed(sortBy, nextCategories);
    },
    [categories, resetFeed, sortBy],
  );

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
          void loadMore(offset, sortBy, categories, true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [categories, hasMore, loadMore, offset, sortBy]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <FilterChipRow
        sortBy={sortBy}
        onSortChange={handleSortChange}
        selectedCategories={categories}
        onCategoryChange={handleCategoryChange}
      />

      <section>
        <h1 className="sr-only">Nearby Deals</h1>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
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
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((auction) => (
                <AuctionCard
                  key={auction.id}
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
              ))}

              {isLoading && (
                <>
                  <FeedCardSkeleton />
                  <FeedCardSkeleton />
                  <FeedCardSkeleton />
                </>
              )}
            </div>

            {hasMore && <div ref={sentinelRef} className="mt-4 h-1" />}
          </>
        )}
      </section>
    </div>
  );
}
