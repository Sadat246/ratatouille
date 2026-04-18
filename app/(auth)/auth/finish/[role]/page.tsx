import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSession } from "@/lib/auth/session";
import {
  hasRoleConflict,
  resolveSignedInDestination,
} from "@/lib/auth/intent";
import { isAppRole } from "@/lib/auth/roles";

export default async function AuthFinishPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  if (!isAppRole(role)) {
    notFound();
  }

  const session = await getSession();

  if (!session?.user) {
    redirect(`/signin/${role}`);
  }

  if (!hasRoleConflict(role, session.user.role)) {
    redirect(
      resolveSignedInDestination(
        role,
        session.user.role,
        session.user.onboardingCompletedAt,
      ),
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-md gap-4 sm:max-w-lg">
        <section className="rounded-[2.2rem] border border-white/70 bg-white/78 p-5 shadow-[0_28px_90px_rgba(54,31,19,0.12)] backdrop-blur">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#9a5537]">
            Wrong account
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#1f1410]">
            That Google account already belongs to the other lane.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#5a4134]">
            Phase 2 keeps shopper and seller roles on separate Google accounts
            so the product never has to ask which mode you meant.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <SignOutButton label="Use a different Google account" />
            <Link
              href={session.user.role === "business" ? "/sell" : "/shop"}
              className="inline-flex items-center justify-center rounded-full border border-[#d6c0b1] px-4 py-2 text-sm font-semibold text-[#452f25]"
            >
              Return to current lane
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
