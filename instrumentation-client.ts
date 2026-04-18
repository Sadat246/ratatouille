import {
  ensureBugReportRuntime,
  recordBugReportNavigation,
} from "@/lib/bug-reports/client-runtime";

try {
  ensureBugReportRuntime();
} catch {
  // Never let client instrumentation break application startup.
}

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  try {
    recordBugReportNavigation(url, navigationType);
  } catch {
    // Ignore instrumentation failures so route transitions still proceed.
  }
}
