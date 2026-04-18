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

export default async function BusinessSignInPage() {
  const session = await getSession();

  if (session?.user) {
    if (
      !hasRoleConflict("business", session.user.role) &&
      (session.user.role === "business" || session.user.role === null)
    ) {
      redirect(
        resolveSignedInDestination(
          "business",
          session.user.role,
          session.user.onboardingCompletedAt,
        ),
      );
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col gap-4 sm:max-w-lg">
        <section className="rounded-[2.2rem] border border-white/70 bg-white/78 p-5 shadow-[0_28px_90px_rgba(48,41,29,0.12)] backdrop-blur">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#486957]">
            Business sign-in
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#1f1410]">
            Recover inventory with a dedicated seller account.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#5a4134]">
            This lane is reserved for store accounts. Use a separate Google
            identity from the shopper side so the seller shell stays clean.
          </p>
        </section>

        <section className="rounded-[2.3rem] bg-[linear-gradient(145deg,#1d3e32_0%,#2c5e49_45%,#6bb08d_100%)] p-5 text-white shadow-[0_35px_110px_rgba(31,77,61,0.24)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/74">
            Seller lane
          </p>
          <p className="mt-4 text-sm leading-7 text-white/90">
            Continue with the Google account you want to tie to store
            operations, pickup contacts, and listing creation.
          </p>

          <div className="mt-6">
            {session?.user && hasRoleConflict("business", session.user.role) ? (
              <div className="rounded-[1.8rem] border border-white/18 bg-white/12 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/74">
                  Already signed in as a shopper
                </p>
                <p className="mt-3 text-sm leading-7 text-white/90">
                  Business and consumer roles stay on separate Google accounts in
                  v1. Sign out and continue with the seller account instead.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <SignOutButton
                    className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1f4c39] transition hover:bg-[#eefaf4]"
                    label="Sign out"
                  />
                  <Link
                    href="/shop"
                    className="inline-flex items-center justify-center rounded-full border border-white/26 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Go to shopper shell
                  </Link>
                </div>
              </div>
            ) : isGoogleAuthConfigured ? (
              <GoogleIntentButton
                role="business"
                label="Continue with Google"
              />
            ) : (
              <div className="rounded-[1.8rem] border border-white/18 bg-white/12 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/74">
                  Google auth not configured here yet
                </p>
                <p className="mt-3 text-sm leading-7 text-white/90">
                  The seller lane is wired, but this environment still needs
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
