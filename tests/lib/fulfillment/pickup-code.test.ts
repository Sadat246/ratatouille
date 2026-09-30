import { describe, expect, it } from "vitest";

import {
  formatPickupCode,
  generatePickupCode,
} from "@/lib/fulfillment/pickup-code";
import { fulfillmentPickupVerificationSchema } from "@/lib/validation/fulfillment";

const parse = (code: string) =>
  fulfillmentPickupVerificationSchema.safeParse({ code });

describe("pickup code validation", () => {
  it("accepts codes from the real generator", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generatePickupCode();
      expect(code).toHaveLength(8);
      const result = parse(code);
      expect(result.success).toBe(true);
      expect(result.success && result.data.code).toBe(code);
    }
  });

  it("accepts lowercase, spaced and dashed input", () => {
    expect(parse("k7p3x9mq").success).toBe(true);
    expect(parse(" K7P3 X9MQ ").success).toBe(true);
    const dashed = parse("k7p3-x9mq");
    expect(dashed.success && dashed.data.code).toBe("K7P3X9MQ");
  });

  it("rejects a 6-digit string", () => {
    const result = parse("482 619");
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0]?.message).toBe(
      "Enter the 8-character pickup code.",
    );
  });

  it("rejects codes with 0, 1, I or O and wrong lengths", () => {
    expect(parse("K7P3X9M0").success).toBe(false);
    expect(parse("K7P3X9M1").success).toBe(false);
    expect(parse("K7P3X9MI").success).toBe(false);
    expect(parse("K7P3X9MO").success).toBe(false);
    expect(parse("K7P3X9M").success).toBe(false);
    expect(parse("K7P3X9MQ2").success).toBe(false);
  });

  it("formats codes as 4+4", () => {
    expect(formatPickupCode("K7P3X9MQ")).toBe("K7P3 X9MQ");
    expect(formatPickupCode(null)).toBeNull();
  });
});
