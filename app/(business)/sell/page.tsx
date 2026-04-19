import { PushOptInPanel } from "@/components/auction/push-opt-in-panel";
import { SectionCard } from "@/components/auction/section-card";
import { SellerShell } from "@/components/auction/seller-shell";
import { ListingComposer } from "@/components/listing/listing-composer";
import { RecentListingsPanel } from "@/components/listing/recent-listings-panel";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerLiveAuctions, getSellerOutcomes } from "@/lib/auctions/queries";
import { getSellerDeskData } from "@/lib/listings/queries";

import { publishListing } from "./actions";

export default async function SellPage() {
  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);

  if (!sellerDesk) {
    return (
      <SellerShell
        activeHref="/sell"
        badge="Seller setup"
        title="Storefront membership missing."
        description="This seller account is signed in but the storefront membership record is missing. Finish business onboarding again before publishing listings."
        businessName="Seller setup"
      >
        <SectionCard title="Setup issue">
          <p className="text-sm leading-6 text-[#5a5a5a]">
            This seller account is signed in, but the storefront membership
            record is missing. Finish the business onboarding lane again before
            trying to publish listings from this desk.
          </p>
        </SectionCard>
      </SellerShell>
    );
  }

  const [liveAuctions, outcomes] = await Promise.all([
    getSellerLiveAuctions(sellerDesk.businessId, 6),
    getSellerOutcomes(sellerDesk.businessId, 6),
  ]);

  const overviewMetrics = [
    { label: "Active listings", value: liveAuctions.length },
    { label: "Outcomes", value: outcomes.length },
  ];

  return (
    <SellerShell
      activeHref="/sell"
      badge="Seller dashboard"
      title="List it, watch it move, keep the margin."
      description="The desk owns listing creation, then points straight into the live auction board and the final-outcome lane."
      businessName={sellerDesk.businessName}
    >
      <SectionCard title="Stats overview">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {overviewMetrics.map((metric) => (
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

      <SectionCard title="Snap to list">
        <ListingComposer action={publishListing} businessId={sellerDesk.businessId} />
      </SectionCard>

      <PushOptInPanel
        title="Seller event alerts"
        description="Enable browser alerts for new high bids and final outcomes without keeping the seller lane open all day."
      />

      <SectionCard title="Recent listings">
        <RecentListingsPanel listings={sellerDesk.recentListings} />
      </SectionCard>
    </SellerShell>
  );
}
