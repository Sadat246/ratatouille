import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import { BottomNav, type BottomNavItem } from "@/components/nav/bottom-nav";

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
  return (
    <main className="min-h-screen w-full overflow-x-clip px-4 pb-24 pt-5 sm:px-6 sm:pb-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 sm:max-w-lg">
        <section className="rounded-[2rem] border border-white/70 bg-white/72 p-4 shadow-[0_22px_90px_rgba(55,34,18,0.12)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Wordmark subtitle={badge} />
            {heroAside}
          </div>
        </section>

        <section
          className={`overflow-hidden rounded-[2.7rem] px-5 pb-6 pt-6 ${heroClassName}`}
        >
          <h1 className="max-w-[13ch] text-[clamp(2.4rem,8vw,4rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance">
            {title}
          </h1>
          <p className="mt-5 max-w-[29rem] text-sm leading-7 opacity-92 sm:text-base">
            {description}
          </p>
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4">{children}</div>
      </div>

      <BottomNav activeHref={activeHref} items={navItems} />
    </main>
  );
}
