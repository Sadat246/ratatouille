"use client";

import Link from "next/link";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

import { AuctionBidPanel } from "@/components/auction/auction-bid-panel";
import { AuctionCountdown } from "@/components/auction/auction-countdown";
import { MockCardPanel } from "@/components/auction/mock-card-panel";
import { ListingGallery } from "@/components/buyer/listing-gallery";
import {
  formatAuctionResultLabel,
  formatCurrency,
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";

type ListingDetailViewer = {
  hasMockCardOnFile: boolean;
  mockCardBrand: string | null;
  mockCardLast4: string | null;
  isLeading: boolean;
  myBidCount: number;
  myTopBidAmountCents: number | null;
  minimumNextBidAmountCents: number;
} | null;

type ListingDetailState = {
  id: string;
  status: string;
  result: string;
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  bidCount: number;
  scheduledEndAt: Date | string;
  endedAt: Date | string | null;
  listing: {
    title: string;
    description: string | null;
    packageDate: string | null;
    images: string[];
  };
  business: {
    name: string;
    city: string | null;
    state: string | null;
    pickupHours: string | null;
    pickupInstructions: string | null;
  };
  viewer: ListingDetailViewer;
};

type ListingDetailClientProps = {
  initialAuction: ListingDetailState;
  distanceMiles?: number | null;
};

export function ListingDetailClient({
  initialAuction,
  distanceMiles,
}: ListingDetailClientProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshAuction = useEffectEvent(async () => {
    try {
      const response = await fetch(`/api/auctions/${auction.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | { ok: true; auction: ListingDetailState }
        | { ok: false; error: { message: string } };

      if (!response.ok || !data.ok) {
        setRefreshError(data.ok ? "Live refresh failed." : data.error.message);
        return;
      }

      startTransition(() => {
        setAuction(data.auction);
      });
      setRefreshError(null);
    } catch {
      setRefreshError("Live refresh failed. Pull to retry.");
    }
  });

  useEffect(() => {
    if (auction.status !== "active" && auction.status !== "scheduled") {
      return undefined;
    }
    const timer = window.setInterval(() => void refreshAuction(), 12_000);
    return () => window.clearInterval(timer);
  }, [auction.id, auction.status]);

  const open = auction.status === "active" || auction.status === "scheduled";
  const resultLabel = formatAuctionResultLabel(auction.status, auction.result);
  const displayPrice =
    auction.currentBidAmountCents ?? auction.reservePriceCents;
  const hasDiscount =
    auction.buyoutPriceCents !== null && displayPrice < auction.buyoutPriceCents;
  const discountPct = hasDiscount
    ? Math.round(
        ((auction.buyoutPriceCents! - displayPrice) /
          auction.buyoutPriceCents!) *
          100,
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-medium text-[#666]"
      >
        <Link href="/shop" className="hover:text-[#f75d36]">
          Shop
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/shop" className="hover:text-[#f75d36]">
          {auction.business.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-[#1a1a1a]">{auction.listing.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_1.05fr)_minmax(360px,_1fr)]">
        <div className="flex flex-col gap-4">
          <ListingGallery images={auction.listing.images} />

          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              About this lot
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4a4a4a]">
              {auction.listing.description ||
                "The seller hasn't added extra notes for this lot. The fundamentals — title, expiry, pickup — are above."}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#f0f0f0] pt-5 sm:grid-cols-3">
              <div>
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                  Pickup location
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                  {formatLocationLabel(
                    auction.business.city,
                    auction.business.state,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                  Best by
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                  {formatPackageLabel(auction.listing.packageDate)}
                </dd>
              </div>
              {distanceMiles != null ? (
                <div>
                  <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                    Distance
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                    {distanceMiles.toFixed(1)} mi
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                  Total bids
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                  {auction.bidCount}
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                  Reserve price
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                  {formatCurrency(auction.reservePriceCents)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                  Status
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                  {resultLabel}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#fff5ef] text-[#f75d36]">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7h11v8H3Zm11 2h3l2 2v4h-5" />
                  <circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="18" cy="17" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-[#1a1a1a]">
                  Pickup details
                </h2>
                <p className="mt-1 text-sm font-medium text-[#1a1a1a]">
                  {auction.business.pickupHours ||
                    "Pickup window confirmed after sale"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4a4a4a]">
                  {auction.business.pickupInstructions ||
                    "The seller publishes pickup details once the auction settles. You'll be notified the moment the timer ends."}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9a9a9a]">
              {auction.business.name}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-[1.7rem]">
              {auction.listing.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  open
                    ? "bg-[#fff0eb] text-[#9f3a20]"
                    : "bg-[#f3f3f3] text-[#4a4a4a]"
                }`}
              >
                {open ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f75d36]" />
                ) : null}
                {resultLabel}
              </span>
              <span className="rounded-full bg-[#f5f5f5] px-2.5 py-1 text-xs font-medium text-[#4a4a4a]">
                {auction.bidCount} bids
              </span>
              {auction.viewer?.isLeading && open ? (
                <span className="rounded-full bg-[#e9f7ee] px-2.5 py-1 text-xs font-semibold text-[#216348]">
                  You&apos;re winning
                </span>
              ) : null}
            </div>

            <div className="mt-5 rounded-xl bg-[#fafafa] p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9a9a9a]">
                {open ? "Current bid" : "Final price"}
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl font-bold tracking-tight text-[#1a1a1a]">
                  {formatCurrency(displayPrice)}
                </span>
                {hasDiscount ? (
                  <>
                    <span className="text-sm font-medium text-[#9a9a9a] line-through">
                      {formatCurrency(auction.buyoutPriceCents)}
                    </span>
                    {discountPct ? (
                      <span className="rounded bg-[#f75d36] px-1.5 py-0.5 text-[0.7rem] font-bold text-white">
                        -{discountPct}%
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[#666]">
                Reserve {formatCurrency(auction.reservePriceCents)}
                {auction.buyoutPriceCents != null
                  ? ` · Buy-now ${formatCurrency(auction.buyoutPriceCents)}`
                  : ""}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9a9a9a]">
                  {open ? "Time left" : "Ended"}
                </span>
                <AuctionCountdown
                  endsAt={auction.scheduledEndAt}
                  endedAt={auction.endedAt}
                  status={auction.status}
                  result={auction.result}
                  size="lg"
                />
              </div>
            </div>
          </section>

          {!auction.viewer?.hasMockCardOnFile ? (
            <MockCardPanel
              variant="compact"
              initialMockCard={{
                enabled: false,
                brand: auction.viewer?.mockCardBrand ?? null,
                last4: auction.viewer?.mockCardLast4 ?? null,
              }}
              onChange={(mockCard) => {
                startTransition(() => {
                  setAuction((current) => ({
                    ...current,
                    viewer: current.viewer
                      ? {
                          ...current.viewer,
                          hasMockCardOnFile: mockCard.enabled,
                          mockCardBrand: mockCard.brand,
                          mockCardLast4: mockCard.last4,
                        }
                      : current.viewer,
                  }));
                });
              }}
            />
          ) : null}

          <AuctionBidPanel
            auctionId={auction.id}
            status={auction.status}
            result={auction.result}
            reservePriceCents={auction.reservePriceCents}
            buyoutPriceCents={auction.buyoutPriceCents}
            viewer={
              auction.viewer
                ? {
                    hasMockCardOnFile: auction.viewer.hasMockCardOnFile,
                    isLeading: auction.viewer.isLeading,
                    minimumNextBidAmountCents:
                      auction.viewer.minimumNextBidAmountCents,
                  }
                : null
            }
            onAuctionChange={(nextAuction) => {
              startTransition(() => {
                setAuction(nextAuction as ListingDetailState);
              });
            }}
          />

          <section className="rounded-2xl border border-[#ececec] bg-white p-4 text-xs text-[#666]">
            <div className="flex items-start gap-3">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4a4a4a]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l3 2" />
              </svg>
              <p>
                Bidding is anonymous. The highest authorized bid when the timer
                hits zero wins — or anyone can buy out instantly. Your card is
                only charged when you win or buy out.
              </p>
            </div>
          </section>
        </aside>
      </div>

      {refreshError ? (
        <p className="text-sm font-medium text-[#b3431b]">{refreshError}</p>
      ) : null}
    </div>
  );
}
