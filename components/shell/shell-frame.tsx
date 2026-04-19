import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { BottomNav, NavIcon, type BottomNavItem } from "@/components/nav/bottom-nav";

type ShellFrameProps = {
  badge: string;
  title: string;
  description: string;
  heroClassName: string;
  heroAside: ReactNode;
  activeHref: string;
  navItems: BottomNavItem[];
  children: ReactNode;
};

export function ShellFrame({
  badge,
  title,
  description,
  heroClassName,
  heroAside,
  activeHref,
  navItems,
  children,
}: ShellFrameProps) {
  const tone = activeHref.startsWith("/sell")
    ? {
        rail:
          "border-[#d6e5dc] bg-[linear-gradient(180deg,rgba(243,249,246,0.94)_0%,rgba(231,242,236,0.92)_100%)] text-[#143126]",
        muted: "text-[#4d6d61]",
        navIdle: "text-[#35594a] hover:bg-white/76",
        navActive:
          "bg-[#234d3d] text-white shadow-[0_18px_50px_rgba(35,77,61,0.22)]",
        workspaceTag:
          "border-[#cfe0d7] bg-[rgba(245,250,247,0.8)] text-[#48705f]",
        railSummary:
          "Run listings, live auctions, fulfillment, and outcomes from one desktop workstation.",
      }
    : {
        rail:
          "border-[#eed8c8] bg-[linear-gradient(180deg,rgba(255,249,242,0.94)_0%,rgba(255,241,229,0.92)_100%)] text-[#26160f]",
        muted: "text-[#6d4f3f]",
        navIdle: "text-[#634c3f] hover:bg-white/76",
        navActive:
          "bg-[#f75d36] text-white shadow-[0_18px_50px_rgba(247,93,54,0.22)]",
        workspaceTag:
          "border-[#ffd8c4] bg-[rgba(255,244,235,0.82)] text-[#aa5838]",
        railSummary:
          "Browse live lots, bids, orders, and alerts from one desktop marketplace.",
      };

  return (
    <main className="min-h-screen px-4 pb-24 pt-5 sm:px-6 sm:pb-12 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="mx-auto max-w-[1580px] lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[310px_minmax(0,1fr)] xl:gap-8">
        <section className="rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_22px_90px_rgba(55,34,18,0.12)] backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Wordmark subtitle={badge} />
            {heroAside}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-8 space-y-5">
            <section
              className={`overflow-hidden rounded-[2.35rem] border p-6 shadow-[0_22px_90px_rgba(55,34,18,0.08)] backdrop-blur ${tone.rail}`}
            >
              <Wordmark subtitle={badge} />
              <p className={`mt-4 text-sm leading-6 ${tone.muted}`}>{tone.railSummary}</p>

              <nav className="mt-6 grid gap-2">
                {navItems.map((item) => {
                  const active = item.href === activeHref;

                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-[1.45rem] px-4 py-3 text-sm font-semibold transition-colors ${
                        active ? tone.navActive : tone.navIdle
                      }`}
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/18">
                        <NavIcon icon={item.icon} active={active} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 rounded-[1.8rem] border border-white/55 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                {heroAside}
              </div>
            </section>
          </div>
        </aside>

        <div className="mt-4 min-w-0 lg:mt-0">
          <section
            className={`overflow-hidden rounded-[2.7rem] px-5 pb-6 pt-6 lg:px-8 lg:pb-8 lg:pt-8 xl:px-10 ${heroClassName}`}
          >
            <div className="flex flex-col gap-5 lg:gap-6">
              <span
                className={`hidden w-fit rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] lg:inline-flex ${tone.workspaceTag}`}
              >
                {badge}
              </span>
              <div className="flex flex-col gap-4 lg:gap-5">
                <h1 className="max-w-[13ch] text-[clamp(2.4rem,8vw,4rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance lg:max-w-[14ch] lg:text-[clamp(3.4rem,5vw,5.5rem)]">
                  {title}
                </h1>
                <p className="max-w-[29rem] text-sm leading-7 opacity-92 sm:text-base lg:max-w-[44rem] lg:text-[1.02rem]">
                  {description}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-5">{children}</div>
        </div>
      </div>

      <BottomNav activeHref={activeHref} items={navItems} />
    </main>
  );
}
