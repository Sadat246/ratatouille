import { redirect } from "next/navigation";

import { AuthLaneCard } from "@/components/auth/auth-lane-card";
import { Wordmark } from "@/components/brand/wordmark";
import { getSession } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/roles";

const quickHits = [
  {
    label: "Sealed only",
    value: "Product, seal, and expiry proof stay visible from the first listing flow.",
  },
  {
    label: "Tonight's energy",
    value: "Timed auctions, instant buyout, and pickup-ready UX from a single web shell.",
  },
  {
    label: "Built for stores",
    value: "Recovery-focused tooling for corner shops and groceries, not generic classifieds.",
  },
  {
    label: "Free-tier path",
    value: "A deployable App Router foundation that is ready for hosted Postgres attachment.",
  },
];

const previewCards = [
  {
    eyebrow: "Consumer lane",
    title: "Shopper sign-in",
    copy: "Nearby sealed deals, ending-soon cards, and a dedicated Google entry that lands in the shopper setup flow.",
    href: "/signin/consumer",
    cta: "Continue as shopper",
    accent:
      "from-[#ff6a44] via-[#ff7f59] to-[#ffad74] text-white shadow-[0_30px_90px_rgba(247,93,54,0.28)]",
  },
  {
    eyebrow: "Business lane",
    title: "Seller sign-in",
    copy: "Recovery metrics, auction status snapshots, and a separate Google lane reserved for store accounts.",
    href: "/signin/business",
    cta: "Continue as seller",
    accent:
      "from-[#244f3f] via-[#2f624f] to-[#4a8b71] text-white shadow-[0_30px_90px_rgba(32,74,61,0.22)]",
  },
];

export default async function Home() {
  const session = await getSession();

  if (
    session?.user?.role &&
    session.user.onboardingCompletedAt
  ) {
    redirect(getRoleHome(session.user.role));
  }

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_22px_90px_rgba(64,38,17,0.12)] backdrop-blur">
          <Wordmark subtitle="Rescue-market shell" />
          <span className="rounded-full border border-[#f5c5a6] bg-[#fff3e7] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#a24829]">
            Through phase 6
          </span>
        </header>

        <section className="relative overflow-hidden rounded-[2.7rem] bg-[linear-gradient(145deg,#2e1b17_0%,#6f2d1b_42%,#f75d36_100%)] px-10 pb-12 pt-12 text-white shadow-[0_40px_120px_rgba(122,44,25,0.32)]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,245,222,0.28),transparent_62%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-center">
            <div>
              <p className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ffe8cf]">
                Sealed grocery deals before the bin
              </p>
              <h1 className="mt-6 max-w-[18ch] text-[clamp(2.75rem,5vw,4.6rem)] leading-[0.92] font-semibold tracking-[-0.05em] text-balance">
                Auction surplus while it still has a perfect pickup window.
              </h1>
              <p className="mt-5 max-w-[40rem] text-base leading-7 text-[#ffe8d5]/92">
                Ratatouille gives corner stores a fast lane for sealed inventory
                that is close to expiry. Shoppers see nearby deals, stores
                recover margin, and both sides share the same web shell.
              </p>
            </div>
            <div className="grid gap-4">
              {previewCards.map((card) => (
                <AuthLaneCard
                  key={card.href}
                  href={card.href}
                  eyebrow={card.eyebrow}
                  title={card.title}
                  copy={card.copy}
                  cta={card.cta}
                  accent={card.accent}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickHits.map((item) => (
            <article
              key={item.label}
              className="rounded-[1.8rem] border border-white/70 bg-[rgba(255,248,240,0.82)] p-5 shadow-[0_18px_60px_rgba(52,30,17,0.08)] backdrop-blur"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#a15a3a]">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#433126]">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-3 rounded-[2.2rem] border border-[#e8cfbe] bg-[rgba(255,244,232,0.8)] p-6 shadow-[0_24px_80px_rgba(77,47,27,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8f4a31]">
                Tonight on deck
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#241510]">
                One home, two clear lanes.
              </h2>
            </div>
            <span className="rounded-full bg-[#234d3d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#eff8f4]">
              Web shell
            </span>
          </div>
          <p className="max-w-[60rem] text-sm leading-7 text-[#50392d]">
            The landing page stays simple: shoppers head into a consumer shell,
            stores pivot into an inventory-recovery shell, and both share the
            same brand system and navigation rhythm.
          </p>
        </section>
      </div>
    </main>
  );
}
