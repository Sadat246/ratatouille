import { format } from "date-fns";

import type { SellerOutcomeItem } from "@/lib/auctions/queries";
import { formatCurrency, formatPackageLabel } from "@/lib/auctions/display";

type SellerOutcomesListProps = {
  items: SellerOutcomeItem[];
};

export function SellerOutcomesList({ items }: SellerOutcomesListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[1rem] border border-[#eaeaea] bg-white p-5">
        <h2 className="text-base font-semibold tracking-tight text-[#1a1a1a]">
          No outcomes yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6b6b6b]">
          Closed, cancelled, and sold auctions will collect here with final
          price, commission, payout, and settlement state.
        </p>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[1rem] border border-[#eaeaea] bg-white p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
                {item.result.replaceAll("_", " ")}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-[#1a1a1a]">
                {item.listing.title}
              </h3>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                {formatPackageLabel(item.listing.packageDate)}
              </p>
            </div>

            <span className="rounded-full bg-[#f0f0f0] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#5a5a5a]">
              {item.endedAt ? format(item.endedAt, "MMM d, h:mm a") : "Ended"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "Sale price",
                value: formatCurrency(item.currentBidAmountCents),
              },
              {
                label: "Fee",
                value: formatCurrency(item.settlement?.platformFeeCents ?? 0),
              },
              {
                label: "Seller net",
                value: formatCurrency(item.settlement?.sellerNetAmountCents ?? null),
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[0.75rem] border border-[#eaeaea] bg-[#fafafa] p-3"
              >
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                  {metric.label}
                </p>
                <p className="mt-1.5 text-lg font-semibold tracking-tight text-[#1a1a1a]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-1.5 text-sm leading-6 text-[#6b6b6b]">
            <p>{item.bidCount} bid{item.bidCount === 1 ? "" : "s"}</p>
            <p>
              Settlement {item.settlement?.status ?? "not created"} · payment{" "}
              {item.settlement?.paymentStatus ?? "not required"}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
