import Link from "next/link";
import type { ReactNode } from "react";

type AuthLaneCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  copy: string;
  cta: string;
  accent: string;
  aside?: ReactNode;
};

export function AuthLaneCard({
  href,
  eyebrow,
  title,
  copy,
  cta,
  accent,
  aside,
}: AuthLaneCardProps) {
  return (
    <Link
      href={href}
      className={`group rounded-[1.9rem] bg-gradient-to-br p-4 transition-transform duration-200 hover:-translate-y-0.5 ${accent}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/72">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
            {title}
          </h2>
          <p className="mt-3 text-base leading-7 text-white/92">{copy}</p>
        </div>
        {aside ?? (
          <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-semibold text-white/88">{cta}</p>
    </Link>
  );
}
