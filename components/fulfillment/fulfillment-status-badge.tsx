import type { FulfillmentTone } from "@/lib/fulfillment/status";

const toneClasses: Record<FulfillmentTone, string> = {
  warm: "border-[#f3d7c3] bg-[#fff3ea] text-[#94512f]",
  green: "border-[#cce5d4] bg-[#eef8f2] text-[#1f6b49]",
  amber: "border-[#f0ddb0] bg-[#fff5de] text-[#91591a]",
  slate: "border-[#d9dde6] bg-[#f5f7fb] text-[#546174]",
  rose: "border-[#efc8c0] bg-[#fff0ed] text-[#a2412a]",
};

export function FulfillmentStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: FulfillmentTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
