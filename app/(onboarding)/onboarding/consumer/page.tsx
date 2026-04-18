import { redirect } from "next/navigation";

import { ConsumerWizard } from "@/components/onboarding/consumer-wizard";
import { requireSession } from "@/lib/auth/session";

import { completeConsumerOnboarding } from "./actions";

export default async function ConsumerOnboardingPage() {
  const session = await requireSession("/signin/consumer");

  if (session.user.role === "business") {
    redirect("/sell");
  }

  if (session.user.role === "consumer" && session.user.onboardingCompletedAt) {
    redirect("/shop");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-4 sm:max-w-lg">
        <section className="rounded-[2.2rem] bg-[linear-gradient(145deg,#f75d36_0%,#ff8a60_45%,#ffbf87_100%)] p-5 text-white shadow-[0_35px_110px_rgba(247,93,54,0.28)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/74">
            Shopper onboarding
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
            Set your location once so nearby deals stay fast.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/90">
            This is the minimum shopper setup for Phase 2: where to browse, the
            name other people see, and the address that can be ready for
            delivery later.
          </p>
        </section>

        <ConsumerWizard
          action={completeConsumerOnboarding}
          defaultName={session.user.name ?? ""}
        />
      </div>
    </main>
  );
}
