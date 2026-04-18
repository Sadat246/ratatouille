import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ShellFrame } from "@/components/shell/shell-frame";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerDeskData } from "@/lib/listings/queries";

const laneCards = [
  {
    title: "List sealed goods fast",
    detail: "Photo capture, reserve price, buyout, and expiry timing all have clear destinations in the next phases.",
  },
  {
    title: "Watch auctions close",
    detail: "Auction, settlement, and fulfillment states already map to distinct lifecycle buckets in the data model.",
  },
  {
    title: "Prep each handoff",
    detail: "Pickup codes and Uber Direct references already have a dedicated operational lane instead of being bolted on later.",
  },
];

const attentionItems = [
  {
    label: "Needs pricing",
    value: "Protein bars bundle",
  },
  {
    label: "Reserve met",
    value: "Organic milk crate",
  },
  {
    label: "Pickup window",
    value: "Seltzer combo pack",
  },
];

function SectionCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[2rem] border p-4 shadow-[0_22px_80px_rgba(35,43,28,0.08)] ${tone}`}
    >
      <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SellPage() {
  const session = await requireCompletedRole("business");
  const sellerDesk = await getSellerDeskData(session.user.id);
  const recoveryMetrics = [
    {
      label: "Draft listings",
      value: String(sellerDesk?.metrics.draftCount ?? 0).padStart(2, "0"),
    },
    {
      label: "Ready to run",
      value: String(sellerDesk?.metrics.readyCount ?? 0).padStart(2, "0"),
    },
    {
      label: "Published today",
      value: String(sellerDesk?.metrics.publishedTodayCount ?? 0).padStart(2, "0"),
    },
  ];
  const attention = sellerDesk?.recentListings.length
    ? sellerDesk.recentListings.slice(0, 3).map((listing) => ({
        label: listing.status === "draft" ? "Needs pricing" : "Recent listing",
        value: listing.title,
      }))
    : attentionItems;

  return (
    <ShellFrame
      badge="Business shell"
      title="Turn expiry pressure into a controlled recovery lane."
      description="The seller side already centers store operations: what needs pricing, what is ending soon, and what needs a clean pickup handoff."
      heroClassName="bg-[linear-gradient(145deg,#1d3e32_0%,#2d5b49_48%,#5ea381_100%)] text-white shadow-[0_35px_110px_rgba(33,77,61,0.28)]"
      heroAside={
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#e7f7ef]">
            {sellerDesk?.businessName ?? "Sell inventory"}
          </span>
          <SignOutButton
            className="inline-flex items-center justify-center rounded-full border border-white/26 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
            label="Sign out"
          />
        </div>
      }
      activeHref="/sell"
      navItems={[
        { href: "/sell", label: "Desk", icon: "chart" },
        { href: "/sell", label: "Listings", icon: "box" },
        { href: "/sell", label: "Orders", icon: "truck" },
        { href: "/sell", label: "Team", icon: "users" },
      ]}
    >
      <SectionCard
        title="Recovery board"
        tone="border-white/70 bg-[rgba(243,250,246,0.84)] text-[#162920]"
      >
        <div className="grid grid-cols-3 gap-3">
          {recoveryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#c9ddd0] bg-white/88 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#486957]">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#143126]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Operations lanes"
        tone="border-[#cbe1d4] bg-[rgba(232,243,236,0.88)] text-[#1b342b]"
      >
        <div className="grid gap-3">
          {laneCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[1.7rem] bg-white/92 p-4 shadow-[0_18px_50px_rgba(28,63,48,0.07)]"
            >
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#183327]">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#476555]">
                {card.detail}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Needs attention"
        tone="border-[#f0ddbf] bg-[rgba(255,247,234,0.88)] text-[#2d2414]"
      >
        <div className="grid gap-3">
          {attention.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-[#ead3b3] bg-white/85 px-4 py-3"
            >
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f6843]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm text-[#4f3d2b]">{item.value}</p>
              </div>
              <span className="rounded-full bg-[#f75d36] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                Open
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </ShellFrame>
  );
}
