import { PurchasesList } from "@/components/auction/purchases-list";
import { SectionCard } from "@/components/auction/section-card";
import { ShopperSidebarShell } from "@/components/buyer/shopper-sidebar-shell";
import { db } from "@/db/client";
import { formatCurrency } from "@/lib/auctions/display";
import { getConsumerPurchases } from "@/lib/auctions/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { coerceDate } from "@/lib/datetime";

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
    : profile?.locationLabel || undefined;

  const now = Date.now();
  const readyForPickup = purchases.filter((purchase) => {
    const deadline = coerceDate(purchase.pickupBy);
    return !deadline || deadline.getTime() >= now;
  }).length;
  const totalPaidCents = purchases.reduce(
    (sum, purchase) => sum + (purchase.amountPaidCents ?? 0),
    0,
  );

  const overviewMetrics = [
    { label: "Total orders", value: String(purchases.length) },
    { label: "Ready for pickup", value: String(readyForPickup) },
    { label: "Total paid", value: formatCurrency(totalPaidCents) },
  ];

  return (
    <ShopperSidebarShell
      activeHref="/shop/purchases"
      shopperName={session.user.name || "Shopper"}
      shopperLocation={locationLabel}
      pageEyebrow="Purchases"
      pageTitle="Paid wins and pickup details."
      pageDescription="Once an auction closes and payment clears, your pickup code, store address, and published hours show up here."
    >
      <SectionCard title="Stats overview">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <SectionCard title={`Ready for pickup (${purchases.length})`}>
        <PurchasesList items={purchases} />
      </SectionCard>
    </ShopperSidebarShell>
  );
}
