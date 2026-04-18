import {
  sanitizeInlineText,
  type BugReportAction,
  type BugReportActionKind,
  type CreateBugReportInput,
} from "./shared";

type RuntimeListener = () => void;

type BugReportRuntime = {
  actions: BugReportAction[];
  listeners: Set<RuntimeListener>;
  initialized: boolean;
  initialPageViewRecorded: boolean;
  wrappedFetch: boolean;
};

declare global {
  interface Window {
    __ratatouilleBugReportRuntime__?: BugReportRuntime;
  }
}

export function appendBugReportAction(
  actions: BugReportAction[],
  action: BugReportAction,
  maxActions = 10,
) {
  return [...actions, action].slice(-maxActions);
}

export function shouldTrackBugReportRequest(url: string, method: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const upperMethod = method.toUpperCase();

  try {
    const parsed = new URL(url, window.location.origin);

    if (parsed.origin !== window.location.origin) {
      return false;
    }

    if (parsed.pathname.startsWith("/_next/")) {
      return false;
    }

    if (parsed.pathname === "/api/bug-reports") {
      return false;
    }

    return parsed.pathname.startsWith("/api/") || upperMethod !== "GET";
  } catch {
    return false;
  }
}

function getRuntime() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.__ratatouilleBugReportRuntime__) {
    window.__ratatouilleBugReportRuntime__ = {
      actions: [],
      listeners: new Set(),
      initialized: false,
      initialPageViewRecorded: false,
      wrappedFetch: false,
    };
  }

  return window.__ratatouilleBugReportRuntime__;
}

function notifyRuntimeListeners(runtime: BugReportRuntime) {
  runtime.listeners.forEach((listener) => listener());
}

function makeIsoTimestamp(value = new Date()) {
  return value.toISOString();
}

function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function recordAction({
  detail,
  kind,
  label,
  status,
}: {
  detail?: string | null;
  kind: BugReportActionKind;
  label: string;
  status?: number | null;
}) {
  const runtime = getRuntime();

  if (!runtime) {
    return;
  }

  const sanitizedLabel = sanitizeInlineText(label, 140);

  if (!sanitizedLabel) {
    return;
  }

  runtime.actions = appendBugReportAction(runtime.actions, {
    at: makeIsoTimestamp(),
    kind,
    label: sanitizedLabel,
    detail: detail ? sanitizeInlineText(detail, 220) : null,
    status: status ?? null,
  });
  notifyRuntimeListeners(runtime);
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function describeElement(element: Element | null) {
  if (!element) {
    return null;
  }

  const labeledElement = element.closest<HTMLElement>(
    "[data-bug-report-label],button,a,input,textarea,select,label,[role='button']",
  );

  if (!labeledElement) {
    return null;
  }

  if (labeledElement.closest("[data-bug-report-ignore]")) {
    return null;
  }

  const explicitLabel = labeledElement.getAttribute("data-bug-report-label");

  if (explicitLabel) {
    return sanitizeInlineText(explicitLabel, 100);
  }

  const textContent = sanitizeInlineText(
    labeledElement.getAttribute("aria-label") ||
      ("value" in labeledElement ? String(labeledElement.value ?? "") : "") ||
      labeledElement.textContent ||
      labeledElement.getAttribute("name") ||
      labeledElement.id ||
      labeledElement.tagName.toLowerCase(),
    100,
  );

  if (labeledElement instanceof HTMLAnchorElement) {
    const path = new URL(labeledElement.href, window.location.origin);
    return textContent ? `${textContent} → ${path.pathname}` : path.pathname;
  }

  return textContent;
}

function attachClickListener() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const label = describeElement(target);

      if (!label) {
        return;
      }

      recordAction({
        kind: "click",
        label,
        detail: getCurrentPath(),
      });
    },
    true,
  );
}

function attachSubmitListener() {
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;

      if (!form || form.closest("[data-bug-report-ignore]")) {
        return;
      }

      const action = form.getAttribute("action") || getCurrentPath();
      const method = (form.getAttribute("method") || "POST").toUpperCase();
      const label =
        sanitizeInlineText(
          form.getAttribute("aria-label") ||
            form.getAttribute("name") ||
            form.id ||
            `${method} ${action}`,
          100,
        ) || `${method} ${action}`;

      recordAction({
        kind: "submit",
        label,
        detail: `${method} ${sanitizeInlineText(action, 100)}`,
      });
    },
    true,
  );
}

function attachErrorListeners() {
  window.addEventListener("error", (event) => {
    recordAction({
      kind: "client_error",
      label: "Window error",
      detail: readErrorMessage(event.error ?? event.message),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordAction({
      kind: "unhandled_rejection",
      label: "Unhandled promise rejection",
      detail: readErrorMessage(event.reason),
    });
  });
}

function attachFetchWrapper(runtime: BugReportRuntime) {
  if (runtime.wrappedFetch) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.toString()
          : String(input);
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    if (!shouldTrackBugReportRequest(requestUrl, method)) {
      return originalFetch(input, init);
    }

    const parsed = new URL(requestUrl, window.location.origin);
    const path = `${parsed.pathname}${parsed.search}`;

    recordAction({
      kind: "api_request",
      label: `${method} ${path}`,
    });

    try {
      const response = await originalFetch(input, init);

      recordAction({
        kind: response.ok ? "api_success" : "api_error",
        label: `${method} ${path}`,
        status: response.status,
        detail: response.statusText || null,
      });

      return response;
    } catch (error) {
      recordAction({
        kind: "api_error",
        label: `${method} ${path}`,
        detail: readErrorMessage(error),
      });

      throw error;
    }
  };

  runtime.wrappedFetch = true;
}

export function ensureBugReportRuntime() {
  const runtime = getRuntime();

  if (!runtime || runtime.initialized) {
    return runtime;
  }

  attachClickListener();
  attachSubmitListener();
  attachErrorListeners();
  attachFetchWrapper(runtime);

  runtime.initialized = true;

  if (!runtime.initialPageViewRecorded) {
    runtime.initialPageViewRecorded = true;
    recordAction({
      kind: "page_view",
      label: `Opened ${getCurrentPath()}`,
    });
  }

  return runtime;
}

export function recordBugReportNavigation(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  ensureBugReportRuntime();
  recordAction({
    kind: "navigation",
    label: `${navigationType} ${sanitizeInlineText(url, 120)}`,
  });
}

export function subscribeToBugReportSnapshot(listener: RuntimeListener) {
  const runtime = ensureBugReportRuntime();

  if (!runtime) {
    return () => undefined;
  }

  runtime.listeners.add(listener);

  return () => {
    runtime.listeners.delete(listener);
  };
}

export function getBugReportSnapshot() {
  const runtime = getRuntime();

  return {
    actions: runtime?.actions ?? [],
  };
}

export function buildBugReportDraft() {
  ensureBugReportRuntime();

  const { actions } = getBugReportSnapshot();
  const draft: Omit<CreateBugReportInput, "description"> = {
    actions,
    captureError: null,
    pagePath: getCurrentPath(),
    pageUrl: window.location.href,
    screenshotDataUrl: null,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
    },
  };

  return draft;
}
