import Link from "next/link";

import { AuctionCountdown } from "@/components/auction/auction-countdown";
import { ListingGallery } from "@/components/buyer/listing-gallery";
import {
  formatCurrency,
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";
import type { AuctionDetail } from "@/lib/auctions/queries";

type PreviewDetailProps = {
  auction: AuctionDetail;
};

/**
 * Read-only public detail view. Server component: the only client code on the
 * page is ListingGallery (carousel) and AuctionCountdown (timer), which own
 * their state internally. Deliberately renders only a whitelist of fields:
 * seller name, city/state and pickup hours. Nothing free-text from the seller's
 * profile beyond that, and no bidder or viewer data.
 */
export function PreviewDetail({ auction }: PreviewDetailProps) {
  const displayPrice =
    auction.currentBidAmountCents ?? auction.reservePriceCents;
  const hasDiscount =
    auction.buyoutPriceCents !== null && displayPrice < auction.buyoutPriceCents;
  const discountPct =
    hasDiscount && auction.buyoutPriceCents
      ? Math.round(
          ((auction.buyoutPriceCents - displayPrice) /
            auction.buyoutPriceCents) *
            100,
        )
      : null;

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-medium text-[#666]"
      >
        <Link href="/preview" className="hover:text-[#3d8d5c]">
          Live preview
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-[#1a1a1a]">{auction.listing.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_1.05fr)_minmax(360px,_1fr)]">
        <div className="flex flex-col gap-4">
          <ListingGallery images={auction.listing.images} />

          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              About this item
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4a4a4a]">
              {auction.listing.description ||
                "The seller hasn't added extra notes for this item."}
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
              <div>
                <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-[#9a9a9a]">
                  Total bids
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#1a1a1a]">
                  {auction.bidCount}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <h2 className="text-base font-semibold text-[#1a1a1a]">
              In-store pickup
            </h2>
            <p className="mt-1 text-sm font-medium text-[#1a1a1a]">
              {auction.business.pickupHours ||
                "Pickup window confirmed after sale"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4a4a4a]">
              Pickup is in store only. The store shares the exact spot and any
              details with the shopper who wins the item.
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9a9a9a]">
              {auction.business.name}
              <span className="font-medium normal-case tracking-normal">
                {" · "}
                {formatLocationLabel(
                  auction.business.city,
                  auction.business.state,
                )}
              </span>
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-[1.7rem]">
              {auction.listing.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f1ea] px-2.5 py-1 text-xs font-semibold text-[#1e5a37]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3d8d5c]" />
                Live
              </span>
              <span className="rounded-full bg-[#f5f5f5] px-2.5 py-1 text-xs font-medium text-[#4a4a4a]">
                {auction.bidCount} bids
              </span>
            </div>

            <div className="mt-5 rounded-xl bg-[#fafafa] p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9a9a9a]">
                Current bid
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
                      <span className="rounded bg-[#3d8d5c] px-1.5 py-0.5 text-[0.7rem] font-bold text-white">
                        -{discountPct}%
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[#666]">
                Reserve {formatCurrency(auction.reservePriceCents)}
                {auction.buyoutPriceCents !== null
                  ? ` · Buy-now ${formatCurrency(auction.buyoutPriceCents)}`
                  : ""}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9a9a9a]">
                  Time left
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

          <section className="rounded-2xl border border-[#ececec] bg-white p-5">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed rounded-full bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-[#9a9a9a]"
            >
              Place a bid
            </button>
            <Link
              href="/signin/consumer"
              className="mt-3 block w-full rounded-full bg-[#3d8d5c] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#347c50]"
            >
              Sign in to bid
            </Link>
            <p className="mt-3 text-center text-xs text-[#666]">
              Bidding and checkout are behind sign-in. Items are picked up in
              store.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
