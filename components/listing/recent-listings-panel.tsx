import { format, formatDistanceToNowStrict } from "date-fns";

import { listingCategoryLabels } from "@/lib/listings/categories";

type RecentListing = {
  id: string;
  title: string;
  status: string;
  category: string;
  reservePriceCents: number | null;
  buyoutPriceCents: number | null;
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
      return "bg-[#dcefe4] text-[#24543f]";
    case "scheduled":
      return "bg-[#fceac8] text-[#755124]";
    case "draft":
      return "bg-[#efe6dd] text-[#6b4c30]";
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
    <div className="grid gap-3">
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
            <p>
              Package date {listing.packageDate ?? "Pending confirmation"}.
            </p>
            <p>
              {listing.auctionEndsAt
                ? `Auction ends ${format(listing.auctionEndsAt, "MMM d, h:mm a")}.`
                : "Auction timing still needs attention."}
            </p>
            <p className="text-[#8c7358]">
              Updated {formatDistanceToNowStrict(listing.updatedAt, { addSuffix: true })}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
