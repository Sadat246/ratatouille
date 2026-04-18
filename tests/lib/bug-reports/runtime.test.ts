import { describe, expect, it } from "vitest";

import {
  appendBugReportAction,
  shouldTrackBugReportRequest,
} from "@/lib/bug-reports/client-runtime";

describe("appendBugReportAction", () => {
  it("keeps only the most recent actions", () => {
    const next = Array.from({ length: 12 }).reduce((actions, _, index) => {
      return appendBugReportAction(actions, {
        at: `2026-04-18T22:00:${String(index).padStart(2, "0")}.000Z`,
        kind: "click",
        label: `Clicked ${index}`,
        detail: null,
        status: null,
      });
    }, [] as ReturnType<typeof appendBugReportAction>);

    expect(next).toHaveLength(10);
    expect(next[0]?.label).toBe("Clicked 2");
    expect(next.at(-1)?.label).toBe("Clicked 11");
  });
});

describe("shouldTrackBugReportRequest", () => {
  it("tracks same-origin API requests and mutation requests, but ignores the bug-report endpoint itself", () => {
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          origin: "https://ratatouille.vercel.app",
        },
      },
      configurable: true,
    });

    expect(
      shouldTrackBugReportRequest(
        "https://ratatouille.vercel.app/api/consumer/setup-intent",
        "POST",
      ),
    ).toBe(true);
    expect(
      shouldTrackBugReportRequest("https://ratatouille.vercel.app/shop/orders", "POST"),
    ).toBe(true);
    expect(
      shouldTrackBugReportRequest("https://ratatouille.vercel.app/api/bug-reports", "POST"),
    ).toBe(false);
    expect(
      shouldTrackBugReportRequest("https://cdn.example.com/script.js", "GET"),
    ).toBe(false);
  });
});
