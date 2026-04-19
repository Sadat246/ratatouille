import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ConsumerAuthIllustration } from "@/components/auth/consumer-auth-illustration";
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
    <AuthSplitLayout
      eyebrow="Shopper sign-in"
      title="Welcome back, shopper."
      subtitle="One Google tap gets you into nearby sealed grocery deals before they expire."
      illustration={<ConsumerAuthIllustration />}
      footerText="Looking to list surplus instead?"
      footerLinkLabel="Switch to seller sign-in"
      footerLinkHref="/signin/business"
    >
      {session?.user && hasRoleConflict("consumer", session.user.role) ? (
        <div className="rounded-[1.2rem] border border-[#eaeaea] bg-[#f7fbf8] p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#1e5a37]">
            Already signed in as a seller
          </p>
          <p className="mt-3 text-sm leading-6 text-[#4a4a4a]">
            Consumer and business roles stay on separate Google accounts in
            v1. Sign out and continue with the shopper account instead.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <SignOutButton
              className="inline-flex items-center justify-center rounded-full bg-[#3d8d5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e5a37]"
              label="Sign out"
            />
            <Link
              href="/sell"
              className="inline-flex items-center justify-center rounded-full border border-[#eaeaea] bg-white px-4 py-2 text-sm font-semibold text-[#1a1a1a] transition hover:border-[#3d8d5c]"
            >
              Go to seller shell
            </Link>
          </div>
        </div>
      ) : isGoogleAuthConfigured ? (
        <GoogleIntentButton role="consumer" label="Continue with Google" />
      ) : (
        <div className="rounded-[1.2rem] border border-[#eaeaea] bg-[#fafafa] p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#6b6b6b]">
            Google auth not configured here yet
          </p>
          <p className="mt-3 text-sm leading-6 text-[#4a4a4a]">
            The consumer lane is wired, but this environment still needs
            Google OAuth credentials before a live sign-in can complete.
          </p>
        </div>
      )}
    </AuthSplitLayout>
  );
}
