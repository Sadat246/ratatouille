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
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-4 sm:max-w-lg">
        <section className="rounded-[2.2rem] bg-[linear-gradient(145deg,#1d3e32_0%,#2c5e49_45%,#6bb08d_100%)] p-5 text-white shadow-[0_35px_110px_rgba(31,77,61,0.24)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/74">
            Seller onboarding
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
            Lock in the storefront before listings start moving.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/90">
            Phase 2 captures the seller basics only: store identity, a real
            pickup address, and the contact details that later auction handoffs
            will rely on.
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
