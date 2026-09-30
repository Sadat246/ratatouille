import Link from "next/link";
import type { ReactNode } from "react";

type PreviewShellProps = {
  children: ReactNode;
};

/**
 * Public, read-only chrome for /preview. Server component on purpose: no
 * session, no router hooks, no sign-out control, and no link into /shop
 * (which redirects anonymous visitors to the sign-in wall).
 */
export function PreviewShell({ children }: PreviewShellProps) {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <header className="sticky top-0 z-30 w-full border-b border-[#ececec] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/preview" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[#3d8d5c] text-white">
              <svg aria-hidden="true" viewBox="0 0 64 64" className="h-6 w-6" fill="currentColor">
                <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-[-0.03em] text-[#1a1a1a]">
              Ratatouille<span className="text-[#3d8d5c]">.</span>
            </span>
          </Link>
          <span className="rounded-full border border-[#e4e4e4] bg-[#f7f7f7] px-3 py-1 text-xs font-medium text-[#666]">
            Read-only preview
          </span>
          <Link
            href="/signin/consumer"
            className="ml-auto rounded-full bg-[#3d8d5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#347c50]"
          >
            Sign in to bid
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
