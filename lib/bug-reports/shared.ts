import { z } from "zod";

export const bugReportActionKinds = [
  "page_view",
  "navigation",
  "click",
  "submit",
  "api_request",
  "api_success",
  "api_error",
  "client_error",
  "unhandled_rejection",
] as const;

export const reporterRoles = ["anonymous", "consumer", "business"] as const;

export type ReporterRole = (typeof reporterRoles)[number];
export type BugReportActionKind = (typeof bugReportActionKinds)[number];

export const bugReportActionSchema = z.object({
  at: z.string().datetime(),
  kind: z.enum(bugReportActionKinds),
  label: z.string().trim().min(1).max(160),
  detail: z.string().trim().max(280).nullable().optional(),
  status: z.number().int().min(100).max(599).nullable().optional(),
});

export const createBugReportSchema = z.object({
  pageUrl: z.string().trim().url().max(2048),
  pagePath: z.string().trim().min(1).max(512),
  description: z.string().trim().min(6).max(1200),
  captureError: z.string().trim().max(280).nullable().optional(),
  screenshotDataUrl: z
    .string()
    .trim()
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/)
    .max(3_500_000)
    .nullable()
    .optional(),
  viewport: z.object({
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    pixelRatio: z.number().positive().max(8),
  }),
  actions: z.array(bugReportActionSchema).max(20),
});

export type BugReportAction = z.infer<typeof bugReportActionSchema>;
export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;

export type ReporterContext = {
  role?: "consumer" | "business" | null;
  userId?: string | null;
};

