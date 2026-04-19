import { Suspense, type ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BuyerHeader } from "@/components/buyer/buyer-header";

type BuyerShellProps = {
  activeHref: string;
  locationLabel: string;
  children: ReactNode;
};

export function BuyerShell({
  activeHref,
  locationLabel,
  children,
}: BuyerShellProps) {
  return (
    <div className="min-h-screen w-full bg-[#fafafa]">
      <Suspense fallback={null}>
        <BuyerHeader
          activeHref={activeHref}
          locationLabel={locationLabel}
          signOutSlot={
            <SignOutButton
              className="text-[0.72rem] font-medium text-[#6a6a6a] transition-colors hover:text-[#1a1a1a]"
              label="Sign out"
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
