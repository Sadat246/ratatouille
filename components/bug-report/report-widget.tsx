"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  buildBugReportDraft,
  ensureBugReportRuntime,
  getBugReportSnapshot,
  subscribeToBugReportSnapshot,
} from "@/lib/bug-reports/client-runtime";
import { captureBugReportScreenshot } from "@/lib/bug-reports/screenshot";

type PreviewDraft = ReturnType<typeof buildBugReportDraft> & {
  captureError: string | null;
  screenshotDataUrl: string | null;
};

export function ReportWidget() {
  const liveSnapshot = useSyncExternalStore(
    subscribeToBugReportSnapshot,
    getBugReportSnapshot,
    getBugReportSnapshot,
  );
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<PreviewDraft | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitTone, setSubmitTone] = useState<"neutral" | "success" | "error">(
    "neutral",
  );

  useEffect(() => {
    ensureBugReportRuntime();
  }, []);

  async function refreshPreview() {
    setIsPreparingPreview(true);
    setSubmitMessage(null);
    setSubmitTone("neutral");

    const baseDraft = buildBugReportDraft();
    const screenshot = await captureBugReportScreenshot();

    setDraft({
      ...baseDraft,
      captureError: screenshot.error,
      screenshotDataUrl: screenshot.dataUrl,
    });
    setIsPreparingPreview(false);
  }

  function closePanel() {
    setIsOpen(false);
    setDraft(null);
    setDescription("");
    setIsPreparingPreview(false);
    setIsSubmitting(false);
    setSubmitMessage(null);
    setSubmitTone("neutral");
  }

  async function openPanel() {
    setIsOpen(true);
    setDraft(null);
    await refreshPreview();
  }

  async function submitReport() {
    if (!draft || description.trim().length < 6 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          description,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            reportId?: string;
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.reportId) {
        throw new Error(
          payload?.error?.message ?? "The report could not be submitted.",
        );
      }

      setSubmitTone("success");
      setSubmitMessage(`Saved as ${payload.reportId}.`);
      setDescription("");
      setDraft(null);
    } catch (error) {
      setSubmitTone("error");
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "The report could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewActions = draft?.actions ?? [];

  return (
    <div
      data-bug-report-ignore
      data-html2canvas-ignore
      className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] z-40 sm:right-6 sm:bottom-6"
    >
      {isOpen ? (
        <section className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.8rem] border border-white/70 bg-[rgba(255,248,240,0.97)] shadow-[0_28px_80px_rgba(54,30,16,0.24)] backdrop-blur">
          <div className="bg-[linear-gradient(140deg,#1f4838_0%,#295744_44%,#f75d36_100%)] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/72">
                  Bug Report
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                  Show what broke
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Review the screenshot and recent actions before you send the
                  report.
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-full border border-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/88"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="rounded-[1.4rem] border border-[#ead6c2] bg-[#fff8ef] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b5a46]">
                  Preview
                </p>
                <button
                  type="button"
                  onClick={() => void refreshPreview()}
                  disabled={isPreparingPreview}
                  className="rounded-full border border-[#d7b799] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#7b4b34] disabled:opacity-60"
                >
                  {isPreparingPreview ? "Refreshing" : "Refresh"}
                </button>
              </div>

              <div className="mt-3 overflow-hidden rounded-[1.15rem] border border-[#ecd7c3] bg-white">
                {draft?.screenshotDataUrl ? (
                  <Image
                    src={draft.screenshotDataUrl}
                    alt="Bug report preview"
                    width={draft.viewport.width}
                    height={draft.viewport.height}
                    unoptimized
                    className="h-auto w-full object-cover"
                  />
                ) : (
                  <div className="flex min-h-44 items-center justify-center bg-[linear-gradient(180deg,#fff8ef_0%,#f4e1cf_100%)] px-5 text-center text-sm leading-6 text-[#6b5140]">
                    {isPreparingPreview
                      ? "Capturing the current screen…"
                      : draft?.captureError
                        ? `Screenshot unavailable: ${draft.captureError}`
                        : "The current screen preview will appear here."}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[#ead6c2] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b5a46]">
                Recent Actions
              </p>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                {previewActions.length > 0 ? (
                  previewActions.map((action) => (
                    <div
                      key={`${action.at}-${action.kind}-${action.label}`}
                      className="rounded-[1rem] border border-[#f0dfcf] bg-[#fff9f3] px-3 py-2"
                    >
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9a7259]">
                        {action.kind.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#2f1d16]">
                        {action.label}
                      </p>
                      {action.detail ? (
                        <p className="mt-1 text-xs leading-5 text-[#6b5140]">
                          {action.detail}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-[1rem] border border-dashed border-[#e8d5c2] px-3 py-4 text-sm text-[#6b5140]">
                    {isPreparingPreview
                      ? "Freezing the current action trail…"
                      : "No recent actions were captured yet."}
                  </p>
                )}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b5a46]">
                What went wrong?
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Describe what you expected, what happened instead, and what you were trying to do."
                className="mt-3 w-full rounded-[1.35rem] border border-[#dcc3ab] bg-[#fffaf5] px-4 py-3 text-sm leading-6 text-[#2f1d16] outline-none ring-0 transition focus:border-[#f75d36]"
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <p
                className={`text-sm ${
                  submitTone === "error"
                    ? "text-[#ab3b1d]"
                    : submitTone === "success"
                      ? "text-[#1d5c43]"
                      : "text-[#6b5140]"
                }`}
              >
                {submitMessage ?? "Nothing is sent until you press submit."}
              </p>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={
                  isPreparingPreview || isSubmitting || description.trim().length < 6
                }
                className="rounded-full bg-[#f75d36] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(247,93,54,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        aria-label="Open bug report panel"
        onClick={() => void openPanel()}
        className="group flex items-center gap-3 rounded-full border border-white/60 bg-[linear-gradient(140deg,#f75d36_0%,#f28a5f_42%,#ffe2b6_100%)] px-3 py-3 text-white shadow-[0_24px_70px_rgba(247,93,54,0.34)] transition-transform hover:-translate-y-0.5"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 4v-4H7.5A2.5 2.5 0 0 1 5 12.5Z" />
            <path d="M9 8.5h6M9 11.5h4" />
          </svg>
        </span>
        <span className="pr-1 text-left">
          <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/72">
            Support
          </span>
          <span className="block text-sm font-semibold">
            Report a bug
          </span>
        </span>
        <span className="rounded-full bg-white/18 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/88">
          {liveSnapshot.actions.length}
        </span>
      </button>
    </div>
  );
}
