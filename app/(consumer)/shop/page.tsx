import { BuyerFeed } from "@/components/buyer/buyer-feed";
import { BuyerShell } from "@/components/buyer/buyer-shell";
import { PromoBanner } from "@/components/buyer/promo-banner";
import { db } from "@/db/client";
import { getAuctionFeed } from "@/lib/auctions/queries";
import { AUCTION_SWEEP_BATCH_SIZE } from "@/lib/auctions/pricing";
import { sweepOverdueAuctions } from "@/lib/auctions/service";
import { requireCompletedRole } from "@/lib/auth/onboarding";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireCompletedRole("consumer");
  const [{ q }, profile] = await Promise.all([
    searchParams,
    db.query.consumerProfiles.findFirst({
      columns: {
        city: true,
        state: true,
        locationLabel: true,
      },
      where: (table, operators) => operators.eq(table.userId, session.user.id),
    }),
  ]);

  await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);

  const allItems = await getAuctionFeed({
    sortBy: "ending_soon",
    categories: [],
    limit: 13,
    offset: 0,
    viewerUserId: session.user.id,
  });

  const initialItems = allItems.slice(0, 12);

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  return (
    <BuyerShell activeHref="/shop" locationLabel={locationLabel}>
      <div className="flex flex-col gap-6">
        <PromoBanner locationLabel={locationLabel} />
        <BuyerFeed initialItems={initialItems} initialQuery={q ?? ""} />
      </div>
    </BuyerShell>
  );
}
