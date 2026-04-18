import { SectionCard } from "@/components/auction/section-card";
import { SellerOutcomesList } from "@/components/auction/seller-outcomes-list";
import { SellerShell } from "@/components/auction/seller-shell";
import { getSellerOutcomes } from "@/lib/auctions/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerDeskData } from "@/lib/listings/queries";

export default async function SellerOutcomesPage() {
  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);

  if (!sellerDesk) {
    return (
      <SellerShell
        activeHref="/sell/outcomes"
        badge="Seller setup issue"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the outcomes lane."
        businessName="Seller setup"
      >
        <SectionCard
          title="Seller setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
            This seller account is missing the storefront membership record that
            powers the outcomes lane.
          </p>
        </SectionCard>
      </SellerShell>
    );
  }

  const outcomes = await getSellerOutcomes(sellerDesk.businessId);
  const soldCount = outcomes.filter(
    (outcome) => outcome.result === "winning_bid" || outcome.result === "buyout",
  ).length;
  const cancelledCount = outcomes.filter(
    (outcome) => outcome.result === "cancelled",
  ).length;

  return (
    <SellerShell
      activeHref="/sell/outcomes"
      badge="Auction outcomes"
      title="See exactly what sold, what died, and what paid out."
      description="Outcome state stays server-derived: final price, commission, seller net, and whether the auction ended in sale, cancellation, or no-sale."
      heroClassName="bg-[linear-gradient(145deg,#3d2618_0%,#6e452e_46%,#d69e68_100%)] text-white shadow-[0_35px_110px_rgba(78,47,28,0.22)]"
      businessName={sellerDesk.businessName}
    >
      <SectionCard
        title="Outcome snapshot"
        tone="border-[#ecdac7] bg-[rgba(255,247,236,0.9)] text-[#261b14]"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Recorded",
              value: String(outcomes.length).padStart(2, "0"),
            },
            {
              label: "Sold",
              value: String(soldCount).padStart(2, "0"),
            },
            {
              label: "Cancelled",
              value: String(cancelledCount).padStart(2, "0"),
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#efdecc] bg-white/88 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8b6a53]">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#2a2018]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SellerOutcomesList items={outcomes} />
    </SellerShell>
  );
}
