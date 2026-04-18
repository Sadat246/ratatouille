import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  tone: string;
  children: ReactNode;
};

export function SectionCard({ title, tone, children }: SectionCardProps) {
  return (
    <section
      className={`rounded-[2rem] border p-4 shadow-[0_22px_80px_rgba(47,26,16,0.08)] ${tone}`}
    >
      <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
