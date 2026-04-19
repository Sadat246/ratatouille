import Link from "next/link";
import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  illustration: ReactNode;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
};

export function AuthSplitLayout({
  eyebrow,
  title,
  subtitle,
  children,
  illustration,
  footerText,
  footerLinkLabel,
  footerLinkHref,
}: AuthSplitLayoutProps) {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1400px] overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(15,47,23,0.12)] lg:grid-cols-2">
        <div className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-14">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-[#3d8d5c] text-white">
              <svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
              </svg>
            </span>
            <span className="text-[0.98rem] font-semibold tracking-[-0.02em] text-[#1a1a1a]">
              Ratatouille
            </span>
          </Link>

          <div className="flex max-w-md flex-col">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#3d8d5c]">
              {eyebrow}
            </p>
            <h1 className="mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[#1a1a1a] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#6b6b6b]">
              {subtitle}
            </p>
            <div className="mt-8">{children}</div>
          </div>

          <p className="text-sm text-[#6b6b6b]">
            {footerText}{" "}
            <Link
              href={footerLinkHref}
              className="font-semibold text-[#3d8d5c] transition-colors hover:text-[#1e5a37]"
            >
              {footerLinkLabel}
            </Link>
          </p>
        </div>

        <div className="relative hidden lg:block">{illustration}</div>
      </div>
    </main>
  );
}
