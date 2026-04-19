import type { ReactNode } from "react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: SidebarIconName;
};

export type SidebarIconName =
  | "dashboard"
  | "listings"
  | "live"
  | "outcomes"
  | "demo"
  | "fulfillment";

type SidebarShellProps = {
  activeHref: string;
  navItems: SidebarNavItem[];
  businessName: string;
  businessInitial?: string;
  pageTitle: string;
  pageDescription?: string;
  pageEyebrow?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

function SidebarIcon({ icon }: { icon: SidebarIconName }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
  };

  switch (icon) {
    case "dashboard":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-4v-7h-8v7H4a1 1 0 0 1-1-1Z" />
        </svg>
      );
    case "listings":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <rect {...shared} x="3.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect {...shared} x="13.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect {...shared} x="3.5" y="13.5" width="7" height="7" rx="1.4" />
          <rect {...shared} x="13.5" y="13.5" width="7" height="7" rx="1.4" />
        </svg>
      );
    case "live":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2.1 2.1m-4.8 4.8-2.1 2.1m9 0-2.1-2.1m-4.8-4.8L7.5 5.5" />
        </svg>
      );
    case "outcomes":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="M3 17V8m6 9V5m6 12v-7m6 7v-4" />
        </svg>
      );
    case "demo":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <circle {...shared} cx="9" cy="9" r="3" />
          <circle {...shared} cx="17" cy="10" r="2.4" />
          <path {...shared} d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4 4 0 0 1 6.5-3.1" />
        </svg>
      );
    case "fulfillment":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
          <path {...shared} d="M3 7h11v9H3Zm11 3h3l3 3v3h-6" />
          <circle {...shared} cx="8" cy="18" r="1.6" />
          <circle {...shared} cx="18" cy="18" r="1.6" />
        </svg>
      );
  }
}

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-[#9a9a9a]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 text-[#9a9a9a]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
    >
      <path d="M16.5 4.5 19.5 7.5M4 20l3.6-.6L19 8 16 5 4.6 16.4Z" />
    </svg>
  );
}

function BusinessAvatar({
  initial,
  size = "md",
}: {
  initial: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-sm";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[0.65rem] bg-[#f1e7da] font-semibold text-[#b54824] ${sizeClass}`}
    >
      {initial}
    </span>
  );
}

export function SidebarShell({
  activeHref,
  navItems,
  businessName,
  businessInitial,
  pageTitle,
  pageDescription,
  pageEyebrow,
  headerActions,
  children,
}: SidebarShellProps) {
  const initial = (businessInitial ?? businessName.trim().charAt(0) ?? "S").toUpperCase();

  return (
    <div className="min-h-screen w-full bg-[#f3f3f3] text-[#1a1a1a]">
      <div className="flex min-h-screen w-full items-start">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-[#eaeaea] bg-[#f7f7f7] px-4 py-5 lg:flex">
          <Link
            href="/sell"
            className="flex items-center gap-2 px-2 pb-5 text-[1.05rem] font-semibold tracking-tight text-[#1a1a1a]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-[#1a1a1a] text-white">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[14px] w-[14px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 7h14l-1.4 9.4a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.6Zm3-3 1 3m6-3-1 3" />
              </svg>
            </span>
            Seller
          </Link>

          <button
            type="button"
            className="mb-4 flex items-center justify-between gap-2 rounded-[0.85rem] border border-[#eaeaea] bg-white px-3 py-2.5 text-left transition hover:border-[#dcdcdc]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <BusinessAvatar initial={initial} />
              <span className="min-w-0">
                <span className="block text-[0.7rem] font-medium text-[#7a7a7a]">
                  Shop viewing
                </span>
                <span className="block truncate text-sm font-semibold text-[#1a1a1a]">
                  {businessName}
                </span>
              </span>
            </span>
            <ChevronDown />
          </button>

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
                      ? "bg-white font-semibold text-[#1a1a1a] shadow-[0_1px_2px_rgba(15,15,15,0.04)]"
                      : "font-medium text-[#5a5a5a] hover:bg-white/70 hover:text-[#1a1a1a]"
                  }`}
                >
                  <span
                    className={
                      active ? "text-[#1a1a1a]" : "text-[#7a7a7a]"
                    }
                  >
                    <SidebarIcon icon={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 px-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
              Sales channels
            </p>
            <div className="mt-2.5 flex items-center gap-2.5 rounded-[0.75rem] px-2 py-2">
              <BusinessAvatar initial={initial} size="sm" />
              <span className="flex-1 truncate text-sm font-medium text-[#1a1a1a]">
                {businessName}
              </span>
              <button
                type="button"
                aria-label="Edit shop"
                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#eaeaea] bg-white"
              >
                <PencilIcon />
              </button>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <SignOutButton
              className="inline-flex w-full items-center justify-center rounded-[0.75rem] border border-[#eaeaea] bg-white px-3 py-2.5 text-sm font-medium text-[#5a5a5a] transition hover:border-[#dcdcdc] hover:text-[#1a1a1a]"
              label="Sign out"
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {headerActions ? (
            <header className="flex items-center justify-end gap-3 border-b border-[#eaeaea] bg-[#f7f7f7] px-5 py-3 lg:px-8">
              {headerActions}
            </header>
          ) : null}

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
