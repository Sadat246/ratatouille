import Link from "next/link";
import { format } from "date-fns";

import type { ConsumerPurchaseItem } from "@/lib/auctions/queries";
import { formatCurrency, formatPackageLabel } from "@/lib/auctions/display";
import { coerceDate } from "@/lib/datetime";

function formatStreetAddress(item: ConsumerPurchaseItem["business"]) {
  const parts = [
    item.addressLine1,
    item.addressLine2,
    [item.city, item.state].filter(Boolean).join(", "),
    item.postalCode,
  ].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return item.addressLabel ?? "Address on file with seller";
}

type PurchasesListProps = {
  items: ConsumerPurchaseItem[];
};

export function PurchasesList({ items }: PurchasesListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-[#d8e6de] bg-[rgba(241,248,244,0.9)] p-5">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#183227]">
          No purchases yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#476456]">
          When you win an auction and payment clears, your pickup code and store
          address show up here.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const pickupDeadline = coerceDate(item.pickupBy);
        return (
          <article
            key={item.fulfillmentId}
            className="rounded-[2rem] border border-[#cde1d7] bg-white/92 p-5 shadow-[0_18px_60px_rgba(35,60,48,0.08)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#58806f]">
                  {item.business.name}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#142920]">
                  {item.listing.title}
                </h3>
                <p className="mt-2 text-sm text-[#4a6358]">
                  {formatPackageLabel(item.listing.packageDate)}
                </p>
              </div>
              <span className="rounded-full bg-[#eaf6f0] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#256145]">
                Paid {formatCurrency(item.amountPaidCents)}
              </span>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#3d5348]">
              <span className="font-medium text-[#1a2e24]">Pickup address</span>
              <br />
              {formatStreetAddress(item.business)}
            </p>

            {item.business.pickupHours ? (
              <p className="mt-2 text-sm text-[#3d5348]">
                <span className="font-medium text-[#1a2e24]">Hours</span>{" "}
                {item.business.pickupHours}
              </p>
            ) : null}

            {item.business.pickupInstructions ? (
              <p className="mt-2 text-sm text-[#3d5348]">
                <span className="font-medium text-[#1a2e24]">Notes</span>{" "}
                {item.business.pickupInstructions}
              </p>
            ) : null}

            {item.pickupCode ? (
              <p className="mt-4 rounded-[1.2rem] border border-[#b9d0c4] bg-[rgba(240,248,244,0.95)] px-4 py-3 font-mono text-base font-semibold tracking-[0.12em] text-[#0f1f18]">
                Pickup code: {item.pickupCode}
              </p>
            ) : null}

            {pickupDeadline ? (
              <p className="mt-3 text-sm font-medium text-[#8a4a2d]">
                Pick up by {format(pickupDeadline, "MMM d, yyyy h:mm a")}
              </p>
            ) : null}

            <div className="mt-4">
              <Link
                href={`/shop/${item.auctionId}`}
                className="text-sm font-semibold text-[#1f7f55] underline decoration-[#1f7f55]/35 underline-offset-4 hover:decoration-[#1f7f55]"
              >
                View auction detail
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
