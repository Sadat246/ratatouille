import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSession } from "@/lib/auth/session";
import { bugReportService } from "@/lib/bug-reports/service";
import { createBugReportSchema } from "@/lib/bug-reports/shared";

export const runtime = "nodejs";

function jsonBugReportError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    {
      status,
    },
  );
}

export async function POST(request: Request) {
  try {
    const payload = createBugReportSchema.parse(
      await request.json().catch(() => null),
    );
    const session = await getSession();
    const created = await bugReportService.createReport({
      input: payload,
      reporter: {
        role: session?.user?.role ?? null,
        userId: session?.user?.id ?? null,
      },
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        ok: true,
        reportId: created.publicId,
        summary: created.summary,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonBugReportError(
        "INVALID_BUG_REPORT",
        error.issues[0]?.message ?? "Provide a valid bug report payload.",
        400,
      );
    }

    console.error("bug report submit failed", error);

    return jsonBugReportError(
      "BUG_REPORT_SUBMIT_FAILED",
      "The bug report could not be saved. Try again in a moment.",
      500,
    );
  }
}
