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

const cardToneByKind: Record<
  RequiredListingImageKind,
  {
    frame: string;
    badge: string;
    preview: string;
  }
> = {
  product: {
    frame: "border-[#d7c8b5] bg-[#fff8f1]",
    badge: "bg-[#ffe2c4] text-[#7a4a25]",
    preview: "from-[#fff4e7] via-[#fff9f3] to-[#f6ede3]",
  },
  seal: {
    frame: "border-[#cdd9d0] bg-[#f4faf6]",
    badge: "bg-[#d8efe0] text-[#22513d]",
    preview: "from-[#eef8f1] via-[#f8fcf9] to-[#edf6f0]",
  },
  expiry: {
    frame: "border-[#edd6af] bg-[#fff8eb]",
    badge: "bg-[#fde8bd] text-[#7b5720]",
    preview: "from-[#fff3d8] via-[#fffaf0] to-[#fff0cf]",
  },
};

const statusCopy: Record<PhotoSlotStatus, string> = {
  empty: "Waiting for capture",
  review: "Review before upload",
  uploading: "Uploading and processing",
  ready: "Accepted and ready",
  error: "Needs attention",
};

function getOcrTone(status: ListingOcrResult["status"]) {
  switch (status) {
    case "succeeded":
      return "border-[#c7dfd0] bg-[#eef8f1] text-[#214b38]";
    case "manual_required":
      return "border-[#ead3ae] bg-[#fff6e7] text-[#6e5123]";
    default:
      return "border-[#ead1cb] bg-[#fff0ed] text-[#7b3429]";
  }
}

function getOcrHeading(ocr: ListingOcrResult) {
  switch (ocr.status) {
    case "succeeded":
      return `OCR found ${ocr.packageDate}`;
    case "manual_required":
      return "OCR needs a manual date";
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
  const tone = cardToneByKind[kind];
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <article
      className={`rounded-[2rem] border p-4 shadow-[0_18px_60px_rgba(45,33,19,0.07)] ${tone.frame}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#6d5a46]">
            {kind}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1f261c]">
            {title}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${tone.badge}`}
        >
          {statusCopy[status]}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#5a4d3d]">{description}</p>

      <div
        className={`mt-4 overflow-hidden rounded-[1.6rem] border border-white/80 bg-gradient-to-br ${tone.preview}`}
      >
        {previewUrl ? (
          <img
            alt={`${title} preview`}
            className="aspect-[4/3] h-full w-full object-cover"
            src={previewUrl}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm leading-6 text-[#6f604f]">
            Use Capture to take the {title.toLowerCase()} photo with your webcam, then
            confirm it before the desk uploads anything.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#1f3d30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a5643]"
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
            className="inline-flex items-center justify-center rounded-full border border-[#c7d6cb] bg-white/80 px-4 py-3 text-sm font-semibold text-[#244534]"
            onClick={onAccept}
            type="button"
          >
            Looks good
          </button>
        ) : null}

        {status === "error" && hasAcceptedPhoto ? (
          <button
            className="inline-flex items-center justify-center rounded-full border border-[#d9bfb5] bg-white/70 px-4 py-3 text-sm font-semibold text-[#8d4333]"
            onClick={onRetryUpload}
            type="button"
          >
            Retry upload
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[#a03d30]">{error}</p>
      ) : null}

      {kind === "expiry" && ocr ? (
        <div className={`mt-4 rounded-[1.4rem] border px-4 py-3 text-sm ${getOcrTone(ocr.status)}`}>
          <p className="font-semibold">{getOcrHeading(ocr)}</p>
          <p className="mt-2 leading-6">
            {ocr.status === "succeeded"
              ? `Date label: ${ocr.packageDateLabel || "Manual label"}`
              : ocr.reason || "Type the package date manually and keep going."}
          </p>
        </div>
      ) : null}
    </article>
  );
}
