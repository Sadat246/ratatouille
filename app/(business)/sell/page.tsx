import Link from "next/link";

import { PushOptInPanel } from "@/components/auction/push-opt-in-panel";
import { SectionCard } from "@/components/auction/section-card";
import { SellerShell } from "@/components/auction/seller-shell";
import { ListingComposer } from "@/components/listing/listing-composer";
import { RecentListingsPanel } from "@/components/listing/recent-listings-panel";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerLiveAuctions, getSellerOutcomes } from "@/lib/auctions/queries";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { getSellerDeskData } from "@/lib/listings/queries";

import { publishListing } from "./actions";

export default async function SellPage() {
  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);
  const demoModeEnabled = isDemoModeEnabled();

  if (!sellerDesk) {
    return (
      <SellerShell
        activeHref="/sell"
        badge="Seller setup issue"
        title="Storefront membership missing."
        description="This seller account is signed in, but the storefront membership record is missing. Finish business onboarding again before publishing listings."
        businessName="Seller setup"
      >
        <SectionCard
          title="Seller setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
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

  const recoveryMetrics = [
    {
      label: "Draft listings",
      value: String(sellerDesk.metrics.draftCount).padStart(2, "0"),
    },
    {
      label: "Live auctions",
      value: String(liveAuctions.length).padStart(2, "0"),
    },
    {
      label: "Recent outcomes",
      value: String(outcomes.length).padStart(2, "0"),
    },
  ];

  return (
    <SellerShell
      activeHref="/sell"
      badge="Seller desk"
      title="List it, watch it move, and keep the margin."
      description="The desk still owns listing creation, but now it also points straight into the live auction board and final-outcome lane."
      businessName={sellerDesk.businessName}
    >
      <SectionCard
        title="Snap-to-list desk"
        tone="border-[#eddcc8] bg-[rgba(255,247,237,0.9)] text-[#2d2419]"
      >
        <ListingComposer action={publishListing} businessId={sellerDesk.businessId} />
      </SectionCard>

      <SectionCard
        title="Recovery board"
        tone="border-white/70 bg-[rgba(243,250,246,0.84)] text-[#162920]"
      >
        <div className="grid grid-cols-3 gap-3">
          {recoveryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#c9ddd0] bg-white/88 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#486957]">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#143126]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Operations lanes"
        tone="border-[#d7e6de] bg-[rgba(240,248,244,0.92)] text-[#163025]"
      >
        <div className="grid gap-3">
          {demoModeEnabled ? (
            <Link
              href="/sell/demo"
              className="rounded-[1.7rem] border border-[#d8dff5] bg-[rgba(248,248,255,0.92)] p-4"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#675da0]">
                Demo rail
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1f1b3d]">
                Drive the walkthrough
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5a5577]">
                Reset the ambient world, prep the hero auction, and keep the scripted controls inside the product.
              </p>
            </Link>
          ) : null}
          <Link
            href="/sell/auctions"
            className="rounded-[1.7rem] border border-[#cbe0d4] bg-white/88 p-4"
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#4c7564]">
              Live board
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#17271f]">
              Monitor active auctions
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#55685e]">
              Current price, bid count, time-left, and seller-side cancel controls.
            </p>
          </Link>
          <Link
            href="/sell/outcomes"
            className="rounded-[1.7rem] border border-[#ead8c8] bg-white/88 p-4"
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8d7052]">
              Outcome lane
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#2a2118]">
              Review sold and cancelled lots
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#69574b]">
              Final price, commission, seller net, and settlement state.
            </p>
          </Link>
          <Link
            href="/sell/fulfillment"
            className="rounded-[1.7rem] border border-[#d6e7df] bg-white/88 p-4"
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#5b7f6f]">
              Fulfillment lane
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d2b24]">
              Verify pickup and track delivery
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5a6f65]">
              One place for store staff to close pickup codes and watch delivery runs.
            </p>
          </Link>
        </div>
      </SectionCard>

      <PushOptInPanel
        title="Seller event alerts"
        description="Enable browser alerts for new high bids and final outcomes without keeping the seller lane open all day."
      />

      <SectionCard
        title="Recent listings"
        tone="border-[#f0ddbf] bg-[rgba(255,247,234,0.88)] text-[#2d2414]"
      >
        <RecentListingsPanel listings={sellerDesk.recentListings} />
      </SectionCard>
    </SellerShell>
  );
}
