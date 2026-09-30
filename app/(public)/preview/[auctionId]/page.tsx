import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PreviewDetail } from "@/components/preview/preview-detail";
import { PreviewShell } from "@/components/preview/preview-shell";
import { getAuctionDetail } from "@/lib/auctions/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live preview",
  description:
    "A read-only look at one item a local store is listing right now on Ratatouille.",
  robots: { index: false, follow: false },
};

export default async function PreviewDetailPage({
  params,
}: {
  params: Promise<{ auctionId: string }>;
}) {
  const { auctionId: segment } = await params;

  // Read-only on purpose: no viewer id (so `viewer` stays null) and no
  // overdue-auction refresh, which is a write path anonymous traffic must
  // never reach.
  const auction = await getAuctionDetail(segment);

  // Same "live" predicate the /preview index uses (auction and listing both
  // active), so every card on the index resolves and nothing else does.
  if (
    !auction ||
    auction.status !== "active" ||
    auction.listing.status !== "active"
  ) {
    notFound();
  }

  // Mirrors the id normalisation in app/(consumer)/shop/[auctionId]/page.tsx
  // (lines 40-42): the query accepts an auction id or a listing id, and the
  // canonical URL always carries the auction id.
  if (segment !== auction.id) {
    redirect(`/preview/${auction.id}`);
  }

  return (
    <PreviewShell>
      <PreviewDetail auction={auction} />
    </PreviewShell>
  );
}
