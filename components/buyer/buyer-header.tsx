"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type BuyerHeaderProps = {
  activeHref: string;
  signOutSlot: ReactNode;
};

export function BuyerHeader({
  activeHref,
  signOutSlot,
}: BuyerHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmed = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams();
    if (trimmed) {
      params.set("q", trimmed);
    }
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#ececec] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 py-4 lg:px-10">
        <Link href="/shop" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[#3d8d5c] text-white">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="h-6 w-6" fill="currentColor">
              <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em] text-[#1a1a1a]">
            Ratatouille<span className="text-[#3d8d5c]">.</span>
          </span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="hidden flex-1 items-center overflow-hidden rounded-full border border-[#e4e4e4] bg-white focus-within:border-[#3d8d5c] md:flex"
        >
          <button
            type="button"
            className="flex items-center gap-2 border-r border-[#e4e4e4] px-4 py-2.5 text-sm font-medium text-[#4a4a4a] hover:bg-[#fafafa]"
            onClick={() => {
              const categorySection = document.getElementById("shop-categories");
              categorySection?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            All Category
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className="flex flex-1 items-center gap-2 px-4">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#9a9a9a]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              key={queryParam}
              name="q"
              defaultValue={queryParam}
              type="search"
              placeholder="Search food deals or stores near you…"
              className="flex-1 bg-transparent py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/shop/bids"
            aria-label="My bids"
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e4] text-[#4a4a4a] transition-colors hover:border-[#3d8d5c] hover:text-[#3d8d5c] ${
              activeHref === "/shop/bids" ? "border-[#3d8d5c] text-[#3d8d5c]" : ""
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8h12l-1 12H7ZM9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </Link>
          {signOutSlot}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-7xl px-6 pb-3 md:hidden">
        <div className="flex items-center overflow-hidden rounded-full border border-[#e4e4e4] bg-white focus-within:border-[#3d8d5c]">
          <div className="flex flex-1 items-center gap-2 px-4">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#9a9a9a]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              key={queryParam}
              name="q"
              defaultValue={queryParam}
              type="search"
              placeholder="Search deals…"
              className="flex-1 bg-transparent py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#9a9a9a]"
            />
          </div>
        </div>
      </form>
    </header>
  );
}
