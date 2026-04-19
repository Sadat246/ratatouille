import { SectionCard } from "@/components/auction/section-card";
import { SellerAuctionBoard } from "@/components/auction/seller-auction-board";
import { SellerShell } from "@/components/auction/seller-shell";
import { getSellerLiveAuctions } from "@/lib/auctions/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerDeskData } from "@/lib/listings/queries";

export default async function SellerAuctionsPage() {
  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);

  if (!sellerDesk) {
    return (
      <SellerShell
        activeHref="/sell/auctions"
        badge="Seller setup"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the live seller board."
        businessName="Seller setup"
      >
        <SectionCard title="Setup issue">
          <p className="text-sm leading-6 text-[#5a5a5a]">
            This seller account is missing the storefront membership record that
            powers the live auction board.
          </p>
        </SectionCard>
      </SellerShell>
    );
  }

  const liveAuctions = await getSellerLiveAuctions(sellerDesk.businessId);
  const auctionsWithBids = liveAuctions.filter((auction) => auction.bidCount > 0).length;
  const totalBidCount = liveAuctions.reduce((sum, auction) => sum + auction.bidCount, 0);

  return (
    <SellerShell
      activeHref="/sell/auctions"
      badge="Live auctions"
      title="Hands-off until you need a clean intervention."
      description="Current bid, total pressure, time left, and cancellation when a manual stop is truly required."
      businessName={sellerDesk.businessName}
    >
      <SectionCard title="Live snapshot">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Live now", value: liveAuctions.length },
            { label: "With bids", value: auctionsWithBids },
            { label: "Total bids", value: totalBidCount },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[0.85rem] border border-[#eaeaea] bg-white p-4"
            >
              <p className="text-sm text-[#6b6b6b]">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1a1a1a]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SellerAuctionBoard items={liveAuctions} />
    </SellerShell>
  );
}
