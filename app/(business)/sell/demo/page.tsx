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
    scheduledEndAt: auction.scheduledEndAt.toISOString(),
    endedAt: auction.endedAt?.toISOString() ?? null,
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
        badge="Seller setup"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the demo controls."
        businessName="Seller setup"
      >
        <SectionCard title="Setup issue">
          <p className="text-sm leading-6 text-[#5a5a5a]">
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
      title="Drive the walkthrough from the seller lane."
      description="Reset the ambient world, prepare the hero auction, and trigger each beat on cue while the shopper session stays focused on alerts and bidding."
      businessName={sellerDesk.businessName}
    >
      <SectionCard title="Run sheet">
        <div className="grid gap-2 text-sm leading-6 text-[#5a5a5a]">
          <p>Reset the ambient world first so feed states and demo shoppers are predictable again.</p>
          <p>Prepare the hero auction here, then switch to a shopper session to place one real bid and enable alerts.</p>
          <p>Use the controls below to trigger the outbid, ending-soon, and close beats without leaving the product.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sell/outcomes"
            className="inline-flex items-center justify-center rounded-full border border-[#eaeaea] bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition hover:border-[#dcdcdc]"
          >
            Keep outcomes nearby
          </Link>
        </div>
      </SectionCard>

      <SellerDemoTools initialAuction={initialAuction} />
    </SellerShell>
  );
}
