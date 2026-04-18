import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ShellFrame } from "@/components/shell/shell-frame";
import { db } from "@/db/client";
import { requireCompletedRole } from "@/lib/auth/onboarding";

const heroMetrics = [
  { label: "Nearby stores", value: "08" },
  { label: "Ending within 1h", value: "14" },
  { label: "Typical savings", value: "42%" },
];

const featuredListings = [
  {
    title: "Family yogurt six-pack",
    store: "Bright Basket",
    price: "$7 current bid",
    detail: "Pickup tonight by 9:15 PM",
    badge: "11m left",
  },
  {
    title: "Sparkling water case",
    store: "Ashland Corner",
    price: "$12 buyout",
    detail: "4.2 miles away",
    badge: "Buy now",
  },
  {
    title: "Granola snack crate",
    store: "Metro Fresh",
    price: "$9 reserve met",
    detail: "Seal photo verified",
    badge: "Trending",
  },
];

const pickupNotes = [
  "Reserve + buyout are both visible up front so shoppers know whether to wait or lock it in.",
  "Thumb-first card spacing keeps the feed readable on a phone, even when listings end fast.",
  "Pickup and delivery hooks already have clear homes in the shell without leaking future complexity.",
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
      className={`rounded-[2rem] border p-4 shadow-[0_22px_80px_rgba(47,26,16,0.08)] ${tone}`}
    >
      <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function ShopPage() {
  const session = await requireCompletedRole("consumer");
  const profile = await db.query.consumerProfiles.findFirst({
    columns: {
      city: true,
      state: true,
      locationLabel: true,
    },
    where: (table, { eq }) => eq(table.userId, session.user.id),
  });

  return (
    <ShellFrame
      badge="Consumer shell"
      title="Nearby sealed deals with real countdown energy."
      description="This stub already reads like a marketplace: rapid highlights, ending-soon signal, and clear movement between browsing, bids, and pickup."
      heroClassName="bg-[linear-gradient(145deg,#f75d36_0%,#ff8660_46%,#ffc483_100%)] text-white shadow-[0_35px_110px_rgba(247,93,54,0.3)]"
      heroAside={
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#fff1df]">
            {profile?.city
              ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
              : profile?.locationLabel || session.user.name || "Shop deals"}
          </span>
          <SignOutButton
            className="inline-flex items-center justify-center rounded-full border border-white/26 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
            label="Sign out"
          />
        </div>
      }
      activeHref="/shop"
      navItems={[
        { href: "/shop", label: "Home", icon: "spark" },
        { href: "/shop", label: "Nearby", icon: "pin" },
        { href: "/shop", label: "Alerts", icon: "bell" },
        { href: "/shop", label: "Saved", icon: "heart" },
      ]}
    >
      <SectionCard
        title="Rescue pulse"
        tone="border-white/70 bg-[rgba(255,248,241,0.84)] text-[#241610]"
      >
        <div className="grid grid-cols-3 gap-3">
          {heroMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#f2d0bd] bg-white/85 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9a5437]">
                {metric.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#1d120e]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Featured right now"
        tone="border-[#ffd7c7] bg-[rgba(255,241,233,0.88)] text-[#301a13]"
      >
        <div className="grid gap-3">
          {featuredListings.map((listing) => (
            <article
              key={listing.title}
              className="rounded-[1.7rem] bg-white/92 p-4 shadow-[0_18px_50px_rgba(108,53,30,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#a85635]">
                    {listing.store}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1f1410]">
                    {listing.title}
                  </h3>
                </div>
                <span className="rounded-full bg-[#fff0e3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a64b2a]">
                  {listing.badge}
                </span>
              </div>
              <p className="mt-4 text-base font-semibold text-[#244f3f]">
                {listing.price}
              </p>
              <p className="mt-1 text-sm text-[#614a3d]">{listing.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="What this shell is already proving"
        tone="border-[#d6e6da] bg-[rgba(236,245,239,0.84)] text-[#183227]"
      >
        <div className="grid gap-3">
          {pickupNotes.map((note) => (
            <p
              key={note}
              className="rounded-[1.4rem] border border-[#c9ddd0] bg-white/70 px-4 py-3 text-sm leading-7 text-[#315343]"
            >
              {note}
            </p>
          ))}
        </div>
      </SectionCard>
    </ShellFrame>
  );
}
