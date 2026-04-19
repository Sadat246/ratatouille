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
      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        <SectionCard
          title="Position board"
          tone="border-[#d2e8de] bg-[rgba(237,247,242,0.92)] text-[#143026]"
        >
          <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
            {[
              { label: "Winning now", value: String(winningCount).padStart(2, "0") },
              { label: "Outbid now", value: String(outbidCount).padStart(2, "0") },
              { label: "Already won", value: String(wonCount).padStart(2, "0") },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[1.4rem] border border-[#cde1d7] bg-white/85 p-3"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#58806f]">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#173228]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Your auction trail"
          tone="border-[#d8e6de] bg-[rgba(241,248,244,0.92)] text-[#183227]"
        >
          <MyBidsList items={items} />
        </SectionCard>
      </div>
    </ConsumerShell>
  );
}
