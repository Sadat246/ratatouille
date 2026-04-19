import { ConsumerShell } from "@/components/auction/consumer-shell";
import { MyBidsList } from "@/components/auction/my-bids-list";
import { SectionCard } from "@/components/auction/section-card";
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
    : profile?.locationLabel || session.user.name || "Shop deals";

  const winningCount = items.filter((item) => item.participationState === "winning").length;
  const wonCount = items.filter((item) => item.participationState === "won").length;
  const outbidCount = items.filter((item) => item.participationState === "outbid").length;

  return (
    <ConsumerShell
      activeHref="/shop/bids"
      badge="My bids"
      title="Everything you’ve swung at, cleanly sorted."
      description="Winning, outbid, won, and lost are obvious in one tap, so this lane feels like active participation instead of a buried account page."
      heroClassName="bg-[linear-gradient(145deg,#1b3b33_0%,#2f6d5a_44%,#83d3b3_100%)] text-white shadow-[0_35px_110px_rgba(35,88,70,0.22)]"
      locationLabel={locationLabel}
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
