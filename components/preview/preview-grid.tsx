import { ProductCard } from "@/components/buyer/product-card";
import {
  formatLocationLabel,
  formatPackageLabel,
} from "@/lib/auctions/display";
import type { AuctionFeedItem } from "@/lib/auctions/queries";
import { listingCategoryLabels } from "@/lib/listings/categories";

type PreviewGridProps = {
  items: AuctionFeedItem[];
};

/**
 * Read-only card grid. Prop mapping mirrors the shop feed call site, except:
 * - no viewer, so viewerIsLeading is always false;
 * - the feed carries no distance, so distanceMiles is always null;
 * - `endedAt` is deliberately not passed (AuctionFeedItem has no such field);
 * - cards link to /preview/<id>, never into /shop.
 */
export function PreviewGrid({ items }: PreviewGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((auction) => (
        <li key={auction.id} data-preview-card className="min-w-0">
          <ProductCard
            href={`/preview/${auction.id}`}
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
            viewerIsLeading={false}
            categoryLabel={
              auction.listing.category
                ? listingCategoryLabels[
                    auction.listing.category as keyof typeof listingCategoryLabels
                  ] ?? auction.listing.category
                : null
            }
            distanceMiles={null}
            packageLabel={
              auction.listing.packageDate
                ? formatPackageLabel(auction.listing.packageDate)
                : formatLocationLabel(
                    auction.business.city,
                    auction.business.state,
                  )
            }
          />
        </li>
      ))}
    </ul>
  );
}
