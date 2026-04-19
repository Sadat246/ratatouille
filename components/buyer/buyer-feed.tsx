"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CategoryStrip } from "@/components/buyer/category-strip";
import { EndingSoonRail } from "@/components/buyer/ending-soon-rail";
import { ProductCard } from "@/components/buyer/product-card";
import {
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";
import type { AuctionFeedItem, SortBy } from "@/lib/auctions/queries";
import { listingCategoryLabels } from "@/lib/listings/categories";

type BuyerFeedProps = {
  initialItems: AuctionFeedItem[];
  initialQuery?: string;
};

const TABS: { value: SortBy; label: string }[] = [
  { value: "ending_soon", label: "Ending Soon" },
  { value: "nearest", label: "Nearest" },
  { value: "lowest_price", label: "Lowest Price" },
];

function sameCategories(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function BuyerFeed({ initialItems, initialQuery = "" }: BuyerFeedProps) {
  const [items, setItems] = useState<AuctionFeedItem[]>(initialItems);
  const [offset, setOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length >= 12);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("ending_soon");
  const [categories, setCategories] = useState<string[]>([]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const offsetRef = useRef(offset);
  const sortByRef = useRef(sortBy);
  const categoriesRef = useRef(categories);
  offsetRef.current = offset;
  sortByRef.current = sortBy;
  categoriesRef.current = categories;

  const loadMore = useCallback(
    async (
      currentOffset: number,
      currentSort: SortBy,
      currentCats: string[],
      append: boolean,
    ) => {
      if (isLoadingRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          offset: String(currentOffset),
          sortBy: currentSort,
        });
        for (const cat of currentCats) params.append("category", cat);

        const res = await fetch(`/api/auctions/feed?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await res.json()) as
          | {
              ok: true;
              items: AuctionFeedItem[];
              nextOffset: number | null;
              hasMore: boolean;
            }
          | { ok: false; error: string };

        if (!res.ok || !data.ok) return;

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setOffset(data.nextOffset ?? currentOffset + data.items.length);
        setHasMore(data.hasMore);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const reset = useCallback(
    (nextSort: SortBy, nextCats: string[]) => {
      abortRef.current?.abort();
      abortRef.current = null;
      isLoadingRef.current = false;
      setIsLoading(false);
      setItems([]);
      setOffset(0);
      setHasMore(true);
      void loadMore(0, nextSort, nextCats, false);
    },
    [loadMore],
  );

  const handleSort = useCallback(
    (next: SortBy) => {
      if (next === sortBy) return;
      setSortBy(next);
      reset(next, categories);
    },
    [categories, reset, sortBy],
  );

  const handleCategories = useCallback(
    (next: string[]) => {
      if (sameCategories(next, categories)) return;
      setCategories(next);
      reset(sortBy, next);
    },
    [categories, reset, sortBy],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
          void loadMore(
            offsetRef.current,
            sortByRef.current,
            categoriesRef.current,
            true,
          );
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const filtered = useMemo(() => {
    const q = initialQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const haystack = [
        it.listing.title,
        it.listing.description ?? "",
        it.business.name,
        it.business.city ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, initialQuery]);

  const endingSoon = useMemo(() => {
    return [...items]
      .filter((it) => it.status === "active" || it.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledEndAt).getTime() -
          new Date(b.scheduledEndAt).getTime(),
      )
      .slice(0, 8);
  }, [items]);

  const isEmpty = !isLoading && filtered.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <CategoryStrip
        selectedCategories={categories}
        onCategoryChange={handleCategories}
      />

      <EndingSoonRail items={endingSoon} />

      <section
        id="deals-for-you"
        className="rounded-2xl border border-[#ececec] bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
            Today&apos;s Deals For You
          </h2>
          <div
            className="flex flex-wrap gap-2"
            role="toolbar"
            aria-label="Sort deals"
          >
            {TABS.map((tab) => {
              const active = sortBy === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleSort(tab.value)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#1a1a1a] text-white"
                      : "border border-[#e4e4e4] bg-white text-[#4a4a4a] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {initialQuery.trim() ? (
          <p className="mt-3 text-sm text-[#666]">
            Showing results for{" "}
            <span className="font-semibold text-[#1a1a1a]">
              &ldquo;{initialQuery}&rdquo;
            </span>{" "}
            ({filtered.length})
          </p>
        ) : null}

        {isEmpty ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              className="h-14 w-14 text-[#dcdcdc]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="28" cy="28" r="20" />
              <path d="m44 44 12 12" strokeLinecap="round" />
            </svg>
            <p className="text-lg font-semibold text-[#1a1a1a]">
              {initialQuery
                ? "No matches"
                : categories.length > 0
                  ? "No deals in that category right now"
                  : "Nothing nearby right now"}
            </p>
            <p className="max-w-[36ch] text-sm leading-6 text-[#666]">
              {initialQuery
                ? "Try a different keyword or clear the filters."
                : "Inventory moves fast — new lots appear when local stores list expiring stock."}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((auction) => (
                <ProductCard
                  key={auction.id}
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
                />
              ))}

              {isLoading && (
                <>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={`skel-${i}`}
                      className="animate-pulse overflow-hidden rounded-2xl border border-[#ececec] bg-white"
                    >
                      <div className="aspect-square w-full bg-[#f0f0f0]" />
                      <div className="space-y-2 p-4">
                        <div className="h-3 w-1/3 rounded-full bg-[#f0f0f0]" />
                        <div className="h-4 w-2/3 rounded-full bg-[#f0f0f0]" />
                        <div className="h-5 w-1/2 rounded-full bg-[#f0f0f0]" />
                      </div>
                    </div>
                  ))}
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
