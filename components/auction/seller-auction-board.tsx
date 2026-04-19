"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuctionCountdown } from "@/components/auction/auction-countdown";
import type { SellerLiveAuctionItem } from "@/lib/auctions/queries";
import {
  formatCurrency,
  formatPackageLabel,
} from "@/lib/auctions/display";

type SellerAuctionBoardProps = {
  items: SellerLiveAuctionItem[];
};

export function SellerAuctionBoard({ items }: SellerAuctionBoardProps) {
  const router = useRouter();
  const [pendingAuctionId, setPendingAuctionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancelAuction(auctionId: string) {
    setPendingAuctionId(auctionId);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/cancel`, {
        method: "POST",
      });
      const data = (await response.json()) as
        | {
            ok: true;
          }
        | {
            ok: false;
            error: {
              message: string;
            };
          };

      if (!response.ok || !data.ok) {
        setError(data.ok ? "Cancellation failed." : data.error.message);
        return;
      }

      setFeedback("Auction cancelled.");
      router.refresh();
    } catch {
      setError("Cancellation failed. Try again in a moment.");
    } finally {
      setPendingAuctionId(null);
    }
  }

  if (items.length === 0) {
    return (
      <section className="rounded-[1rem] border border-[#eaeaea] bg-white p-5">
        <h2 className="text-base font-semibold tracking-tight text-[#1a1a1a]">
          No live auctions
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6b6b6b]">
          Fresh listings show up here the moment they go live, with the current
          price, bid count, timer, and seller-side cancel control.
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
                Live auction
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-[#1a1a1a]">
                {item.listing.title}
              </h3>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                {formatPackageLabel(item.listing.packageDate)}
              </p>
            </div>

            <AuctionCountdown
              endsAt={item.scheduledEndAt}
              status={item.status}
              result={item.result}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "Current",
                value: formatCurrency(item.currentBidAmountCents ?? item.reservePriceCents),
              },
              {
                label: "Buyout",
                value: formatCurrency(item.buyoutPriceCents),
              },
              {
                label: "Bids",
                value: String(item.bidCount).padStart(2, "0"),
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

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#6b6b6b]">
              Reserve {formatCurrency(item.reservePriceCents)}
            </p>

            <button
              type="button"
              onClick={() => void cancelAuction(item.id)}
              disabled={pendingAuctionId === item.id}
              className="inline-flex items-center justify-center rounded-full border border-[#eaeaea] bg-white px-4 py-1.5 text-sm font-medium text-[#1a1a1a] transition hover:border-[#dcdcdc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel auction
            </button>
          </div>
        </article>
      ))}

      {feedback ? <p className="text-sm font-medium text-[#2f6b4d]">{feedback}</p> : null}
      {error ? <p className="text-sm font-medium text-[#a14431]">{error}</p> : null}
    </div>
  );
}
