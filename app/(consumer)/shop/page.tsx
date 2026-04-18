import { ConsumerShell } from "@/components/auction/consumer-shell";
import { FeedClient } from "@/components/auction/feed-client";
import { db } from "@/db/client";
import { getAuctionFeed } from "@/lib/auctions/queries";
import { AUCTION_SWEEP_BATCH_SIZE } from "@/lib/auctions/pricing";
import { sweepOverdueAuctions } from "@/lib/auctions/service";
import { requireCompletedRole } from "@/lib/auth/onboarding";

export default async function ShopPage() {
  const session = await requireCompletedRole("consumer");
  const profile = await db.query.consumerProfiles.findFirst({
    columns: {
      city: true,
      state: true,
      locationLabel: true,
      latitude: true,
      longitude: true,
    },
    where: (table, operators) => operators.eq(table.userId, session.user.id),
  });

  await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);

  const lat = profile?.latitude ?? null;
  const lng = profile?.longitude ?? null;

  const allItems = await getAuctionFeed({
    lat,
    lng,
    sortBy: "ending_soon",
    categories: [],
    limit: 13,
    offset: 0,
    viewerUserId: session.user.id,
  });

  // The server renders the first 12; hasMore is detected by the extra item
  const initialItems = allItems.slice(0, 12);

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  return (
    <ConsumerShell
      activeHref="/shop"
      badge="Nearby deals"
      title="Fresh lots, ending soon."
      description="Geo-filtered auction feed — sorted by urgency, filtered by what you want."
      locationLabel={locationLabel}
    >
      <FeedClient initialItems={initialItems} />
    </ConsumerShell>
  );
}
