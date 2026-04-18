import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "consumer" | "business" | null;
      onboardingCompletedAt: Date | null;
    };
  }

  interface User {
    role: "consumer" | "business" | null;
    onboardingCompletedAt: Date | null;
  }
}
