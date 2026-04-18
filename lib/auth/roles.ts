import "server-only";

import { redirect } from "next/navigation";

import { requireSession } from "./session";

export const appRoles = ["consumer", "business"] as const;

export type AppRole = (typeof appRoles)[number];

export function isAppRole(value: string | null | undefined): value is AppRole {
  return appRoles.includes(value as AppRole);
}

export function getRoleHome(role: AppRole) {
  return role === "business" ? "/sell" : "/shop";
}

export function getRoleSignInPath(role: AppRole) {
  return `/signin/${role}`;
}

export function getRoleOnboardingPath(role: AppRole) {
  return `/onboarding/${role}`;
}

export async function requireRole(role: AppRole) {
  const session = await requireSession(getRoleSignInPath(role));
  const userRole = session.user.role;

  if (!isAppRole(userRole)) {
    redirect(getRoleOnboardingPath(role));
  }

  if (userRole !== role) {
    redirect(getRoleHome(userRole));
  }

  return session;
}
