import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { consumerProfiles } from "@/db/schema";

import { stripe } from "./stripe";

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
}): Promise<string> {
  const profile = await db.query.consumerProfiles.findFirst({
    columns: { id: true, stripeCustomerId: true },
    where: (table, operators) => operators.eq(table.userId, params.userId),
  });

  if (!profile) {
    throw new Error(
      `getOrCreateStripeCustomer: no consumer profile for user ${params.userId}`,
    );
  }

  if (profile.stripeCustomerId) {
    return profile.stripeCustomerId;
  }

  const customer = await stripe.customers.create(
    {
      email: params.email,
      metadata: { userId: params.userId },
    },
    { idempotencyKey: `customer:${params.userId}` },
  );

  await db
    .update(consumerProfiles)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(consumerProfiles.userId, params.userId));

  return customer.id;
}
