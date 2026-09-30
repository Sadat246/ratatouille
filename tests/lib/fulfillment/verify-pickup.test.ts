import { beforeEach, describe, expect, it, vi } from "vitest";

const sets: Record<string, unknown>[] = [];
let lockedRow: Record<string, unknown> | null = null;

vi.mock("@/db/interactive", () => ({
  getInteractiveDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        execute: async () => ({ rows: lockedRow ? [lockedRow] : [] }),
        update: () => ({
          set: (values: Record<string, unknown>) => {
            sets.push(values);
            return { where: async () => undefined };
          },
        }),
      }),
  }),
}));

import { verifyPickupForBusiness } from "@/lib/fulfillment/service";

function row(status: string) {
  return {
    id: "f1",
    settlementId: "s1",
    status,
    pickupCode: "K7P3X9MQ",
    pickupCodeExpiresAt: new Date(Date.now() + 3_600_000),
  };
}

describe("verifyPickupForBusiness (pilot pickup-only)", () => {
  beforeEach(() => {
    sets.length = 0;
  });

  it("marks a pending_choice row picked_up with pickup mode columns", async () => {
    lockedRow = row("pending_choice");
    await verifyPickupForBusiness("f1", "u1", "k7p3 x9mq");
    expect(sets[0]).toMatchObject({
      status: "picked_up",
      mode: "pickup",
      deliveryProvider: "none",
    });
    expect(sets[1]).toMatchObject({ status: "completed" });
  });

  it("marks a ready_for_pickup row picked_up", async () => {
    lockedRow = row("ready_for_pickup");
    await verifyPickupForBusiness("f1", "u1", "K7P3X9MQ");
    expect(sets[0]).toMatchObject({ status: "picked_up" });
    expect(sets[1]).toMatchObject({ status: "completed" });
  });

  it("still rejects other statuses and wrong codes", async () => {
    lockedRow = row("delivery_requested");
    await expect(verifyPickupForBusiness("f1", "u1", "K7P3X9MQ")).rejects.toThrow(
      "not ready",
    );
    lockedRow = row("pending_choice");
    await expect(verifyPickupForBusiness("f1", "u1", "AAAAAAAA")).rejects.toThrow(
      "does not match",
    );
    expect(sets).toHaveLength(0);
  });
});
