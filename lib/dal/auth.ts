import "server-only";

import { cache } from "react";

import { db } from "@/db/client";

export const getUserById = cache(async (userId: string) => {
  return db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });
});

export const getUserRoleState = cache(async (userId: string) => {
  return db.query.users.findFirst({
    columns: {
      id: true,
      role: true,
      onboardingCompletedAt: true,
    },
    where: (table, { eq }) => eq(table.id, userId),
  });
});
