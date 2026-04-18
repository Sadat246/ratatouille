"use client";

import { useEffect, useState } from "react";

import { formatAuctionResultLabel } from "@/lib/auctions/display";

type AuctionCountdownProps = {
  endsAt: Date | string;
  status: string;
  result: string;
  endedAt?: Date | string | null;
  size?: "sm" | "lg";
};

function toTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value).getTime();
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s left`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return `${totalMinutes}m ${String(seconds).padStart(2, "0")}s left`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m left`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${String(remainingHours).padStart(2, "0")}h left`;
}

export function AuctionCountdown({
  endsAt,
  status,
  result,
  endedAt,
  size = "sm",
}: AuctionCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "active" && status !== "scheduled") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status]);

  const endMs = toTimestamp(endsAt);
  const endedMs = toTimestamp(endedAt);
  const remainingMs = endMs === null ? 0 : Math.max(0, endMs - now);
  const urgent = remainingMs > 0 && remainingMs <= 10_000;
  const endingSoon = remainingMs > 10_000 && remainingMs <= 60_000;
  const sizeClass =
    size === "lg"
      ? "text-2xl tracking-[-0.05em] sm:text-3xl"
      : "text-sm tracking-[-0.03em]";

  let label = formatAuctionResultLabel(status, result);
  let toneClass =
    "border-[#f3d9cb] bg-[rgba(255,248,242,0.86)] text-[#6e4a39]";

  if (status === "active" || status === "scheduled") {
    label = remainingMs <= 0 ? "Closing..." : formatRemaining(remainingMs);
    toneClass = urgent
      ? "animate-pulse border-[#ffb3a1] bg-[#f75d36] text-white shadow-[0_18px_45px_rgba(247,93,54,0.32)]"
      : endingSoon
        ? "border-[#ffd0a6] bg-[#fff0dc] text-[#ad5415]"
        : "border-[#f1dcc7] bg-[rgba(255,248,242,0.86)] text-[#7a513c]";
  } else if (endedMs) {
    label = `${formatAuctionResultLabel(status, result)} · ${new Date(endedMs).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    )}`;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-2 font-semibold ${sizeClass} ${toneClass}`}
    >
      {label}
    </span>
  );
}
