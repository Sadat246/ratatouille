"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { CameraCaptureModal } from "@/components/listing/camera-capture-modal";
import type { ListingOcrResult } from "@/lib/listings/draft-types";
import type { RequiredListingImageKind } from "@/lib/listings/shared";

type PhotoSlotStatus = "empty" | "review" | "uploading" | "ready" | "error";

type PhotoSlotCardProps = {
  kind: RequiredListingImageKind;
  title: string;
  description: string;
  previewUrl?: string;
  status: PhotoSlotStatus;
  error?: string;
  hasAcceptedPhoto: boolean;
  onAccept: () => void;
  onRetryUpload: () => void;
  onSelectFile: (file: File) => void;
  ocr?: ListingOcrResult;
};

const statusCopy: Record<PhotoSlotStatus, string> = {
  empty: "Waiting for capture",
  review: "Review before upload",
  uploading: "Uploading…",
  ready: "Ready",
  error: "Needs attention",
};

const statusBadgeTone: Record<PhotoSlotStatus, string> = {
  empty: "bg-[#f0f0f0] text-[#5a5a5a]",
  review: "bg-[#e6f1ea] text-[#1e5a37]",
  uploading: "bg-[#e6f1ea] text-[#1e5a37]",
  ready: "bg-[#e6f1ea] text-[#2f6b4d]",
  error: "bg-[#f5e3e0] text-[#a14431]",
};

function getOcrTone(status: ListingOcrResult["status"]) {
  switch (status) {
    case "succeeded":
      return "border-[#cfe5d6] bg-[#eef6f1] text-[#2f6b4d]";
    case "manual_required":
      return "border-[#eee0c2] bg-[#fbf4e3] text-[#7d6a3a]";
    default:
      return "border-[#f1d4cd] bg-[#fbeae5] text-[#a14431]";
  }
}

function getOcrHeading(ocr: ListingOcrResult) {
  switch (ocr.status) {
    case "succeeded":
      return `OCR found ${ocr.packageDate}`;
    case "manual_required":
      return "OCR captured text — confirm the date below";
    default:
      return "OCR is unavailable right now";
  }
}

export function PhotoSlotCard({
  kind,
  title,
  description,
  previewUrl,
  status,
  error,
  hasAcceptedPhoto,
  onAccept,
  onRetryUpload,
  onSelectFile,
  ocr,
}: PhotoSlotCardProps) {
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <article className="rounded-[1rem] border border-[#eaeaea] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
            {kind}
          </p>
          <h3 className="mt-1.5 text-base font-semibold tracking-tight text-[#1a1a1a]">
            {title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${statusBadgeTone[status]}`}
        >
          {statusCopy[status]}
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-6 text-[#6b6b6b]">{description}</p>

      <div className="mt-4 overflow-hidden rounded-[0.85rem] border border-[#eaeaea] bg-[#fafafa]">
        {previewUrl ? (
          <img
            alt={`${title} preview`}
            className="aspect-[4/3] h-full w-full object-cover"
            src={previewUrl}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm leading-6 text-[#9a9a9a]">
            Use Capture to take the {title.toLowerCase()} photo with your webcam,
            then confirm before upload.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#000]"
          onClick={() => setCameraOpen(true)}
          type="button"
        >
          {previewUrl ? "Retake" : "Capture"}
        </button>

        <CameraCaptureModal
          imageKind={kind}
          isOpen={cameraOpen}
          onCapture={onSelectFile}
          onClose={() => setCameraOpen(false)}
          slotTitle={title}
        />

        {status === "review" ? (
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#eaeaea] bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition hover:border-[#dcdcdc]"
            onClick={onAccept}
            type="button"
          >
            Looks good
          </button>
        ) : null}

        {status === "error" && hasAcceptedPhoto ? (
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#eaeaea] bg-white px-4 py-2 text-sm font-medium text-[#a14431] transition hover:border-[#dcdcdc]"
            onClick={onRetryUpload}
            type="button"
          >
            Retry upload
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[#a14431]">{error}</p>
      ) : null}

      {kind === "expiry" && ocr ? (
        <div className={`mt-4 rounded-[0.65rem] border px-3.5 py-3 text-sm ${getOcrTone(ocr.status)}`}>
          <p className="font-semibold">{getOcrHeading(ocr)}</p>
          <p className="mt-1.5 leading-6">
            {ocr.status === "succeeded"
              ? `Date label: ${ocr.packageDateLabel || "Manual label"}`
              : ocr.reason ||
                "Check the raw OCR text in the form, enter the date if needed, or use Gemini (when configured) to suggest it."}
          </p>
        </div>
      ) : null}
    </article>
  );
}
