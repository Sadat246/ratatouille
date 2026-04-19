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
      <section className="rounded-[2rem] border border-[#d9e6de] bg-[rgba(241,248,244,0.92)] p-5">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#173127]">
          No live auctions
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#466255]">
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
          className="rounded-[2rem] border border-[#d8e4dc] bg-white/92 p-5 shadow-[0_20px_60px_rgba(35,43,28,0.08)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#55776a]">
                Live auction
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#17241e]">
                {item.listing.title}
              </h3>
              <p className="mt-2 text-sm text-[#5d6b65]">
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
                label: "Bid count",
                value: String(item.bidCount).padStart(2, "0"),
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[1.4rem] border border-[#dce6df] bg-[rgba(244,249,246,0.9)] p-3"
              >
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#648577]">
                  {metric.label}
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#173127]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#5c6d64]">
              Reserve {formatCurrency(item.reservePriceCents)}. Keep this hands-off unless you need to cancel.
            </p>

            <button
              type="button"
              onClick={() => void cancelAuction(item.id)}
              disabled={pendingAuctionId === item.id}
              className="inline-flex items-center justify-center rounded-full border border-[#d8b7a6] px-4 py-2 text-sm font-semibold text-[#754c39] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel auction
            </button>
          </div>
        </article>
      ))}

      {feedback ? <p className="text-sm font-medium text-[#1f6b49]">{feedback}</p> : null}
      {error ? <p className="text-sm font-medium text-[#b3431b]">{error}</p> : null}
    </div>
  );
}
