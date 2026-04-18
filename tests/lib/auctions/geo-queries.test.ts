import { describe, expect, it } from "vitest";

import { computeHaversine } from "@/lib/auctions/geo";

describe("computeHaversine", () => {
  it("Test 1: same point returns 0.0 miles", () => {
    const result = computeHaversine(37.7749, -122.4194, 37.7749, -122.4194);
    expect(result).toBeCloseTo(0.0, 5);
  });

  it("Test 2: SF to Oakland returns approx 8.3 miles (outside 5-mile radius)", () => {
    // San Francisco (37.7749, -122.4194) to Oakland (37.8044, -122.2712)
    // Using spherical law of cosines formula: actual distance ~8.3 miles
    const result = computeHaversine(37.7749, -122.4194, 37.8044, -122.2712);
    expect(result).toBeGreaterThan(8.3 - 0.5);
    expect(result).toBeLessThan(8.3 + 0.5);
  });

  it("Test 3: SF internal point returns approx 2.0 miles (inside 5-mile radius)", () => {
    // SF internal point — actual distance ~2.0 miles using spherical law of cosines
    const result = computeHaversine(37.7749, -122.4194, 37.7955, -122.3937);
    expect(result).toBeGreaterThan(2.0 - 0.5);
    expect(result).toBeLessThan(2.0 + 0.5);
  });

  it("Test 4: LEAST(1.0) guard — exact same coordinates returns 0 miles, not NaN or error", () => {
    // Math.min(1.0, 1.0) path — inner product will be exactly 1.0, acos(1.0) = 0
    const result = computeHaversine(45.0, -90.0, 45.0, -90.0);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});
