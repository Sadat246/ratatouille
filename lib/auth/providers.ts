import Google from "next-auth/providers/google";

import { getOptionalEnv } from "@/lib/env";

const googleClientId = getOptionalEnv("AUTH_GOOGLE_ID");
const googleClientSecret = getOptionalEnv("AUTH_GOOGLE_SECRET");

export const isGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret,
);

export function getAuthProviders() {
  if (!isGoogleAuthConfigured) {
    return [];
  }

  return [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ];
}
