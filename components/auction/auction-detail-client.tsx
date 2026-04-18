"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";

import { AuctionBidPanel } from "@/components/auction/auction-bid-panel";
import { AuctionCountdown } from "@/components/auction/auction-countdown";
import { ListingPhotoCarousel } from "@/components/auction/listing-photo-carousel";
import { MockCardPanel } from "@/components/auction/mock-card-panel";
import {
  formatAuctionResultLabel,
  formatCurrency,
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";

type AuctionDetailViewer = {
  hasMockCardOnFile: boolean;
  mockCardBrand: string | null;
  mockCardLast4: string | null;
  isLeading: boolean;
  myBidCount: number;
  myTopBidAmountCents: number | null;
  minimumNextBidAmountCents: number;
} | null;

type AuctionDetailState = {
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
  viewer: AuctionDetailViewer;
};

type AuctionDetailClientProps = {
  initialAuction: AuctionDetailState;
  distanceMiles?: number | null;
};

function buildResultNote(auction: AuctionDetailState) {
  if (auction.status === "active" || auction.status === "scheduled") {
    return "Anonymous bidding stays visible as price, timer, and bid pressure only.";
  }

  if (auction.result === "winning_bid" || auction.result === "buyout") {
    return `Final sale price ${formatCurrency(auction.currentBidAmountCents)}.`;
  }

  if (auction.result === "cancelled") {
    return "This auction was cancelled before settlement.";
  }

  return "This auction ended without a sale.";
}

export function AuctionDetailClient({
  initialAuction,
  distanceMiles,
}: AuctionDetailClientProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshAuction = useEffectEvent(async () => {
    try {
      const response = await fetch(`/api/auctions/${auction.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | {
            ok: true;
            auction: AuctionDetailState;
          }
        | {
            ok: false;
            error: {
              message: string;
            };
          };

      if (!response.ok || !data.ok) {
        setRefreshError(
          data.ok ? "Live refresh failed." : data.error.message,
        );
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

    const timer = window.setInterval(() => {
      void refreshAuction();
    }, 12_000);

    return () => window.clearInterval(timer);
  }, [auction.id, auction.status]);

  const resultLabel = formatAuctionResultLabel(auction.status, auction.result);

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-[2.4rem] border border-[#ffd8c5] bg-[linear-gradient(160deg,#fff2e4_0%,#ffd7ad_48%,#f87d4f_100%)] p-5 text-[#271712] shadow-[0_26px_90px_rgba(146,68,30,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f4a2d]">
              {auction.business.name}
            </p>
            <h1 className="mt-3 max-w-[12ch] text-[clamp(2.2rem,8vw,3.5rem)] leading-[0.94] font-semibold tracking-[-0.05em]">
              {auction.listing.title}
            </h1>
          </div>
          <AuctionCountdown
            endsAt={auction.scheduledEndAt}
            endedAt={auction.endedAt}
            status={auction.status}
            result={auction.result}
            size="lg"
          />
        </div>

        <div className="mt-5">
          <ListingPhotoCarousel images={auction.listing.images} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-[1.5rem] bg-white/80 p-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#8b5a45]">
              Current
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">
              {formatCurrency(auction.currentBidAmountCents)}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white/80 p-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#8b5a45]">
              Reserve
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">
              {formatCurrency(auction.reservePriceCents)}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white/80 p-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#8b5a45]">
              Buyout
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">
              {formatCurrency(auction.buyoutPriceCents)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_60px_rgba(64,34,20,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f8ede6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a5338]">
            {resultLabel}
          </span>
          <span className="rounded-full bg-[#eef6f1] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#285f48]">
            {auction.bidCount} total bids
          </span>
          {auction.viewer?.isLeading ? (
            <span className="rounded-full bg-[#eaf8ef] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#256145]">
              You&apos;re leading
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-7 text-[#5d473c]">
          {auction.listing.description || buildResultNote(auction)}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#ebd9ce] px-3 py-1.5 text-xs text-[#6e5142]">
            {formatLocationLabel(auction.business.city, auction.business.state)}
          </span>
          <span className="rounded-full border border-[#ebd9ce] px-3 py-1.5 text-xs text-[#6e5142]">
            {formatPackageLabel(auction.listing.packageDate)}
          </span>
          {distanceMiles != null && (
            <span className="rounded-full border border-[#ebd9ce] px-3 py-1.5 text-xs text-[#6e5142]">
              {distanceMiles.toFixed(1)} mi away
            </span>
          )}
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
                minimumNextBidAmountCents: auction.viewer.minimumNextBidAmountCents,
              }
            : null
        }
        onAuctionChange={(nextAuction) => {
          startTransition(() => {
            setAuction(nextAuction as AuctionDetailState);
          });
        }}
      />

      <section className="rounded-[2rem] border border-[#d9e6de] bg-[rgba(241,248,244,0.92)] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#5c7c6c]">
          Pickup flow
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#183327]">
          {auction.business.pickupHours || "Pickup timing lands after settlement"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#456255]">
          {auction.business.pickupInstructions ||
            "The business publishes pickup details after the sale clears. This page keeps the auction pressure front and center until then."}
        </p>
      </section>

      {refreshError ? (
        <p className="text-sm font-medium text-[#b3431b]">{refreshError}</p>
      ) : null}
    </div>
  );
}
