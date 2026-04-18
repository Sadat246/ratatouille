import "server-only";

import type { Session } from "next-auth";

import { isOnboardingComplete } from "./onboarding";
import type { AppRole } from "./roles";
import { getSession } from "./session";

export type ApiRoleAuthorization =
  | {
      ok: true;
      session: Session;
    }
  | {
      ok: false;
      status: number;
      body: {
        ok: false;
        error: {
          code: string;
          message: string;
        };
      };
    };

export async function authorizeApiRole(role: AppRole): Promise<ApiRoleAuthorization> {
  const session = await getSession();

  if (!session?.user) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "Sign in before using auction APIs.",
        },
      },
    };
  }

  if (session.user.role !== role) {
    return {
      ok: false,
      status: 403,
      body: {
        ok: false,
        error: {
          code: "ROLE_FORBIDDEN",
          message: `Only ${role} accounts can use this endpoint.`,
        },
      },
    };
  }

  if (!isOnboardingComplete(session.user.onboardingCompletedAt)) {
    return {
      ok: false,
      status: 403,
      body: {
        ok: false,
        error: {
          code: "ONBOARDING_REQUIRED",
          message: "Finish onboarding before using auction APIs.",
        },
      },
    };
  }

  return {
    ok: true,
    session,
  };
}
