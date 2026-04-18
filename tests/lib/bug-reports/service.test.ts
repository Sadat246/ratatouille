import { describe, expect, it, vi } from "vitest";

import { prepareBugReport } from "@/lib/bug-reports/shared";
import {
  createBugReportService,
  type BugReportRepository,
} from "@/lib/bug-reports/service";

const baseInput = {
  pageUrl: "https://ratatouille.vercel.app/shop/orders?filter=active",
  pagePath: "/shop/orders?filter=active",
  description:
    "I clicked confirm delivery, then it failed for user@example.com at 555-123-4567.",
  captureError: "Canvas render failed for 555 123 4567",
  screenshotDataUrl: "data:image/jpeg;base64,QUJDRA==",
  viewport: {
    width: 390,
    height: 844,
    pixelRatio: 3,
  },
  actions: [
    {
      at: "2026-04-18T22:00:00.000Z",
      kind: "page_view" as const,
      label: "Opened Orders",
    },
    {
      at: "2026-04-18T22:00:05.000Z",
      kind: "api_error" as const,
      label: "POST /api/consumer/fulfillments/123/delivery",
      detail: "500 Internal Server Error for 5551234567",
      status: 500,
    },
  ],
};

describe("prepareBugReport", () => {
  it("builds a public ID, summary, and Markdown while redacting sensitive tokens", () => {
    const prepared = prepareBugReport({
      createdAt: new Date("2026-04-18T22:00:15.000Z"),
      input: baseInput,
      randomSeed: "abc12345-seed",
      reporter: {
        role: "consumer",
        userId: "user-1",
      },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
    });

    expect(prepared.publicId).toBe("BR-20260418-ABC12345");
    expect(prepared.reporterRole).toBe("consumer");
    expect(prepared.summary).toContain("consumer /shop/orders?filter=active:");
    expect(prepared.summary).toContain("API error");
    expect(prepared.markdown).toContain("# Bug Report BR-20260418-ABC12345");
    expect(prepared.markdown).toContain("[redacted-email]");
    expect(prepared.markdown).toContain("[redacted-number]");
    expect(prepared.markdown).not.toContain("user@example.com");
    expect(prepared.markdown).not.toContain("555-123-4567");
  });

  it("keeps only the most recent ten actions", () => {
    const prepared = prepareBugReport({
      createdAt: new Date("2026-04-18T22:00:15.000Z"),
      input: {
        ...baseInput,
        actions: Array.from({ length: 12 }, (_, index) => ({
          at: `2026-04-18T22:00:${String(index).padStart(2, "0")}.000Z`,
          kind: "click" as const,
          label: `Clicked item ${index}`,
        })),
      },
      randomSeed: "abc12345-seed",
    });

    expect(prepared.actions).toHaveLength(10);
    expect(prepared.actions[0]?.label).toBe("Clicked item 2");
    expect(prepared.actions.at(-1)?.label).toBe("Clicked item 11");
  });
});

describe("createBugReportService", () => {
  it("persists the prepared report through the repository", async () => {
    const insertReport = vi.fn<
      BugReportRepository["insertReport"]
    >(async (values) => ({
      publicId: values.publicId,
      summary: values.summary,
    }));
    const service = createBugReportService(
      {
        insertReport,
      },
      {
        now: () => new Date("2026-04-18T22:00:15.000Z"),
        randomSeed: () => "abc12345-seed",
      },
    );

    const result = await service.createReport({
      input: baseInput,
      reporter: {
        role: "business",
        userId: "seller-1",
      },
      userAgent: "Mozilla/5.0",
    });

    expect(result.publicId).toBe("BR-20260418-ABC12345");
    expect(insertReport).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: "BR-20260418-ABC12345",
        reporterRole: "business",
        reporterUserId: "seller-1",
        pagePath: "/shop/orders?filter=active",
        viewport: "390x844 @3x",
      }),
    );
  });
});
