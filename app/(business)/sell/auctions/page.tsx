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
        badge="Seller setup issue"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the live seller board."
        businessName="Seller setup"
      >
        <SectionCard
          title="Seller setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
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
      badge="Live auction board"
      title="Hands-off until you need a clean intervention."
      description="This board keeps the seller side informed: current bid, total pressure, time-left, and cancellation when a manual stop is truly required."
      heroClassName="bg-[linear-gradient(145deg,#15372d_0%,#205546_46%,#79c4a3_100%)] text-white shadow-[0_35px_110px_rgba(20,63,51,0.24)]"
      businessName={sellerDesk.businessName}
    >
      <SectionCard
        title="Live snapshot"
        tone="border-[#d4e4dc] bg-[rgba(239,247,243,0.92)] text-[#173127]"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Live now",
              value: String(liveAuctions.length).padStart(2, "0"),
            },
            {
              label: "With bids",
              value: String(auctionsWithBids).padStart(2, "0"),
            },
            {
              label: "Total bids",
              value: String(totalBidCount).padStart(2, "0"),
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#cdded7] bg-white/88 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#55776a]">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#143126]">
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
