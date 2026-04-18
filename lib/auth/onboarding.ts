import "server-only";

import { redirect } from "next/navigation";

import type { AppRole } from "./roles";
import { getRoleHome, getRoleOnboardingPath, requireRole } from "./roles";
import { requireSession } from "./session";

export function isOnboardingComplete(
  completedAt: Date | string | null | undefined,
): boolean {
  return Boolean(completedAt);
}

export async function requireCompletedRole(role: AppRole) {
  const session = await requireRole(role);

  if (!isOnboardingComplete(session.user.onboardingCompletedAt)) {
    redirect(getRoleOnboardingPath(role));
  }

  return session;
}

export async function redirectAuthenticatedUser(role: AppRole) {
  const session = await requireSession();

  const userRole = session.user.role;

  if (userRole === role && isOnboardingComplete(session.user.onboardingCompletedAt)) {
    redirect(getRoleHome(role));
  }

  if (userRole && userRole !== role) {
    redirect(getRoleHome(userRole));
  }

  redirect(getRoleOnboardingPath(role));
}
