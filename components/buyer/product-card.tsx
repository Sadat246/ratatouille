"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";

import { AuctionCountdown } from "@/components/auction/auction-countdown";
import { formatCurrency } from "@/lib/auctions/display";

type ProductCardProps = {
  href: string;
  title: string;
  sellerName: string;
  imageUrl?: string | null;
  reservePriceCents: number;
  currentBidCents: number | null;
  buyoutPriceCents: number | null;
  bidCount: number;
  endsAt: Date | string;
  endedAt?: Date | string | null;
  status: string;
  result: string;
  viewerIsLeading?: boolean;
  categoryLabel?: string | null;
  distanceMiles?: number | null;
  packageLabel?: string | null;
  compact?: boolean;
};

export function ProductCard({
  href,
  title,
  sellerName,
  imageUrl,
  reservePriceCents,
  currentBidCents,
  buyoutPriceCents,
  bidCount,
  endsAt,
  endedAt,
  status,
  result,
  viewerIsLeading = false,
  categoryLabel,
  distanceMiles,
  packageLabel,
  compact = false,
}: ProductCardProps) {
  const [favorited, setFavorited] = useState(viewerIsLeading);

  const displayPrice = currentBidCents ?? reservePriceCents;
  const hasDiscount =
    buyoutPriceCents !== null && displayPrice < buyoutPriceCents;
  const discountPct = hasDiscount
    ? Math.round(((buyoutPriceCents! - displayPrice) / buyoutPriceCents!) * 100)
    : null;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#ececec] bg-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#f5f5f5]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(140deg,#f3fbf5_0%,#cbe8d8_48%,#7ab89a_100%)]">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="h-16 w-16 text-white/70" fill="currentColor">
              <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
            </svg>
          </div>
        )}

        {discountPct !== null && discountPct > 0 ? (
          <span className="absolute left-2 top-2 rounded-md bg-[#3d8d5c] px-2 py-1 text-[0.7rem] font-bold text-white shadow">
            -{discountPct}%
          </span>
        ) : null}

        <button
          type="button"
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFavorited((v) => !v);
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#666] shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-colors hover:text-[#3d8d5c]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${favorited ? "text-[#3d8d5c]" : ""}`}
            fill={favorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20s-6.5-4.2-6.5-9.3A3.8 3.8 0 0 1 9.3 7c1.2 0 2.1.4 2.7 1.2A3.3 3.3 0 0 1 14.7 7a3.8 3.8 0 0 1 3.8 3.7C18.5 15.8 12 20 12 20Z" />
          </svg>
        </button>

        {categoryLabel ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.65rem] font-medium text-[#4a4a4a] backdrop-blur">
            {categoryLabel}
          </span>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col gap-2 p-4 ${compact ? "gap-1.5 p-3" : ""}`}>
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
          {sellerName}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-[#1a1a1a]">
          {title}
        </h3>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-[#1a1a1a]">
            {formatCurrency(displayPrice)}
          </span>
          {hasDiscount ? (
            <span className="text-xs font-medium text-[#3d8d5c] line-through decoration-[1.5px]">
              {formatCurrency(buyoutPriceCents)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 text-[0.72rem] text-[#666]">
          <span className="flex items-center gap-1">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 19V9m7 10V5m7 14v-7" />
            </svg>
            {bidCount} bid{bidCount === 1 ? "" : "s"}
          </span>
          {distanceMiles != null ? (
            <span>{distanceMiles.toFixed(1)} mi</span>
          ) : packageLabel ? (
            <span className="truncate">{packageLabel}</span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#f3f3f3] pt-2">
          <AuctionCountdown
            endsAt={endsAt}
            endedAt={endedAt}
            status={status}
            result={result}
          />
          {viewerIsLeading && (status === "active" || status === "scheduled") ? (
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#216348]">
              Winning
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
