import Link from "next/link";

import { ConsumerShell } from "@/components/auction/consumer-shell";
import { MockCardPanel } from "@/components/auction/mock-card-panel";
import { PushOptInPanel } from "@/components/auction/push-opt-in-panel";
import { SectionCard } from "@/components/auction/section-card";
import { db } from "@/db/client";
import { getMyBidAuctions } from "@/lib/auctions/queries";
import { requireCompletedRole } from "@/lib/auth/onboarding";

export default async function ShopAlertsPage() {
  const session = await requireCompletedRole("consumer");
  const [profile, myBids] = await Promise.all([
    db.query.consumerProfiles.findFirst({
      columns: {
        city: true,
        state: true,
        locationLabel: true,
        hasMockCardOnFile: true,
        mockCardBrand: true,
        mockCardLast4: true,
        mockCardAddedAt: true,
      },
      where: (table, operators) => operators.eq(table.userId, session.user.id),
    }),
    getMyBidAuctions(session.user.id, 12),
  ]);

  if (!profile) {
    return (
      <ConsumerShell
        activeHref="/shop/alerts"
        badge="Shopper setup issue"
        title="Shopper profile missing."
        description="Finish consumer onboarding again before managing bid setup and alerts."
        locationLabel={session.user.name || "Shop deals"}
      >
        <SectionCard
          title="Shopper setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
            This shopper account is signed in, but the consumer profile needed
            for bid settings is missing.
          </p>
        </SectionCard>
      </ConsumerShell>
    );
  }

  const locationLabel = profile.city
    ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
    : profile.locationLabel || session.user.name || "Shop deals";

  const liveBidCount = myBids.filter(
    (item) => item.participationState === "winning" || item.participationState === "outbid",
  ).length;
  const winningCount = myBids.filter((item) => item.participationState === "winning").length;

  return (
    <ConsumerShell
      activeHref="/shop/alerts"
      badge="Alerts & setup"
      title="Stay bid-ready, then let the app chase you."
      description="This lane keeps the bidding gate reachable and puts outbid alerts in the same mental slot, so shoppers never have to hunt for auction readiness."
      heroClassName="bg-[linear-gradient(145deg,#2f2154_0%,#4a3a81_42%,#9ab4ff_100%)] text-white shadow-[0_35px_110px_rgba(59,44,109,0.24)]"
      locationLabel={locationLabel}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] xl:items-start">
        <div className="grid gap-5">
          <SectionCard
            title="Readiness"
            tone="border-[#d9ddf6] bg-[rgba(243,245,255,0.9)] text-[#20183f]"
          >
            <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
              {[
                {
                  label: "Card ready",
                  value: profile.hasMockCardOnFile ? "Yes" : "No",
                },
                {
                  label: "Live positions",
                  value: String(liveBidCount).padStart(2, "0"),
                },
                {
                  label: "Winning now",
                  value: String(winningCount).padStart(2, "0"),
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.4rem] border border-[#d8dcf2] bg-white/90 p-3"
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#655a98]">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#1d1737]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Walkthrough cue"
            tone="border-[#dad7f3] bg-[rgba(246,247,255,0.92)] text-[#20183f]"
          >
            <p className="text-sm leading-6 text-[#4d4671]">
              Enable alerts here before the seller starts the scripted demo. On
              iPhone or iPad, install the app to the Home Screen first, then grant
              notification permission from the button below.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/shop/bids"
                className="rounded-[1.5rem] border border-[#d8dcf2] bg-white/90 p-4"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#665b99]">
                  My bids
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-[#1d1737]">
                  Keep the live bidding lane open
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#55507a]">
                  Watch the real shopper bid, then stay ready for the outbid beat.
                </p>
              </Link>
              <Link
                href="/shop/orders"
                className="rounded-[1.5rem] border border-[#ddd6cb] bg-white/90 p-4"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8a6f58]">
                  Orders
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-[#241b14]">
                  Jump to the post-win lane
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#685a4d]">
                  Use this after the close beat to confirm the win and fulfillment follow-through.
                </p>
              </Link>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5">
          <MockCardPanel
            initialMockCard={{
              enabled: profile.hasMockCardOnFile,
              brand: profile.mockCardBrand,
              last4: profile.mockCardLast4,
              addedAt: profile.mockCardAddedAt,
            }}
          />

          <PushOptInPanel />
        </div>
      </div>
    </ConsumerShell>
  );
}
