import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ShellFrame } from "@/components/shell/shell-frame";

type ConsumerShellProps = {
  activeHref: string;
  badge: string;
  title: string;
  description: string;
  heroClassName?: string;
  locationLabel: string;
  children: ReactNode;
};

const consumerNavItems = [
  { href: "/shop", label: "Home", icon: "spark" as const },
  { href: "/shop/bids", label: "My Bids", icon: "chart" as const },
  { href: "/shop/purchases", label: "Purchases", icon: "box" as const },
  { href: "/shop/alerts", label: "Alerts", icon: "bell" as const },
];

export function ConsumerShell({
  activeHref,
  badge,
  title,
  description,
  heroClassName = "bg-[linear-gradient(145deg,#f75d36_0%,#ff8660_46%,#ffc483_100%)] text-white shadow-[0_35px_110px_rgba(247,93,54,0.3)]",
  locationLabel,
  children,
}: ConsumerShellProps) {
  return (
    <ShellFrame
      badge={badge}
      title={title}
      description={description}
      heroClassName={heroClassName}
      heroAside={
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#fff1df]">
            {locationLabel}
          </span>
          <SignOutButton
            className="inline-flex items-center justify-center rounded-full border border-white/26 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
            label="Sign out"
          />
        </div>
      }
      activeHref={activeHref}
      navItems={consumerNavItems}
    >
      {children}
    </ShellFrame>
  );
}
