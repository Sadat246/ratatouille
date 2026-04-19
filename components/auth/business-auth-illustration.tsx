export function BusinessAuthIllustration() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(155deg,#0f2a1a_0%,#1e5a37_45%,#4a9a6d_100%)]">
      <div className="absolute -left-14 top-10 h-40 w-80 rounded-[50%] bg-white/78 blur-[1px]" />
      <div className="absolute left-14 top-28 h-20 w-40 rounded-[50%] bg-white/82" />
      <div className="absolute -right-12 bottom-20 h-44 w-80 rounded-[50%] bg-white/72" />
      <div className="absolute right-20 bottom-36 h-20 w-36 rounded-[50%] bg-white/80" />

      <div className="absolute inset-0 flex items-center justify-center px-10">
        <div className="relative">
          <div className="w-[320px] rounded-[1.4rem] bg-white p-5 shadow-[0_30px_80px_rgba(14,50,28,0.35)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9a9a9a]">
                Today
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f1ea] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#1e5a37]">
                Live
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1a1a1a]">
              12 lots rescued
            </p>
            <p className="mt-1 text-xs text-[#6b6b6b]">
              $142 recovered · 3 auctions still live
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Sold", value: "8" },
                { label: "Live", value: "3" },
                { label: "Drafts", value: "2" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg bg-[#f2f7f3] px-2 py-2 text-center"
                >
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#7a7a7a]">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#1a1a1a]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-[#f0f0f0] pt-3">
              {[
                { title: "Dairy bundle", status: "Active", meta: "6 bids" },
                { title: "Sourdough loaves", status: "Ending", meta: "2m left" },
              ].map((row) => (
                <div
                  key={row.title}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-xs font-medium text-[#1a1a1a]">
                    {row.title}
                  </span>
                  <span className="text-[0.62rem] text-[#7a7a7a]">{row.meta}</span>
                  <span className="rounded-full bg-[#e6f1ea] px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#1e5a37]">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -left-10 -top-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_14px_30px_rgba(14,50,28,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="#3d8d5c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 8 8-4 8 4-8 4Zm0 0v8l8 4 8-4V8" />
              <path d="M12 12v8" />
            </svg>
          </div>

          <div className="absolute -right-8 bottom-6 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_14px_30px_rgba(14,50,28,0.28)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="#3d8d5c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 19V9m7 10V5m7 14v-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 px-12 text-center">
        <p className="text-sm font-medium leading-6 text-white/95">
          Recover margin on surplus inventory — nothing goes to waste.
        </p>
      </div>
    </div>
  );
}
