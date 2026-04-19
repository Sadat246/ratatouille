export function ConsumerAuthIllustration() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(155deg,#1e5a37_0%,#3d8d5c_45%,#7ab89a_100%)]">
      <div className="absolute -left-16 top-8 h-40 w-80 rounded-[50%] bg-white/80 blur-[1px]" />
      <div className="absolute left-16 top-24 h-24 w-44 rounded-[50%] bg-white/85" />
      <div className="absolute -right-10 bottom-16 h-40 w-80 rounded-[50%] bg-white/75" />
      <div className="absolute right-16 bottom-32 h-20 w-36 rounded-[50%] bg-white/80" />

      <div className="absolute inset-0 flex items-center justify-center px-10">
        <div className="relative">
          <div className="w-[300px] rounded-[1.4rem] bg-white p-4 shadow-[0_30px_80px_rgba(14,50,28,0.35)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f1ea] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#1e5a37]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3d8d5c]" />
                Ending in 12m
              </span>
              <span className="text-[0.65rem] font-medium text-[#9a9a9a]">0.4 mi</span>
            </div>
            <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[1rem] bg-[linear-gradient(135deg,#d9efe0_0%,#82c29a_60%,#3a8858_100%)]">
              <span className="absolute right-2 top-2 rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#2f5a43]">
                Dairy
              </span>
            </div>
            <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#3d8d5c]">
              Corner Market
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight text-[#1a1a1a]">
              Greek yogurt four-pack
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-[#1a1a1a]">
                $2.40
              </span>
              <span className="text-xs font-medium text-[#9a9a9a] line-through">
                $4.50
              </span>
              <span className="ml-auto rounded-md bg-[#3d8d5c] px-1.5 py-0.5 text-[0.62rem] font-bold text-white">
                -47%
              </span>
            </div>
          </div>

          <div className="absolute -left-12 -top-10 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_14px_30px_rgba(14,50,28,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="#3d8d5c"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12l5 5L20 7" />
            </svg>
          </div>

          <div className="absolute -right-10 bottom-8 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_14px_30px_rgba(14,50,28,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="#3d8d5c"
            >
              <path d="M19 4c-6 0-11 4-11 10 0 2 1 4 2 5-2 0-4-2-4-4 0 3 3 6 6 6 5 0 9-4 9-10 0-3-1-5-2-7Zm-7 10c1-3 3-5 6-6-2 3-4 5-6 6Z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 px-12 text-center">
        <p className="text-sm font-medium leading-6 text-white/95">
          Sealed grocery deals, rescued before they expire.
        </p>
      </div>
    </div>
  );
}
