import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ListingComposer } from "@/components/listing/listing-composer";
import { RecentListingsPanel } from "@/components/listing/recent-listings-panel";
import { ShellFrame } from "@/components/shell/shell-frame";
import { requireCompletedRole } from "@/lib/auth/onboarding";
import { getSellerDeskData } from "@/lib/listings/queries";

import { publishListing } from "./actions";

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
  const recoveryMetrics = sellerDesk
    ? [
        {
          label: "Draft listings",
          value: String(sellerDesk.metrics.draftCount).padStart(2, "0"),
        },
        {
          label: "Ready to run",
          value: String(sellerDesk.metrics.readyCount).padStart(2, "0"),
        },
        {
          label: "Published today",
          value: String(sellerDesk.metrics.publishedTodayCount).padStart(2, "0"),
        },
      ]
    : [];

  return (
    <ShellFrame
      badge="Business shell"
      title="List sealed goods before the clock wins."
      description="Three photo slots, OCR-assisted package-date confirmation, reserve, buyout, and auction timing now live in one thumb-first seller desk."
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
      {sellerDesk ? (
        <>
          <SectionCard
            title="Snap-to-list desk"
            tone="border-[#eddcc8] bg-[rgba(255,247,237,0.9)] text-[#2d2419]"
          >
            <ListingComposer action={publishListing} businessId={sellerDesk.businessId} />
          </SectionCard>

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
            title="Recent listings"
            tone="border-[#f0ddbf] bg-[rgba(255,247,234,0.88)] text-[#2d2414]"
          >
            <RecentListingsPanel listings={sellerDesk.recentListings} />
          </SectionCard>
        </>
      ) : (
        <SectionCard
          title="Seller setup issue"
          tone="border-[#ead1cb] bg-[rgba(255,241,237,0.88)] text-[#41231c]"
        >
          <p className="text-sm leading-7">
            This seller account is signed in, but the storefront membership record is
            missing. Finish the business onboarding lane again before trying to publish
            listings from this desk.
          </p>
        </SectionCard>
      )}
    </ShellFrame>
  );
}
