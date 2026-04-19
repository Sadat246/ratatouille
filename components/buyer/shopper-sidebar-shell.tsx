import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";

type ShopperNavIcon = "home" | "bids" | "purchases";

type ShopperNavItem = {
  href: string;
  label: string;
  icon: ShopperNavIcon;
};

type ShopperSidebarShellProps = {
  activeHref: string;
  shopperName: string;
  shopperLocation?: string;
  pageTitle: string;
  pageDescription?: string;
  pageEyebrow?: string;
  children: ReactNode;
};

const navItems: ShopperNavItem[] = [
  { href: "/shop", label: "Home", icon: "home" },
  { href: "/shop/bids", label: "My Bids", icon: "bids" },
  { href: "/shop/purchases", label: "Purchases", icon: "purchases" },
];

function NavIcon({ icon }: { icon: ShopperNavIcon }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
  };

  switch (icon) {
    case "home":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-4v-7h-8v7H4a1 1 0 0 1-1-1Z" />
        </svg>
      );
    case "bids":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="M6 8h12l-1 12H7ZM9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "purchases":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="m4 8 8-4 8 4-8 4Zm0 0v8l8 4 8-4V8" />
        </svg>
      );
  }
}

export function ShopperSidebarShell({
  activeHref,
  shopperName,
  shopperLocation,
  pageTitle,
  pageDescription,
  pageEyebrow,
  children,
}: ShopperSidebarShellProps) {
  const initial = (shopperName.trim().charAt(0) || "S").toUpperCase();

  return (
    <div className="min-h-screen w-full bg-[#eef3ef] text-[#1a1a1a]">
      <div className="flex min-h-screen w-full items-start">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[#d9e6dd] bg-[#f2f7f3] px-4 py-5 lg:flex">
          <Link
            href="/shop"
            className="flex items-center gap-2 px-2 pb-5 text-[1.05rem] font-semibold tracking-tight text-[#1a1a1a]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-[#3d8d5c] text-white">
              <svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                className="h-[14px] w-[14px]"
                fill="currentColor"
              >
                <path d="M17 48V16h14.5c8 0 14.2 4.1 14.2 11.7 0 6.2-3.8 10-10 11.6L47 48h-8.5l-9.3-8h-4.9v8Zm8.7-15h5.1c4.4 0 6.4-1.8 6.4-4.9 0-3.2-2-4.8-6.4-4.8h-5.1Z" />
              </svg>
            </span>
            Ratatouille
          </Link>

          <div className="mb-4 flex items-center gap-2.5 rounded-[0.85rem] border border-[#d9e6dd] bg-white px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.65rem] bg-[#dceadf] text-sm font-semibold text-[#1e5a37]">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-[0.7rem] font-medium text-[#7a7a7a]">
                Shopping as
              </p>
              <p className="truncate text-sm font-semibold text-[#1a1a1a]">
                {shopperName}
              </p>
              {shopperLocation ? (
                <p className="truncate text-[0.68rem] text-[#7a7a7a]">
                  {shopperLocation}
                </p>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = item.href === activeHref;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-[0.75rem] px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[#e6f1ea] font-semibold text-[#1e5a37] shadow-[0_1px_2px_rgba(30,90,55,0.05)]"
                      : "font-medium text-[#5a5a5a] hover:bg-white/70 hover:text-[#1e5a37]"
                  }`}
                >
                  <span
                    className={active ? "text-[#1e5a37]" : "text-[#7a7a7a]"}
                  >
                    <NavIcon icon={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <SignOutButton
              className="inline-flex w-full items-center justify-center rounded-[0.75rem] border border-[#d9e6dd] bg-white px-3 py-2.5 text-sm font-medium text-[#5a5a5a] transition hover:border-[#bcd6c3] hover:text-[#1e5a37]"
              label="Sign out"
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              <section className="flex flex-col gap-2">
                {pageEyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
                    {pageEyebrow}
                  </p>
                ) : null}
                <h1 className="text-[clamp(1.65rem,2.4vw,2.1rem)] font-semibold leading-tight tracking-tight text-[#1a1a1a]">
                  {pageTitle}
                </h1>
                {pageDescription ? (
                  <p className="max-w-[60ch] text-sm leading-6 text-[#6b6b6b]">
                    {pageDescription}
                  </p>
                ) : null}
              </section>

              <div className="flex min-w-0 flex-col gap-5">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
