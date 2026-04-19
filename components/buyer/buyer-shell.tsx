import { Suspense, type ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BuyerHeader } from "@/components/buyer/buyer-header";

type BuyerShellProps = {
  activeHref: string;
  locationLabel?: string;
  children: ReactNode;
};

export function BuyerShell({
  activeHref,
  children,
}: BuyerShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#fafafa]">
      <Suspense fallback={null}>
        <BuyerHeader
          activeHref={activeHref}
          signOutSlot={
            <SignOutButton
              ariaLabel="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e4e4] text-[#4a4a4a] transition-colors hover:border-[#3d8d5c] hover:text-[#3d8d5c]"
              label={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 12H4m0 0 4-4m-4 4 4 4M10 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" />
                </svg>
              }
            />
          }
        />
      </Suspense>
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}
