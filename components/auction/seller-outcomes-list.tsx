import { format } from "date-fns";

import type { SellerOutcomeItem } from "@/lib/auctions/queries";
import { coerceDate } from "@/lib/datetime";
import { formatCurrency, formatPackageLabel } from "@/lib/auctions/display";

type SellerOutcomesListProps = {
  items: SellerOutcomeItem[];
};

export function SellerOutcomesList({ items }: SellerOutcomesListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-[#ecdac7] bg-[rgba(255,247,236,0.9)] p-5">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#2b2116]">
          No outcomes yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6a5547]">
          Closed, cancelled, and sold auctions will collect here with final
          price, commission, payout, and settlement state.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[2rem] border border-[#ecdac7] bg-white/92 p-5 shadow-[0_18px_60px_rgba(71,44,23,0.08)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8b6a53]">
                {item.result.replaceAll("_", " ")}
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#231913]">
                {item.listing.title}
              </h3>
              <p className="mt-2 text-sm text-[#684f41]">
                {formatPackageLabel(item.listing.packageDate)}
              </p>
            </div>

            <span className="rounded-full bg-[#f7efe7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#86573d]">
              {(() => {
                const ended = coerceDate(item.endedAt);
                return ended ? format(ended, "MMM d, h:mm a") : "Ended";
              })()}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[1.4rem] border border-[#eedbc9] bg-[rgba(255,248,241,0.9)] p-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9a7157]">
                Sale price
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#231913]">
                {formatCurrency(item.currentBidAmountCents)}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-[#eedbc9] bg-[rgba(255,248,241,0.9)] p-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9a7157]">
                Fee
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#231913]">
                {formatCurrency(item.settlement?.platformFeeCents ?? 0)}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-[#eedbc9] bg-[rgba(255,248,241,0.9)] p-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9a7157]">
                Seller net
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#231913]">
                {formatCurrency(item.settlement?.sellerNetAmountCents ?? null)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-[#6a5547]">
            <p>Bid count {item.bidCount}.</p>
            <p>
              Settlement {item.settlement?.status ?? "not created"} / payment{" "}
              {item.settlement?.paymentStatus ?? "not required"}.
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
