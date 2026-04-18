import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export const getSession = cache(async () => auth());

export async function requireSession(redirectTo = "/signin/consumer") {
  const session = await getSession();

  if (!session?.user) {
    redirect(redirectTo);
  }

  return session;
}
