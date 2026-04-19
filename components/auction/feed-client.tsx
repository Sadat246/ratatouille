"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AuctionCard } from "@/components/auction/auction-card";
import { FeedCardSkeleton } from "@/components/auction/feed-card-skeleton";
import { FilterChipRow } from "@/components/auction/filter-chip-row";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { formatCurrency, formatLocationLabel, formatPackageLabel } from "@/lib/auctions/display";
import type { AuctionFeedItem, SortBy } from "@/lib/auctions/queries";

type FeedClientProps = {
  initialItems: AuctionFeedItem[];
};

const DESKTOP_SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "ending_soon", label: "Ending soon" },
  { value: "nearest", label: "Nearest first" },
  { value: "lowest_price", label: "Lowest price" },
];

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
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const installSentinelRef = useRef<HTMLDivElement>(null);
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

  const isEmpty = !isLoading && items.length === 0;

  return (
    <>
      <FilterChipRow
        sortBy={sortBy}
        onSortChange={handleSortChange}
        selectedCategories={categories}
        onCategoryChange={handleCategoryChange}
      />

      <div className="grid gap-5 pb-32 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:pb-8">
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <FilterChipRow
              sortBy={sortBy}
              onSortChange={handleSortChange}
              selectedCategories={categories}
              onCategoryChange={handleCategoryChange}
              layout="desktop-rail"
            />
          </div>
        </aside>

        <main className="min-w-0">
          <h1 className="sr-only">Nearby Deals</h1>

          <section className="hidden rounded-[2rem] border border-[#eed9ca] bg-[rgba(255,248,239,0.9)] p-5 shadow-[0_22px_70px_rgba(70,40,24,0.08)] lg:block">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#a45631]">
                  Shopper marketplace
                </p>
                <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[#231510]">
                  Scan live lots faster.
                </h2>
                <p className="mt-2 max-w-[38rem] text-sm leading-6 text-[#6d5244]">
                  Desktop shoppers get a denser lot board, clear sort control, and filters that stay in reach while the grid keeps moving.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {DESKTOP_SORT_OPTIONS.map((option) => {
                  const active = sortBy === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSortChange(option.value)}
                      className={`inline-flex min-h-[44px] items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "border-[#f75d36] bg-[#f75d36] text-white"
                          : "border-[#ecd6c7] bg-white/78 text-[#6d5041] hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {categories.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-[#edd6be] bg-[#fff5ed] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f634c]"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-[#ecd8c8] bg-[rgba(255,248,239,0.75)] px-6 py-16 text-center lg:min-h-[26rem]">
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
              <p className="max-w-[32ch] text-sm leading-7 text-[#705446]">
                {categories.length > 0
                  ? `No ${categories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(" + ")} deals nearby. Try All or another category.`
                  : "Active deals show up here when local stores list items. Check back soon — inventory moves fast."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
                  {idx === 2 && <div ref={installSentinelRef} className="h-px" />}
                </div>
              ))}

              {hasMore && <div ref={sentinelRef} className="h-1 md:col-span-2 2xl:col-span-3" />}

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
      </div>

      {showInstallBanner && <InstallPromptBanner />}
    </>
  );
}
