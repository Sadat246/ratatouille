import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleIntentButton } from "@/components/auth/google-intent-button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSession } from "@/lib/auth/session";
import {
  hasRoleConflict,
  resolveSignedInDestination,
} from "@/lib/auth/intent";
import { isGoogleAuthConfigured } from "@/lib/auth/providers";

export default async function ConsumerSignInPage() {
  const session = await getSession();

  if (session?.user) {
    if (
      !hasRoleConflict("consumer", session.user.role) &&
      (session.user.role === "consumer" || session.user.role === null)
    ) {
      redirect(
        resolveSignedInDestination(
          "consumer",
          session.user.role,
          session.user.onboardingCompletedAt,
        ),
      );
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-4 sm:max-w-lg">
        <section className="rounded-[2.2rem] border border-white/70 bg-white/78 p-5 shadow-[0_28px_90px_rgba(62,37,20,0.12)] backdrop-blur">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#a45a3a]">
            Consumer sign-in
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#1f1410]">
            Shop sealed deals without crossing into seller mode.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#5a4134]">
            This lane is for shoppers only. One Google tap gets you into the
            consumer onboarding flow, then into the nearby-deals shell.
          </p>
        </section>

        <section className="rounded-[2.3rem] bg-[linear-gradient(145deg,#f75d36_0%,#ff8a60_45%,#ffbf87_100%)] p-5 text-white shadow-[0_35px_110px_rgba(247,93,54,0.28)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/74">
            Shopper lane
          </p>
          <p className="mt-4 text-sm leading-7 text-white/90">
            Use the Google account you want tied to your shopper role. If you
            already used a different Google account for the seller side, keep
            them separate here too.
          </p>

          <div className="mt-6">
            {session?.user && hasRoleConflict("consumer", session.user.role) ? (
              <div className="rounded-[1.8rem] border border-white/18 bg-white/12 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/74">
                  Already signed in as a seller
                </p>
                <p className="mt-3 text-sm leading-7 text-white/90">
                  Consumer and business roles stay on separate Google accounts
                  in v1. Sign out and continue with the shopper account instead.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <SignOutButton
                    className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#7f321f] transition hover:bg-[#fff1e8]"
                    label="Sign out"
                  />
                  <Link
                    href="/sell"
                    className="inline-flex items-center justify-center rounded-full border border-white/26 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Go to seller shell
                  </Link>
                </div>
              </div>
            ) : isGoogleAuthConfigured ? (
              <GoogleIntentButton
                role="consumer"
                label="Continue with Google"
              />
            ) : (
              <div className="rounded-[1.8rem] border border-white/18 bg-white/12 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/74">
                  Google auth not configured here yet
                </p>
                <p className="mt-3 text-sm leading-7 text-white/90">
                  The consumer lane is wired, but this environment still needs
                  Google OAuth credentials before a live sign-in can complete.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
