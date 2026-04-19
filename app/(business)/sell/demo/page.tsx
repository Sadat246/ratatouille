import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/auction/section-card";
import { SellerShell } from "@/components/auction/seller-shell";
import {
  SellerDemoTools,
  type DemoAuctionView,
} from "@/components/demo/seller-demo-tools";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { toIsoTimestamp } from "@/lib/datetime";
import { demoService } from "@/lib/demo/service";
import { getSellerDeskData } from "@/lib/listings/queries";

function serializeAuction(
  auction: Awaited<ReturnType<typeof demoService.getHeroAuctionStatus>>,
): DemoAuctionView | null {
  if (!auction) {
    return null;
  }

  return {
    ...auction,
    scheduledEndAt: toIsoTimestamp(auction.scheduledEndAt),
    endedAt: auction.endedAt != null ? toIsoTimestamp(auction.endedAt) : null,
  };
}

export default async function SellDemoPage() {
  if (!isDemoModeEnabled()) {
    notFound();
  }

  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);

  if (!sellerDesk) {
    return (
      <SellerShell
        activeHref="/sell/demo"
        badge="Seller setup issue"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the demo controls."
        businessName="Seller setup"
      >
        <SectionCard
          title="Seller setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
            This seller account is signed in, but the storefront membership
            record is missing. Finish business onboarding again before driving
            the scripted demo flow.
          </p>
        </SectionCard>
      </SellerShell>
    );
  }

  const initialAuction = serializeAuction(
    await demoService.getHeroAuctionStatus({
      sellerUserId: session.user.id,
    }),
  );

  return (
    <SellerShell
      activeHref="/sell/demo"
      badge="Demo controls"
      title="Drive the Phase 8 walkthrough from the seller lane."
      description="Reset the ambient world, prepare the hero auction, and trigger each beat on cue while the shopper session stays focused on alerts and bidding."
      heroClassName="bg-[linear-gradient(145deg,#203a31_0%,#325b4a_44%,#8bc0a3_100%)] text-white shadow-[0_35px_110px_rgba(28,64,51,0.24)]"
      businessName={sellerDesk.businessName}
    >
      <SectionCard
        title="Run sheet"
        tone="border-[#dbe7e1] bg-[rgba(241,248,244,0.92)] text-[#173127]"
      >
        <div className="grid gap-3 text-sm leading-6 text-[#4d675b]">
          <p>Reset the ambient world first so the feed states and demo shoppers are predictable again.</p>
          <p>Prepare the hero auction here, then switch to a shopper session to place one real bid and enable alerts.</p>
          <p>Use the controls below to trigger the outbid, ending-soon, and close beats without leaving the product.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sell/outcomes"
            className="inline-flex items-center justify-center rounded-full border border-[#d7cec2] bg-white/88 px-4 py-2 text-sm font-semibold text-[#7a5b45]"
          >
            Keep outcomes nearby
          </Link>
        </div>
      </SectionCard>

      <SellerDemoTools initialAuction={initialAuction} />
    </SellerShell>
  );
}
