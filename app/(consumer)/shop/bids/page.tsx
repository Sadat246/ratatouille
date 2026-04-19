import { MyBidsList } from "@/components/auction/my-bids-list";
import { SectionCard } from "@/components/auction/section-card";
import { ShopperSidebarShell } from "@/components/buyer/shopper-sidebar-shell";
import { db } from "@/db/client";
import { getMyBidAuctions } from "@/lib/auctions/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";

export default async function ShopBidsPage() {
  const session = await requireCompletedRole("consumer");
  const [profile, items] = await Promise.all([
    db.query.consumerProfiles.findFirst({
      columns: {
        city: true,
        state: true,
        locationLabel: true,
      },
      where: (table, operators) => operators.eq(table.userId, session.user.id),
    }),
    getMyBidAuctions(session.user.id),
  ]);

  const locationLabel = profile?.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile?.locationLabel || undefined;

  const winningCount = items.filter((item) => item.participationState === "winning").length;
  const wonCount = items.filter((item) => item.participationState === "won").length;
  const outbidCount = items.filter((item) => item.participationState === "outbid").length;

  const overviewMetrics = [
    { label: "Winning now", value: winningCount },
    { label: "Outbid", value: outbidCount },
    { label: "Already won", value: wonCount },
  ];

  return (
    <ShopperSidebarShell
      activeHref="/shop/bids"
      shopperName={session.user.name || "Shopper"}
      shopperLocation={locationLabel}
      pageEyebrow="My bids"
      pageTitle="Everything you’ve swung at, cleanly sorted."
      pageDescription="Winning, outbid, and won are obvious in one tap — no buried account pages."
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

      <SectionCard title="Your auction trail">
        <MyBidsList items={items} />
      </SectionCard>
    </ShopperSidebarShell>
  );
}
