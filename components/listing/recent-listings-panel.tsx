import { format, formatDistanceToNowStrict } from "date-fns";

import { coerceDate } from "@/lib/datetime";
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
  auctionEndsAt: Date | string | null;
  packageDate: string | null;
  updatedAt: Date | string;
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
      return "bg-[#dcefe4] text-[#24543f]";
    case "scheduled":
      return "bg-[#fceac8] text-[#755124]";
    case "draft":
      return "bg-[#efe6dd] text-[#6b4c30]";
    case "sold":
      return "bg-[#d8efe3] text-[#20543f]";
    case "cancelled":
      return "bg-[#f5dfd7] text-[#7b3d28]";
    case "expired":
      return "bg-[#e8edf1] text-[#43515e]";
    default:
      return "bg-[#e8edf1] text-[#43515e]";
  }
}

export function RecentListingsPanel({ listings }: RecentListingsPanelProps) {
  if (!listings.length) {
    return (
      <div className="rounded-[1.7rem] border border-dashed border-[#d7cab8] bg-white/70 px-4 py-5 text-sm leading-7 text-[#67584a]">
        Your first listing will land here once the three-photo desk publishes it.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <article
          key={listing.id}
          className="rounded-[1.7rem] border border-[#decfbc] bg-white/88 p-4 shadow-[0_14px_40px_rgba(57,39,25,0.05)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#8d7052]">
                {getCategoryLabel(listing.category)}
              </p>
              <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-[#2a2118]">
                {listing.title}
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${getStatusTone(listing.status)}`}
            >
              {listing.status}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-[#5c4b3b]">
            <p>
              Reserve {formatCurrency(listing.reservePriceCents)}. Buyout{" "}
              {formatCurrency(listing.buyoutPriceCents)}.
            </p>
            {listing.auctionStatus === "active" ? (
              <p>
                Live at {formatCurrency(listing.currentBidAmountCents)} across{" "}
                {listing.auctionBidCount ?? 0} bids.
              </p>
            ) : null}
            {listing.auctionResult === "winning_bid" || listing.auctionResult === "buyout" ? (
              <p>Sold for {formatCurrency(listing.currentBidAmountCents)}.</p>
            ) : null}
            {listing.auctionResult === "cancelled" ? (
              <p>Auction cancelled before settlement.</p>
            ) : null}
            <p>
              Package date {listing.packageDate ?? "Pending confirmation"}.
            </p>
            <p>
              {(() => {
                const ends = coerceDate(listing.auctionEndsAt);
                return ends
                  ? `Auction ends ${format(ends, "MMM d, h:mm a")}.`
                  : "Auction timing still needs attention.";
              })()}
            </p>
            <p className="text-[#8c7358]">
              Updated{" "}
              {(() => {
                const u = coerceDate(listing.updatedAt);
                return u
                  ? formatDistanceToNowStrict(u, { addSuffix: true })
                  : "recently";
              })()}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
