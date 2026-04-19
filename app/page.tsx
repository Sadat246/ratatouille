import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getRoleHome } from "@/lib/auth/roles";

function LandingWordmark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-[#3d8d5c] text-[#effaf3] shadow-[0_14px_30px_rgba(30,70,45,0.22)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          className="h-6 w-6"
          fill="currentColor"
        >
          <path d="M17 48V16h14.5c8 0 14.2 4.1 14.2 11.7 0 6.2-3.8 10-10 11.6L47 48h-8.5l-9.3-8h-4.9v8Zm8.7-15h5.1c4.4 0 6.4-1.8 6.4-4.9 0-3.2-2-4.8-6.4-4.8h-5.1Z" />
        </svg>
      </span>
      <p className="text-[1.1rem] font-semibold leading-none tracking-[-0.03em] text-[#1f1410]">
        Ratatouille
      </p>
    </div>
  );
}

const features = [
  {
    title: "Sealed only",
    body: "Every listing shows the product, an unbroken seal, and a dated label so shoppers know exactly what they are bidding on.",
  },
  {
    title: "Live auctions",
    body: "Timed auctions with an instant buyout. Bid, watch the clock, or skip the wait and take it home.",
  },
  {
    title: "Local pickup",
    body: "Geo-filtered by where you already are. The store is down the street, not across the country.",
  },
];

const steps = [
  {
    index: "01",
    title: "Stores list surplus",
    body: "Sealed inventory close to its package date goes live with a reserve and a buyout price.",
  },
  {
    index: "02",
    title: "Shoppers bid nearby",
    body: "Deals are sorted by urgency and distance. Place a bid or buy out, then pick up in person.",
  },
  {
    index: "03",
    title: "Both sides recover",
    body: "Stores avoid waste and recover margin. Shoppers get groceries for less, before they expire.",
  },
];

export default async function Home() {
  const session = await getSession();

  if (session?.user?.role && session.user.onboardingCompletedAt) {
    redirect(getRoleHome(session.user.role));
  }

  return (
    <div className="relative min-h-screen bg-white text-[#1a1a1a]">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-10">
        <LandingWordmark />
        <nav className="hidden items-center gap-8 text-sm text-[#5a5a5a] md:flex">
          <a href="#how" className="hover:text-[#1a1a1a]">
            How it works
          </a>
          <a href="#why" className="hover:text-[#1a1a1a]">
            Why Ratatouille
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/signin/business"
            className="rounded-full border border-[#e5e5e5] px-4 py-2 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f7f7f7]"
          >
            Sell surplus
          </Link>
          <Link
            href="/signin/consumer"
            className="rounded-full bg-[#3d8d5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e5a37]"
          >
            Shop deals
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_minmax(0,440px)] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-16">
        <div className="flex flex-col justify-center">
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] tracking-tight">
            Sealed grocery deals,
            <br />
            ending soon.
          </h1>
          <p className="mt-6 max-w-[42ch] text-base leading-7 text-[#5a5a5a]">
            Ratatouille is a live auction marketplace for sealed grocery items
            before they expire. Shoppers save. Stores recover margin. Nothing
            ends up in the bin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signin/consumer"
              className="inline-flex items-center gap-2 rounded-full bg-[#3d8d5c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e5a37]"
            >
              Shop deals
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/signin/business"
              className="inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f7f7f7]"
            >
              Sell surplus
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs font-medium uppercase tracking-[0.18em] text-[#9a9a9a]">
            <span>Local grocers</span>
            <span>·</span>
            <span>Corner stores</span>
            <span>·</span>
            <span>Bakeries</span>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[420px] rounded-[1.5rem] border border-[#eaeaea] bg-white p-5 shadow-[0_30px_80px_rgba(24,20,18,0.08)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f1ea] px-3 py-1 text-xs font-semibold text-[#1e5a37]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3d8d5c]" />
                Ending in 12m
              </span>
              <span className="text-xs text-[#9a9a9a]">0.4 mi away</span>
            </div>
            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-[1rem] bg-[linear-gradient(135deg,#d9efe0_0%,#82c29a_60%,#3a8858_100%)]">
              <span className="absolute right-3 top-3 rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#2f5a43]">
                Dairy
              </span>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#3d8d5c]">
              Corner Market
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">
              Greek yogurt four-pack
            </h3>
            <p className="mt-1 text-sm text-[#7a7a7a]">Vestal, NY · Best by Apr 22</p>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#eaeaea] pt-4">
              <div>
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
                  Current
                </div>
                <div className="mt-1 text-base font-semibold">$2.40</div>
              </div>
              <div>
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
                  Buyout
                </div>
                <div className="mt-1 text-base font-semibold">$4.50</div>
              </div>
              <div>
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
                  Bids
                </div>
                <div className="mt-1 text-base font-semibold">6</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="why"
        className="border-y border-[#eaeaea] bg-[#fafafa] py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3d8d5c]">
            Why Ratatouille
          </p>
          <h2 className="mt-3 max-w-[22ch] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight">
            Groceries that move before they go bad.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.25rem] border border-[#eaeaea] bg-white p-6"
              >
                <h3 className="text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5a5a5a]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#0f1f17] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8d5b8]">
            How it works
          </p>
          <h2 className="mt-3 max-w-[22ch] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight">
            Live auctions that move before food does.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.index}
                className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <p className="text-5xl font-semibold tracking-tight text-white/25">
                  {step.index}
                </p>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="rounded-[1.75rem] bg-[#0f1f17] px-8 py-14 text-white lg:px-14">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="max-w-[32ch]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8d5b8]">
                Get started
              </p>
              <h2 className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-tight">
                Rescue dinner, or list tonight&apos;s surplus.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signin/consumer"
                className="inline-flex items-center gap-2 rounded-full bg-[#3d8d5c] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e5a37]"
              >
                Shop deals
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/signin/business"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sell surplus
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#eaeaea] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-[#9a9a9a] lg:px-10">
          <p>© {new Date().getFullYear()} Ratatouille. Sealed deals, before they expire.</p>
          <div className="flex gap-6">
            <a href="#why" className="hover:text-[#1a1a1a]">
              Why
            </a>
            <a href="#how" className="hover:text-[#1a1a1a]">
              How
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
