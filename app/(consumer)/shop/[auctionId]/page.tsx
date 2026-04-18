import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AuctionDetailClient } from "@/components/auction/auction-detail-client";
import { ConsumerShell } from "@/components/auction/consumer-shell";
import { db } from "@/db/client";
import { auctions as auctionsTable, businesses } from "@/db/schema";
import { computeHaversine } from "@/lib/auctions/geo";
import { getAuctionDetail } from "@/lib/auctions/queries";
import { refreshAuctionIfOverdue } from "@/lib/auctions/service";
import { requireCompletedRole } from "@/lib/auth/onboarding";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ auctionId: string }>;
}) {
  const session = await requireCompletedRole("consumer");
  const { auctionId } = await params;

  const [profile] = await Promise.all([
    db.query.consumerProfiles.findFirst({
      columns: {
        city: true,
        state: true,
        locationLabel: true,
        latitude: true,
        longitude: true,
      },
      where: (table, operators) => operators.eq(table.userId, session.user.id),
    }),
    refreshAuctionIfOverdue(auctionId),
  ]);

  const auction = await getAuctionDetail(auctionId, session.user.id);

  if (!auction) {
    notFound();
  }

  const consumerLat = profile?.latitude ?? null;
  const consumerLng = profile?.longitude ?? null;

  let distanceMiles: number | null = null;

  if (
    consumerLat != null &&
    consumerLng != null &&
    !(consumerLat === 0 && consumerLng === 0)
  ) {
    const [businessGeo] = await db
      .select({ lat: businesses.latitude, lng: businesses.longitude })
      .from(auctionsTable)
      .innerJoin(businesses, eq(businesses.id, auctionsTable.businessId))
      .where(eq(auctionsTable.id, auctionId))
      .limit(1);

    if (businessGeo?.lat != null && businessGeo?.lng != null) {
      distanceMiles = computeHaversine(
        consumerLat,
        consumerLng,
        businessGeo.lat,
        businessGeo.lng,
      );
    }
  }

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  return (
    <ConsumerShell
      activeHref="/shop"
      badge="Auction detail"
      title="One timer. One lot. One source of truth."
      description="Detail stays pinned to server state, so every bid, buyout, and close decision comes from the same engine that settles the auction."
      heroClassName="bg-[linear-gradient(145deg,#2d1814_0%,#8d321b_46%,#f75d36_100%)] text-white shadow-[0_35px_110px_rgba(45,24,20,0.28)]"
      locationLabel={locationLabel}
    >
      <AuctionDetailClient initialAuction={auction} distanceMiles={distanceMiles} />
    </ConsumerShell>
  );
}
