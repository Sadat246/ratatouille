type WordmarkProps = {
  subtitle?: string;
  tone?: "light" | "dark";
};

export function Wordmark({
  subtitle,
  tone = "dark",
}: WordmarkProps) {
  const isLight = tone === "light";

  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-[1.35rem] shadow-[0_18px_40px_rgba(86,34,20,0.16)] ${
          isLight ? "bg-white/14 text-[#eaf6ee]" : "bg-[#3d8d5c] text-[#eaf6ee]"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          className="h-7 w-7"
          fill="currentColor"
        >
          <path d="M10 54C10 30 30 10 54 10c0 28-20 44-44 44z" />
        </svg>
      </span>
      <div>
        <p
          className={`text-[1.1rem] leading-none font-semibold tracking-[-0.04em] ${
            isLight ? "text-white" : "text-[#1f1410]"
          }`}
        >
          Ratatouille
        </p>
        {subtitle ? (
          <p
            className={`mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] ${
              isLight ? "text-[#ffe9ce]" : "text-[#9b5537]"
            }`}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
