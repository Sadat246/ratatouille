import type { NextAuthConfig } from "next-auth";

import { getOptionalEnv } from "@/lib/env";

import { getAuthProviders } from "./providers";

type GoogleProfileLike = {
  email_verified?: boolean;
};

const authSecret = getOptionalEnv("AUTH_SECRET");

export const authConfig = {
  trustHost: true,
  secret:
    authSecret ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "ratatouille-dev-auth-secret"),
  session: {
    strategy: "database",
  },
  providers: getAuthProviders(),
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const emailVerified = (profile as GoogleProfileLike | undefined)
        ?.email_verified;

      return emailVerified !== false;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role ?? null;
        session.user.onboardingCompletedAt = user.onboardingCompletedAt ?? null;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
