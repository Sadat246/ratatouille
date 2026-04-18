import type { AuctionFeedItem } from "@/lib/auctions/queries";

export type SortByOption = "ending_soon" | "nearest" | "lowest_price";

/**
 * Sorts an array of AuctionFeedItems by the given sort key.
 * Returns a new sorted array without mutating the input.
 */
export function sortItems(
  items: AuctionFeedItem[],
  sortBy: SortByOption,
): AuctionFeedItem[] {
  const copy = [...items];

  switch (sortBy) {
    case "ending_soon":
      return copy.sort(
        (a, b) =>
          new Date(a.scheduledEndAt).getTime() -
          new Date(b.scheduledEndAt).getTime(),
      );
    case "nearest":
      return copy.sort((a, b) => {
        const da = a.distanceMiles ?? Infinity;
        const db = b.distanceMiles ?? Infinity;
        return da - db;
      });
    case "lowest_price":
      return copy.sort((a, b) => a.reservePriceCents - b.reservePriceCents);
    default:
      return copy;
  }
}

/**
 * Filters AuctionFeedItems by category.
 * An empty categories array returns all items.
 */
export function filterByCategories(
  items: AuctionFeedItem[],
  categories: string[],
): AuctionFeedItem[] {
  if (categories.length === 0) return items;
  return items.filter((item) => categories.includes(item.listing.category));
}
