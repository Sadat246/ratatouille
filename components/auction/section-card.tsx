import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  /**
   * Kept for backward compatibility with the previous warm-tone palette.
   * The cleaner shell now uses a single neutral card style and ignores it.
   */
  tone?: string;
  children: ReactNode;
  action?: ReactNode;
};

export function SectionCard({ title, children, action }: SectionCardProps) {
  return (
    <section className="rounded-[1rem] border border-[#eaeaea] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.03)]">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-[#1a1a1a]">
          {title}
        </h2>
        {action}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}