export type PreparedBugReport = {
  publicId: string;
  reporterRole: ReporterRole;
  reporterUserId: string | null;
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
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const NUMBER_PATTERN = /\b(?:\+?\d[\d()\s.-]{5,}\d)\b/g;

function redactSensitiveTokens(value: string) {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(NUMBER_PATTERN, "[redacted-number]");
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function sanitizeInlineText(value: string, maxLength = 160) {
  const redacted = redactSensitiveTokens(value);
  const collapsed = redacted.replace(/\s+/g, " ").trim();

  if (!collapsed) {
    return "";
  }

  return limitText(collapsed, maxLength);
}

export function sanitizeBlockText(value: string, maxLength = 1200) {
  const redacted = redactSensitiveTokens(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  if (!redacted) {
    return "";
  }

  return limitText(redacted, maxLength);
}

function normalizePath(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return trimmed;
  }
}

function formatViewportLabel(viewport: CreateBugReportInput["viewport"]) {
  const pixelRatio = Number(viewport.pixelRatio.toFixed(2));

  return `${viewport.width}x${viewport.height} @${pixelRatio}x`;
}

function formatActionKind(kind: BugReportActionKind) {
  switch (kind) {
    case "page_view":
      return "Page view";
    case "navigation":
      return "Navigation";
    case "click":
      return "Click";
    case "submit":
      return "Submit";
    case "api_request":
      return "API request";
    case "api_success":
      return "API success";
    case "api_error":
      return "API error";
    case "client_error":
      return "Client error";
    case "unhandled_rejection":
      return "Unhandled rejection";
  }
}

function summarizeAction(action: BugReportAction) {
  const base = `${formatActionKind(action.kind)}: ${sanitizeInlineText(action.label, 90)}`;
  const detail = action.detail
    ? ` — ${sanitizeInlineText(action.detail, 80)}`
    : "";
  const status = action.status ? ` (${action.status})` : "";

  return `${base}${status}${detail}`;
}

function findMostSevereAction(actions: BugReportAction[]) {
  return actions.findLast(
    (action) =>
      action.kind === "api_error" ||
      action.kind === "client_error" ||
      action.kind === "unhandled_rejection" ||
      (typeof action.status === "number" && action.status >= 400),
  );
}

export function createBugReportPublicId(
  createdAt: Date,
  randomSeed = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`,
) {
  const date = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
  const token = randomSeed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

  return `BR-${date}-${token || "BUGREPORT"}`;
}

export function buildBugReportSummary({
  actions,
  description,
  pagePath,
  reporterRole,
}: {
  actions: BugReportAction[];
  description: string;
  pagePath: string;
  reporterRole: ReporterRole;
}) {
  const route = sanitizeInlineText(pagePath, 42);
  const actor = reporterRole === "anonymous" ? "anonymous" : reporterRole;
  const severeAction = findMostSevereAction(actions);
  const summaryCore = severeAction
    ? summarizeAction(severeAction)
    : sanitizeInlineText(description, 100);
  const descriptionLead = sanitizeInlineText(description, 72);
  const tail =
    descriptionLead && !summaryCore.includes(descriptionLead)
      ? `; ${descriptionLead}`
      : "";

  return limitText(`${actor} ${route}: ${summaryCore}${tail}`, 180);
}

export function buildBugReportMarkdown({
  actions,
  captureError,
  createdAt,
  description,
  pagePath,
  pageUrl,
  publicId,
  reporterRole,
  screenshotDataUrl,
  summary,
  userAgent,
  viewport,
}: PreparedBugReport & { actions: BugReportAction[] }) {
  const actionLines =
    actions.length === 0
      ? ["- No client-side actions were captured before submission."]
      : actions.map((action) => {
          const status = action.status ? ` (${action.status})` : "";
          const detail = action.detail
            ? ` — ${sanitizeInlineText(action.detail, 180)}`
            : "";

          return `- ${action.at} — ${formatActionKind(action.kind)} — ${sanitizeInlineText(
            action.label,
            120,
          )}${status}${detail}`;
        });

  const screenshotLine = screenshotDataUrl
    ? "Attached separately in the report record as an image payload."
    : captureError
      ? `Unavailable: ${sanitizeInlineText(captureError, 180)}`
      : "Unavailable: no screenshot was attached.";

  const userAgentLine = userAgent
    ? sanitizeInlineText(userAgent, 220)
    : "Unavailable";

  return [
    `# Bug Report ${publicId}`,
    "",
    `> ${summary}`,
    "",
    "## Snapshot",
    `- Created at: ${createdAt.toISOString()}`,
    `- Reporter role: ${reporterRole}`,
    `- Route: ${sanitizeInlineText(pagePath, 180)}`,
    `- URL: ${sanitizeInlineText(pageUrl, 240)}`,
    `- Viewport: ${viewport}`,
    `- User agent: ${userAgentLine}`,
    "",
    "## Reporter Description",
    "",
    sanitizeBlockText(description, 1200),
    "",
    "## Recent Actions",
    ...actionLines,
    "",
    "## Screenshot",
    screenshotLine,
  ].join("\n");
}

export function prepareBugReport({
  createdAt = new Date(),
  input,
  randomSeed,
  reporter,
  userAgent,
}: {
  createdAt?: Date;
  input: CreateBugReportInput;
  randomSeed?: string;
  reporter?: ReporterContext;
  userAgent?: string | null;
}) {
  const actions = input.actions.slice(-10).map((action) => ({
    at: new Date(action.at).toISOString(),
    kind: action.kind,
    label: sanitizeInlineText(action.label, 140),
    detail: action.detail ? sanitizeInlineText(action.detail, 220) : null,
    status: action.status ?? null,
  }));

  const reporterRole: ReporterRole = reporter?.role ?? "anonymous";
  const publicId = createBugReportPublicId(createdAt, randomSeed);
  const description = sanitizeBlockText(input.description, 1200);
  const pagePath = normalizePath(input.pagePath);
  const pageUrl = sanitizeInlineText(input.pageUrl, 2048);
  const viewport = formatViewportLabel(input.viewport);
  const captureError = input.captureError
    ? sanitizeInlineText(input.captureError, 220)
    : null;
  const screenshotDataUrl = input.screenshotDataUrl ?? null;
  const summary = buildBugReportSummary({
    actions,
    description,
    pagePath,
    reporterRole,
  });
  const prepared: PreparedBugReport = {
    publicId,
    reporterRole,
    reporterUserId: reporter?.userId ?? null,
    pageUrl,
    pagePath,
    viewport,
    userAgent: userAgent ? sanitizeInlineText(userAgent, 240) : null,
    summary,
    description,
    screenshotDataUrl,
    captureError,
    createdAt,
    markdown: "",
  };

  return {
    ...prepared,
    actions,
    markdown: buildBugReportMarkdown({
      ...prepared,
      actions,
    }),
  };
}
