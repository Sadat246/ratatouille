import { ConsumerShell } from "@/components/auction/consumer-shell";
import { PurchasesList } from "@/components/auction/purchases-list";
import { SectionCard } from "@/components/auction/section-card";
import { db } from "@/db/client";
import { getConsumerPurchases } from "@/lib/auctions/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";

export default async function ShopPurchasesPage() {
  const session = await requireCompletedRole("consumer");
  const [profile, purchases] = await Promise.all([
    db.query.consumerProfiles.findFirst({
      columns: {
        city: true,
        state: true,
        locationLabel: true,
      },
      where: (table, operators) => operators.eq(table.userId, session.user.id),
    }),
    getConsumerPurchases(session.user.id),
  ]);

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || session.user.name || "Shop deals";

  return (
    <ConsumerShell
      activeHref="/shop/purchases"
      badge="Purchases"
      title="Paid wins and pickup details."
      description="After an auction closes and your card clears, you get a pickup code, store address, and any hours the seller published."
      heroClassName="bg-[linear-gradient(145deg,#1b3b33_0%,#2f6d5a_44%,#83d3b3_100%)] text-white shadow-[0_35px_110px_rgba(35,88,70,0.22)]"
      locationLabel={locationLabel}
    >
      <SectionCard
        title={`Ready for pickup (${purchases.length})`}
        tone="border-[#d2e8de] bg-[rgba(237,247,242,0.92)] text-[#143026]"
      >
        <PurchasesList items={purchases} />
      </SectionCard>
    </ConsumerShell>
  );
}
