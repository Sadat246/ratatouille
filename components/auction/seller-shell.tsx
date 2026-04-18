import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ShellFrame } from "@/components/shell/shell-frame";

type SellerShellProps = {
  activeHref: string;
  badge: string;
  title: string;
  description: string;
  businessName: string;
  heroClassName?: string;
  children: ReactNode;
};

const sellerNavItems = [
  { href: "/sell", label: "Desk", icon: "chart" as const },
  { href: "/sell/auctions", label: "Live", icon: "spark" as const },
  { href: "/sell/outcomes", label: "Outcomes", icon: "box" as const },
];

export function SellerShell({
  activeHref,
  badge,
  title,
  description,
  businessName,
  heroClassName = "bg-[linear-gradient(145deg,#1d3e32_0%,#2d5b49_48%,#5ea381_100%)] text-white shadow-[0_35px_110px_rgba(33,77,61,0.28)]",
  children,
}: SellerShellProps) {
  return (
    <ShellFrame
      badge={badge}
      title={title}
      description={description}
      heroClassName={heroClassName}
      heroAside={
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#e7f7ef]">
            {businessName}
          </span>
          <SignOutButton
            className="inline-flex items-center justify-center rounded-full border border-white/26 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
            label="Sign out"
          />
        </div>
      }
      activeHref={activeHref}
      navItems={sellerNavItems}
    >
      {children}
    </ShellFrame>
  );
}
