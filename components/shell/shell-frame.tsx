import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { TopNav, type TopNavItem } from "@/components/nav/top-nav";

type ShellFrameProps = {
  badge: string;
  title: string;
  description: string;
  heroClassName: string;
  heroAside: ReactNode;
  activeHref: string;
  navItems: TopNavItem[];
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
  return (
    <main className="min-h-screen w-full overflow-x-clip px-6 pb-16 pt-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_22px_90px_rgba(55,34,18,0.12)] backdrop-blur">
          <Wordmark subtitle={badge} />
          <TopNav activeHref={activeHref} items={navItems} />
        </header>

        <section
          className={`overflow-hidden rounded-[2.7rem] px-8 pb-10 pt-10 ${heroClassName}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="max-w-[18ch] text-[clamp(2.4rem,5vw,4rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance">
                {title}
              </h1>
              <p className="mt-5 max-w-[44rem] text-base leading-7 opacity-92">
                {description}
              </p>
            </div>
            {heroAside}
          </div>
        </section>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
