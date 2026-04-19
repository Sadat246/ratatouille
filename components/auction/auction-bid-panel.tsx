"use client";

import { startTransition, useState } from "react";

import { StripeCardSetup } from "@/components/auction/stripe-card-setup";
import { formatCurrency } from "@/lib/auctions/display";

type AuctionViewerSnapshot = {
  hasMockCardOnFile: boolean;
  isLeading: boolean;
  minimumNextBidAmountCents: number;
};

type AuctionBidPanelProps = {
  auctionId: string;
  status: string;
  result: string;
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  viewer: AuctionViewerSnapshot | null;
  onAuctionChange: (auction: unknown) => void;
};

type AuctionRouteSuccess = {
  ok: true;
  action: string;
  auction: unknown;
};

type AuctionRouteFailure = {
  ok: false;
  error: {
    message: string;
  };
};

export function AuctionBidPanel({
  auctionId,
  status,
  result,
  reservePriceCents,
  buyoutPriceCents,
  viewer,
  onAuctionChange,
}: AuctionBidPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [cardJustAttached, setCardJustAttached] = useState(false);

  async function submit(kind: "bid" | "buyout") {
    setError(null);
    setFeedback(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/${kind}`, {
        method: "POST",
      });

      const data = (await response.json()) as AuctionRouteSuccess | AuctionRouteFailure;

      if (!response.ok || !data.ok) {
        setError(
          data.ok
            ? "The auction action failed."
            : data.error.message,
        );
        return;
      }

      startTransition(() => {
        onAuctionChange(data.auction);
      });

      setFeedback(
        kind === "bid"
          ? "Bid accepted by the server."
          : "Buyout accepted by the server.",
      );
    } catch {
      setError("The auction action failed. Try again in a moment.");
    } finally {
      setIsPending(false);
    }
  }

  const auctionOpen = status === "active" || status === "scheduled";
  const cardReady = (viewer?.hasMockCardOnFile ?? false) || cardJustAttached;
  const canBid = auctionOpen && cardReady && !viewer?.isLeading;
  const canBuyout = auctionOpen && cardReady && buyoutPriceCents !== null;

  return (
    <section className="rounded-[2rem] border border-[#ffd9c9] bg-[rgba(255,245,238,0.92)] p-5 shadow-[0_18px_60px_rgba(108,52,29,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#a85b35]">
            Bid controls
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#24140f]">
            {auctionOpen ? "Choose your move" : "Auction settled"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#6d5245]">
            Every shopper bids against the same live price: the highest authorized
            bid wins when the timer ends (or someone buys out). The server records
            each bid, updates the leader, and notifies anyone who was outbid.
          </p>
        </div>

        <div className="rounded-[1.4rem] bg-white/85 px-3 py-3 text-right">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9b6a52]">
            Next bid
          </p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#1f1511]">
            {formatCurrency(viewer?.minimumNextBidAmountCents ?? reservePriceCents)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => void submit("bid")}
          disabled={!canBid || isPending}
          className="inline-flex items-center justify-center rounded-[1.5rem] bg-[#f75d36] px-4 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#f6b09b]"
        >
          Place {formatCurrency(viewer?.minimumNextBidAmountCents ?? reservePriceCents)} bid
        </button>

        <button
          type="button"
          onClick={() => void submit("buyout")}
          disabled={!canBuyout || isPending}
          className="inline-flex items-center justify-center rounded-[1.5rem] border border-[#d8b4a1] bg-white/85 px-4 py-4 text-base font-semibold text-[#6c4735] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buyoutPriceCents === null
            ? "Buyout unavailable"
            : `Buy now for ${formatCurrency(buyoutPriceCents)}`}
        </button>
      </div>

      {!cardReady && auctionOpen ? (
        <div className="mt-4">
          <StripeCardSetup
            onCardAttached={() => {
              setCardJustAttached(true);
              setFeedback("Card saved. You can place a bid now.");
            }}
          />
        </div>
      ) : null}

      {viewer?.isLeading && auctionOpen ? (
        <p className="mt-4 text-sm font-medium text-[#1c6b4a]">
          You are currently leading. Wait for another bidder or use buyout to lock it now.
        </p>
      ) : null}

      {!auctionOpen ? (
        <p className="mt-4 text-sm font-medium text-[#6a5247]">
          Final result: {result === "cancelled" ? "cancelled" : result.replaceAll("_", " ")}.
        </p>
      ) : null}

      {feedback ? (
        <p className="mt-4 text-sm font-medium text-[#216548]">{feedback}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm font-medium text-[#b4441b]">{error}</p> : null}
    </section>
  );
}
