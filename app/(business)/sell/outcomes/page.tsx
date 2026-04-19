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
        badge="Seller setup"
        title="Storefront membership missing."
        description="Finish business onboarding again before using the outcomes lane."
        businessName="Seller setup"
      >
        <SectionCard title="Setup issue">
          <p className="text-sm leading-6 text-[#5a5a5a]">
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
      badge="Outcomes"
      title="See exactly what sold, what died, and what paid out."
      description="Server-derived final price, commission, seller net, and whether the auction ended in sale, cancellation, or no-sale."
      businessName={sellerDesk.businessName}
    >
      <SectionCard title="Outcome snapshot">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Recorded", value: outcomes.length },
            { label: "Sold", value: soldCount },
            { label: "Cancelled", value: cancelledCount },
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

      <SellerOutcomesList items={outcomes} />
    </SellerShell>
  );
}
