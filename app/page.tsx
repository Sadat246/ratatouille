import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { InstallCard } from "@/components/pwa/install-card";

const quickHits = [
  {
    label: "Sealed only",
    value: "Product, seal, and expiry proof stay visible from the first listing flow.",
  },
  {
    label: "Tonight's energy",
    value: "Timed auctions, instant buyout, and pickup-ready UX from a phone-first shell.",
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
    title: "Consumer lane",
    copy: "Nearby sealed deals, ending soon cards, and a bottom-nav shell tuned for thumb reach.",
    href: "/shop",
    cta: "Preview shopper shell",
    accent:
      "from-[#ff6a44] via-[#ff7f59] to-[#ffad74] text-white shadow-[0_30px_90px_rgba(247,93,54,0.28)]",
  },
  {
    title: "Business lane",
    copy: "Recovery metrics, auction status snapshots, and handoff workflows for store staff.",
    href: "/sell",
    cta: "Preview business shell",
    accent:
      "from-[#244f3f] via-[#2f624f] to-[#4a8b71] text-white shadow-[0_30px_90px_rgba(32,74,61,0.22)]",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 pb-20 pt-5 sm:px-6 sm:pb-12">
      <div className="mx-auto flex max-w-md flex-col gap-4 sm:max-w-lg">
        <section className="rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_22px_90px_rgba(64,38,17,0.12)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Wordmark subtitle="Rescue-market shell" />
            <span className="rounded-full border border-[#f5c5a6] bg-[#fff3e7] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#a24829]">
              Phase 1 live
            </span>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2.7rem] bg-[linear-gradient(145deg,#2e1b17_0%,#6f2d1b_42%,#f75d36_100%)] px-5 pb-6 pt-6 text-white shadow-[0_40px_120px_rgba(122,44,25,0.32)]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,245,222,0.28),transparent_62%)]" />
          <div className="relative">
            <p className="max-w-[14rem] rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ffe8cf]">
              Sealed grocery deals before the bin
            </p>
            <h1 className="mt-6 max-w-[14ch] text-[clamp(2.75rem,8vw,4.6rem)] leading-[0.92] font-semibold tracking-[-0.05em] text-balance">
              Auction surplus while it still has a perfect pickup window.
            </h1>
            <p className="mt-5 max-w-[28rem] text-sm leading-7 text-[#ffe8d5]/92 sm:text-base">
              Ratatouille gives corner stores a fast lane for sealed inventory
              that is close to expiry. Shoppers see nearby deals, stores recover
              margin, and the whole flow feels like a real mobile marketplace
              from the first screen.
            </p>
            <div className="mt-6 grid gap-3">
              {previewCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`group rounded-[1.9rem] bg-gradient-to-br p-4 transition-transform duration-200 hover:-translate-y-0.5 ${card.accent}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/72">
                        {card.title}
                      </p>
                      <p className="mt-3 text-base leading-7 text-white/92">
                        {card.copy}
                      </p>
                    </div>
                    <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl transition-transform duration-200 group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white/88">
                    {card.cta}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {quickHits.map((item) => (
            <article
              key={item.label}
              className="rounded-[1.8rem] border border-white/70 bg-[rgba(255,248,240,0.82)] p-4 shadow-[0_18px_60px_rgba(52,30,17,0.08)] backdrop-blur"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#a15a3a]">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#433126]">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-3 rounded-[2.2rem] border border-[#e8cfbe] bg-[rgba(255,244,232,0.8)] p-5 shadow-[0_24px_80px_rgba(77,47,27,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#8f4a31]">
                Tonight on deck
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#241510]">
                One home, two clear lanes.
              </h2>
            </div>
            <span className="rounded-full bg-[#234d3d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#eff8f4]">
              Mobile first
            </span>
          </div>
          <p className="text-sm leading-7 text-[#50392d]">
            The landing page stays simple: shoppers head into a consumer shell,
            stores pivot into an inventory-recovery shell, and both already
            share the same brand system, navigation rhythm, and installable app
            baseline.
          </p>
        </section>

        <InstallCard />
      </div>
    </main>
  );
}
