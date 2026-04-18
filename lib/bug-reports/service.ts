import "server-only";

import {
  type CreateBugReportInput,
  prepareBugReport,
  type ReporterContext,
} from "./shared";

export type BugReportRepository = {
  insertReport(values: {
    publicId: string;
    reporterUserId: string | null;
    reporterRole: "anonymous" | "consumer" | "business";
    pageUrl: string;
    pagePath: string;
    viewport: string;
    userAgent: string | null;
    summary: string;
    description: string;
    markdown: string;
    screenshotDataUrl: string | null;
    captureError: string | null;
    createdAt: Date;
  }): Promise<{
    publicId: string;
    summary: string;
  }>;
};

export function createBugReportService(
  repository: BugReportRepository,
  options?: {
    now?: () => Date;
    randomSeed?: () => string;
  },
) {
  return {
    async createReport({
      input,
      reporter,
      userAgent,
    }: {
      input: CreateBugReportInput;
      reporter?: ReporterContext;
      userAgent?: string | null;
    }) {
      const prepared = prepareBugReport({
        createdAt: options?.now?.() ?? new Date(),
        input,
        randomSeed: options?.randomSeed?.(),
        reporter,
        userAgent,
      });

      return repository.insertReport({
        publicId: prepared.publicId,
        reporterUserId: prepared.reporterUserId,
        reporterRole: prepared.reporterRole,
        pageUrl: prepared.pageUrl,
        pagePath: prepared.pagePath,
        viewport: prepared.viewport,
        userAgent: prepared.userAgent,
        summary: prepared.summary,
        description: prepared.description,
        markdown: prepared.markdown,
        screenshotDataUrl: prepared.screenshotDataUrl,
        captureError: prepared.captureError,
        createdAt: prepared.createdAt,
      });
    },
  };
}

export const bugReportRepository: BugReportRepository = {
  async insertReport(values) {
    const [{ db }, { bugReports }] = await Promise.all([
      import("@/db/client"),
      import("@/db/schema/bug-reports"),
    ]);
    const [created] = await db
      .insert(bugReports)
      .values(values)
      .returning({
        publicId: bugReports.publicId,
        summary: bugReports.summary,
      });

    return created;
  },
};

export const bugReportService = createBugReportService(bugReportRepository);
