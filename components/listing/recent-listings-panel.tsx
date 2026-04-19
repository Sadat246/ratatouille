import { format, formatDistanceToNowStrict } from "date-fns";

import { listingCategoryLabels } from "@/lib/listings/categories";

type RecentListing = {
  id: string;
  title: string;
  status: string;
  category: string;
  reservePriceCents: number | null;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  auctionStatus: string | null;
  auctionResult: string | null;
  auctionBidCount: number | null;
  auctionEndsAt: Date | null;
  packageDate: string | null;
  updatedAt: Date;
};

type RecentListingsPanelProps = {
  listings: RecentListing[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCurrency(cents: number | null) {
  if (cents === null) {
    return "Set pricing";
  }

  return currencyFormatter.format(cents / 100);
}

function getCategoryLabel(category: string) {
  return listingCategoryLabels[category as keyof typeof listingCategoryLabels] ?? "Other";
}

function getStatusTone(status: string) {
  switch (status) {
    case "active":
      return "bg-[#e1edf3] text-[#365c8e]";
    case "scheduled":
      return "bg-[#f5efe1] text-[#7d6a3a]";
    case "draft":
      return "bg-[#f0f0f0] text-[#5a5a5a]";
    case "sold":
      return "bg-[#e6f1ea] text-[#2f6b4d]";
    case "cancelled":
      return "bg-[#f5e3e0] text-[#a14431]";
    case "expired":
      return "bg-[#f0f0f0] text-[#5a5a5a]";
    default:
      return "bg-[#f0f0f0] text-[#5a5a5a]";
  }
}

export function RecentListingsPanel({ listings }: RecentListingsPanelProps) {
  if (!listings.length) {
    return (
      <div className="rounded-[0.85rem] border border-dashed border-[#eaeaea] bg-[#fafafa] px-4 py-5 text-sm leading-6 text-[#6b6b6b]">
        Your first listing will land here once the three-photo desk publishes it.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <article
          key={listing.id}
          className="rounded-[0.85rem] border border-[#eaeaea] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
                {getCategoryLabel(listing.category)}
              </p>
              <h3 className="mt-1.5 truncate text-base font-semibold tracking-tight text-[#1a1a1a]">
                {listing.title}
              </h3>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${getStatusTone(listing.status)}`}
            >
              {listing.status}
            </span>
          </div>

          <div className="mt-4 grid gap-1.5 text-sm leading-6 text-[#5a5a5a]">
            <p>
              Reserve {formatCurrency(listing.reservePriceCents)} · Buyout{" "}
              {formatCurrency(listing.buyoutPriceCents)}
            </p>
            {listing.auctionStatus === "active" ? (
              <p>
                Live at {formatCurrency(listing.currentBidAmountCents)} ·{" "}
                {listing.auctionBidCount ?? 0} bids
              </p>
            ) : null}
            {listing.auctionResult === "winning_bid" || listing.auctionResult === "buyout" ? (
              <p>Sold for {formatCurrency(listing.currentBidAmountCents)}</p>
            ) : null}
            {listing.auctionResult === "cancelled" ? (
              <p>Auction cancelled before settlement</p>
            ) : null}
            <p className="text-[#7a7a7a]">
              Package date {listing.packageDate ?? "Pending confirmation"}
            </p>
            <p className="text-[#7a7a7a]">
              {listing.auctionEndsAt
                ? `Ends ${format(listing.auctionEndsAt, "MMM d, h:mm a")}`
                : "Auction timing pending"}
            </p>
            <p className="text-xs text-[#9a9a9a]">
              Updated {formatDistanceToNowStrict(listing.updatedAt, { addSuffix: true })}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
