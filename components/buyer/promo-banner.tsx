type PromoBannerProps = {
  locationLabel: string;
};

export function PromoBanner({ locationLabel }: PromoBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#ececec] bg-[linear-gradient(115deg,#f3fbf5_0%,#d5ecdc_55%,#8fc7a5_100%)]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-70">
        <svg aria-hidden="true" viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
          <defs>
            <radialGradient id="b1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="310" cy="160" r="110" fill="url(#b1)" />
          <g transform="translate(220 100)" opacity="0.85">
            <ellipse cx="40" cy="60" rx="55" ry="28" fill="#ffffff" />
            <ellipse cx="80" cy="48" rx="40" ry="20" fill="#3d8d5c" opacity="0.18" />
            <ellipse cx="30" cy="48" rx="30" ry="16" fill="#3d8d5c" opacity="0.28" />
          </g>
          <g transform="translate(120 50)" opacity="0.6">
            <circle cx="30" cy="30" r="18" fill="#3d8d5c" opacity="0.35" />
            <circle cx="60" cy="40" r="24" fill="#3d8d5c" opacity="0.22" />
          </g>
        </svg>
      </div>

      <div className="relative grid gap-4 px-8 py-10 sm:px-12 sm:py-14">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#1e5a37] backdrop-blur">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M13 3 4 14h6l-1 7 9-11h-6Z" />
          </svg>
          Fresh Deals · {locationLabel}
        </span>

        <h1 className="max-w-[16ch] text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-[#1a1a1a]">
          Rescue good food.
          <br />
          Save up to <span className="italic text-[#3d8d5c]">70% off.</span>
        </h1>
        <p className="max-w-[42ch] text-sm leading-6 text-[#5a4a42] sm:text-base">
          Bid live on surplus groceries from local stores before they expire — every win cuts waste and fills your fridge.
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <a
            href="#deals-for-you"
            className="inline-flex items-center gap-2 rounded-full bg-[#3d8d5c] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e5a37]"
          >
            Shop deals
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </a>
          <a
            href="#ending-soon"
            className="inline-flex items-center gap-2 rounded-full border border-[#1a1a1a]/15 bg-white px-5 py-3 text-sm font-semibold text-[#1a1a1a] transition-colors hover:border-[#3d8d5c] hover:text-[#3d8d5c]"
          >
            Ending soon
          </a>
        </div>
      </div>
    </section>
  );
}
