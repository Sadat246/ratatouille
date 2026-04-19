import type { ReactNode } from "react";

import { SidebarShell, type SidebarNavItem } from "@/components/shell/sidebar-shell";
import { isDemoModeEnabled } from "@/lib/demo/config";

type SellerShellProps = {
  activeHref: string;
  badge: string;
  title: string;
  description: string;
  businessName: string;
  /**
   * Kept for backward compatibility with prior gradient hero — now ignored
   * by the cleaner sidebar layout.
   */
  heroClassName?: string;
  children: ReactNode;
};

const sellerNavItems: SidebarNavItem[] = [
  { href: "/sell", label: "Dashboard", icon: "dashboard" },
  { href: "/sell/auctions", label: "Live auctions", icon: "live" },
  { href: "/sell/outcomes", label: "Outcomes", icon: "outcomes" },
];

export function SellerShell({
  activeHref,
  badge,
  title,
  description,
  businessName,
  children,
}: SellerShellProps) {
  const navItems = isDemoModeEnabled()
    ? [
        ...sellerNavItems,
        { href: "/sell/demo", label: "Demo", icon: "demo" as const },
      ]
    : sellerNavItems;

  return (
    <SidebarShell
      activeHref={activeHref}
      navItems={navItems}
      businessName={businessName}
      pageEyebrow={badge}
      pageTitle={title}
      pageDescription={description}
    >
      {children}
    </SidebarShell>
  );
}
