import { redirect } from "next/navigation";

import { BusinessWizard } from "@/components/onboarding/business-wizard";
import { requireSession } from "@/lib/auth/session";

import { completeBusinessOnboarding } from "./actions";

export default async function BusinessOnboardingPage() {
  const session = await requireSession("/signin/business");

  if (session.user.role === "consumer") {
    redirect("/shop");
  }

  if (session.user.role === "business" && session.user.onboardingCompletedAt) {
    redirect("/sell");
  }

  return (
    <main className="min-h-screen w-full bg-[#f7f7f7] text-[#1a1a1a]">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-10 sm:py-14">
        <header className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[0.6rem] bg-[#1a1a1a] text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-[15px] w-[15px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 7h14l-1.4 9.4a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.6Zm3-3 1 3m6-3-1 3" />
            </svg>
          </span>
          <p className="text-base font-semibold tracking-tight">Ratatouille for Sellers</p>
        </header>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
            Seller onboarding
          </p>
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-tight">
            Lock in the storefront before listings start moving.
          </h1>
          <p className="max-w-[55ch] text-sm leading-6 text-[#6b6b6b]">
            Capture the seller basics: store identity, a real pickup address,
            and the contact details that later auction handoffs will rely on.
          </p>
        </section>

        <BusinessWizard
          action={completeBusinessOnboarding}
          defaultContactEmail={session.user.email ?? ""}
        />
      </div>
    </main>
  );
}
