import Link from "next/link";

import { AuctionCountdown } from "@/components/auction/auction-countdown";

type AuctionCardMetric = {
  label: string;
  value: string;
};

type AuctionCardBadgeTone = "warm" | "green" | "amber" | "slate";

type AuctionCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  metrics: AuctionCardMetric[];
  footerLines?: string[];
  endsAt: Date | string;
  endedAt?: Date | string | null;
  status: string;
  result: string;
  badge?: {
    label: string;
    tone: AuctionCardBadgeTone;
  };
  distanceMiles?: number | null;
  categoryBadge?: string | null;
};

const badgeToneClasses: Record<AuctionCardBadgeTone, string> = {
  warm: "border-[#ffd4bc] bg-[#fff0e5] text-[#ad5422]",
  green: "border-[#cbe8d8] bg-[#effaf3] text-[#216348]",
  amber: "border-[#ffe2a7] bg-[#fff6df] text-[#a45c11]",
  slate: "border-[#d7d9e0] bg-[#f5f6f9] text-[#566074]",
};

export function AuctionCard({
  href,
  eyebrow,
  title,
  description,
  imageUrl,
  metrics,
  footerLines = [],
  endsAt,
  endedAt,
  status,
  result,
  badge,
  distanceMiles,
  categoryBadge,
}: AuctionCardProps) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_24px_70px_rgba(64,34,20,0.1)] transition-transform hover:-translate-y-0.5"
    >
      <div className="grid gap-4 p-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#aa5838]">
              {eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#22130e]">
              {title}
            </h3>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-[#705446]">{description}</p>
            ) : null}
          </div>

          {badge ? (
            <span
              className={`inline-flex h-fit items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${badgeToneClasses[badge.tone]}`}
            >
              {badge.label}
            </span>
          ) : null}
        </div>

        <div className="relative">
          <div
            className="aspect-[4/3] w-full rounded-[1.6rem] border border-[#f4ddcf] bg-[linear-gradient(140deg,#fff5eb_0%,#ffe1c0_48%,#ffb87c_100%)]"
            style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          />
          {categoryBadge ? (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 rounded-full border border-white/60 bg-[rgba(255,248,239,0.88)] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#705446] backdrop-blur-sm"
            >
              {categoryBadge}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#f2ded0] bg-[rgba(255,249,244,0.9)] px-3 py-3"
            >
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9d6d56]">
                {metric.label}
              </p>
              <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-[#23130e]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {(footerLines.length > 0 || distanceMiles != null) ? (
          <div className="flex flex-wrap gap-2">
            {footerLines.map((line) => (
              <span
                key={line}
                className="rounded-full border border-[#ecd6c7] bg-[rgba(255,247,241,0.92)] px-3 py-1.5 text-xs font-medium text-[#725546]"
              >
                {line}
              </span>
            ))}
            {distanceMiles != null ? (
              <span className="rounded-full border border-[#ecd6c7] bg-[rgba(255,247,241,0.92)] px-3 py-1.5 text-xs font-medium text-[#725546]">
                {distanceMiles.toFixed(1)} mi away
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-[#f8efe8] px-3 py-3">
          <span className="text-sm font-medium text-[#684b3c]">
            Tap in for live detail and actions
          </span>
          <AuctionCountdown
            endsAt={endsAt}
            endedAt={endedAt}
            status={status}
            result={result}
          />
        </div>
      </div>
    </Link>
  );
}
