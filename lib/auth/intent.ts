import type { AppRole } from "./roles";
import { getRoleHome, getRoleOnboardingPath } from "./roles";

type RoleLike = AppRole | null;

function hasCompletedOnboarding(
  onboardingCompletedAt: Date | string | null | undefined,
) {
  return Boolean(onboardingCompletedAt);
}

export function getPostAuthPath(role: AppRole) {
  return `/auth/finish/${role}`;
}

export function hasRoleConflict(requestedRole: AppRole, actualRole: RoleLike) {
  return Boolean(actualRole && actualRole !== requestedRole);
}

export function resolveSignedInDestination(
  requestedRole: AppRole,
  actualRole: RoleLike,
  onboardingCompletedAt: Date | string | null | undefined,
) {
  if (!actualRole) {
    return getRoleOnboardingPath(requestedRole);
  }

  if (actualRole !== requestedRole) {
    return getRoleHome(actualRole);
  }

  if (!hasCompletedOnboarding(onboardingCompletedAt)) {
    return getRoleOnboardingPath(actualRole);
  }

  return getRoleHome(actualRole);
}
