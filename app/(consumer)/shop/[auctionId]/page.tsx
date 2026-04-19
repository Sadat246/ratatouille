import { notFound, redirect } from "next/navigation";

import { BuyerShell } from "@/components/buyer/buyer-shell";
import { ListingDetailClient } from "@/components/buyer/listing-detail-client";
import { db } from "@/db/client";
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
  const { auctionId: segment } = await params;

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

  const first = await getAuctionDetail(segment, session.user.id);

  if (!first) {
    notFound();
  }

  await refreshAuctionIfOverdue(first.id);

  const auction = (await getAuctionDetail(first.id, session.user.id)) ?? first;

  if (segment !== auction.id) {
    redirect(`/shop/${auction.id}`);
  }

  const consumerLat = profile?.latitude ?? null;
  const consumerLng = profile?.longitude ?? null;

  let distanceMiles: number | null = null;

  if (
    consumerLat != null &&
    consumerLng != null &&
    auction.business.latitude != null &&
    auction.business.longitude != null &&
    !(consumerLat === 0 && consumerLng === 0)
  ) {
    distanceMiles = computeHaversine(
      consumerLat,
      consumerLng,
      auction.business.latitude,
      auction.business.longitude,
    );
  }

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  return (
    <BuyerShell activeHref="/shop" locationLabel={locationLabel}>
      <ListingDetailClient
        initialAuction={auction}
        distanceMiles={distanceMiles}
      />
    </BuyerShell>
  );
}
