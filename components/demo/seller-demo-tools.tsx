"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { format } from "date-fns";

import { formatAuctionResultLabel, formatCurrency } from "@/lib/auctions/display";

export type DemoAuctionView = {
  auctionId: string;
  listingId: string;
  listingTitle: string;
  status: "scheduled" | "active" | "closed" | "cancelled";
  result: "pending" | "reserve_not_met" | "winning_bid" | "buyout" | "cancelled";
  reservePriceCents: number;
  buyoutPriceCents: number | null;
  currentBidAmountCents: number | null;
  currentLeaderUserId: string | null;
  bidCount: number;
  scheduledEndAt: string;
  endedAt: string | null;
};

type DemoSeedResult = {
  businessCount: number;
  consumerCount: number;
  listingCount: number;
  scenarioKeys: string[];
};

type DemoActionResponse =
  | {
      ok: true;
      auction?: DemoAuctionView | null;
      result?: DemoSeedResult;
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type SellerDemoToolsProps = {
  initialAuction: DemoAuctionView | null;
};

type ActionButtonProps = {
  title: string;
  detail: string;
  pendingLabel: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
};

function ActionButton({
  title,
  detail,
  pendingLabel,
  onClick,
  disabled = false,
  pending = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="rounded-[1.7rem] border border-[#d6e0dc] bg-white/92 p-4 text-left shadow-[0_18px_60px_rgba(41,56,48,0.07)] transition hover:border-[#9eb7ac] hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
    >
      <p className="text-sm font-semibold tracking-[-0.02em] text-[#183127]">
        {pending ? pendingLabel : title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#557164]">{detail}</p>
    </button>
  );
}

function formatWhen(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, h:mm a");
}

function getAuctionTone(auction: DemoAuctionView | null) {
  if (!auction) {
    return "bg-[#eef3f0] text-[#5b7064]";
  }

  if (auction.status === "closed") {
    return "bg-[#f0e3d7] text-[#8f5f3a]";
  }

  return "bg-[#dff3e7] text-[#1d7a52]";
}

export function SellerDemoTools({ initialAuction }: SellerDemoToolsProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [seedResult, setSeedResult] = useState<DemoSeedResult | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasAuction = Boolean(auction);
  const canTriggerOutbid = Boolean(auction?.currentLeaderUserId) && auction?.status === "active";
  const canAdvanceHero = auction?.status === "active";

  async function runRequest(
    action: string,
    input: {
      path: string;
      method?: "GET" | "POST";
      body?: Record<string, string>;
      successMessage: string;
    },
  ) {
    setPendingAction(action);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(input.path, {
        method: input.method ?? "POST",
        headers:
          input.method === "GET"
            ? undefined
            : {
                "content-type": "application/json",
              },
        body: input.body ? JSON.stringify(input.body) : undefined,
        cache: "no-store",
      });
      const data = (await response.json()) as DemoActionResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "The demo control request failed." : data.error.message);
        return;
      }

      startTransition(() => {
        if ("auction" in data) {
          setAuction(data.auction ?? null);
        }

        if ("result" in data) {
          setSeedResult(data.result ?? null);
        }
      });
      setFeedback(input.successMessage);
    } catch {
      setError("The demo control request failed. Try again in a moment.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <section className="rounded-[2rem] border border-[#dbe6e0] bg-[rgba(242,249,245,0.92)] p-5 shadow-[0_22px_80px_rgba(47,64,55,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#59796a]">
              Hero auction
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#173127]">
              {auction ? auction.listingTitle : "No hero auction prepared yet"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4f685c]">
              {auction
                ? "This is the operator-owned auction for the scripted Phase 8 walkthrough."
                : "Prepare the hero auction after you reset the ambient world. The rest of the controls wake up once it exists."}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${getAuctionTone(
              auction,
            )}`}
          >
            {auction
              ? formatAuctionResultLabel(auction.status, auction.result)
              : "Waiting"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Current bid",
              value: formatCurrency(
                auction?.currentBidAmountCents ?? auction?.reservePriceCents ?? null,
              ),
            },
            {
              label: "Bid count",
              value: String(auction?.bidCount ?? 0).padStart(2, "0"),
            },
            {
              label: "Ends",
              value: auction ? formatWhen(auction.scheduledEndAt) : "—",
            },
            {
              label: "Closed",
              value: auction?.endedAt ? formatWhen(auction.endedAt) : "—",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.4rem] border border-[#d2e0d8] bg-white/88 p-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#5b786a]">
                {metric.label}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-[#163126]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void runRequest("refresh", {
                path: "/api/internal/demo/hero",
                method: "GET",
                successMessage: "Hero auction status refreshed.",
              })
            }
            disabled={pendingAction !== null}
            className="inline-flex items-center justify-center rounded-full border border-[#c6d7cf] bg-white/90 px-4 py-2 text-sm font-semibold text-[#28473b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "refresh" ? "Refreshing…" : "Refresh status"}
          </button>
          <Link
            href="/sell/outcomes"
            className="inline-flex items-center justify-center rounded-full border border-[#e5d6c6] bg-white/90 px-4 py-2 text-sm font-semibold text-[#7b5c45]"
          >
            Open outcomes
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#d7e3dd] bg-[rgba(246,250,248,0.94)] p-5 shadow-[0_22px_80px_rgba(47,64,55,0.08)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#618171]">
          Operator controls
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#183127]">
          Drive the scripted beats from one place
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#536d61]">
          Reset the ambient backdrop first, prepare the hero auction, then advance the
          outbid, ending-soon, and close moments on cue.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ActionButton
            title="Reset ambient world"
            pendingLabel="Resetting ambient world…"
            onClick={() =>
              void runRequest("seed", {
                path: "/api/internal/demo/seed",
                body: {},
                successMessage: "Ambient demo world reset without manual SQL.",
              })
            }
            detail="Reset the small ambient world so the feed shows fresh, active, ending-soon, and sold states."
            pending={pendingAction === "seed"}
          />
          <ActionButton
            title="Prepare hero auction"
            pendingLabel="Preparing hero auction…"
            onClick={() =>
              void runRequest("prepare", {
                path: "/api/internal/demo/hero",
                body: {},
                successMessage: "Hero auction prepared for this seller.",
              })
            }
            detail="Recreate the hero auction under the current seller membership before the shopper starts bidding."
            pending={pendingAction === "prepare"}
          />
          <ActionButton
            title="Inject competitor outbid"
            pendingLabel="Injecting competitor outbid…"
            disabled={!canTriggerOutbid}
            onClick={() =>
              auction
                ? void runRequest("outbid", {
                    path: "/api/internal/demo/hero/outbid",
                    body: {
                      auctionId: auction.auctionId,
                    },
                    successMessage: "Competitor outbid injected through the real auction service.",
                  })
                : undefined
            }
            detail="Requires a real shopper bid first. Once the shopper leads, this injects the competitor outbid."
            pending={pendingAction === "outbid"}
          />
          <ActionButton
            title="Trigger ending soon"
            pendingLabel="Triggering ending soon…"
            disabled={!hasAuction || !canAdvanceHero}
            onClick={() =>
              auction
                ? void runRequest("endingSoon", {
                    path: "/api/internal/demo/hero/ending-soon",
                    body: {
                      auctionId: auction.auctionId,
                    },
                    successMessage: "Hero auction moved into the ending-soon window.",
                  })
                : undefined
            }
            detail="Pull the close time into the ending-soon window and trigger the shared push sweep immediately."
            pending={pendingAction === "endingSoon"}
          />
          <ActionButton
            title="Force close now"
            pendingLabel="Force closing hero auction…"
            disabled={!hasAuction || !canAdvanceHero}
            onClick={() =>
              auction
                ? void runRequest("close", {
                    path: "/api/internal/demo/hero/close",
                    body: {
                      auctionId: auction.auctionId,
                    },
                    successMessage: "Hero auction closed through the shared overdue path.",
                  })
                : undefined
            }
            detail="Move the hero auction past its end time and let the existing close flow settle the result."
            pending={pendingAction === "close"}
          />
        </div>

        {seedResult ? (
          <p className="mt-4 text-sm text-[#4b6758]">
            Ambient world ready with {seedResult.businessCount} businesses,{" "}
            {seedResult.consumerCount} shoppers, and {seedResult.listingCount} scripted
            listings.
          </p>
        ) : null}
        {feedback ? (
          <p className="mt-4 text-sm font-medium text-[#1f6b49]">{feedback}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm font-medium text-[#b4441b]">{error}</p> : null}
      </section>

      <section className="rounded-[2rem] border border-[#dddaf5] bg-[rgba(244,245,255,0.92)] p-5 shadow-[0_22px_80px_rgba(55,43,101,0.08)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#675aa0]">
          Walkthrough cues
        </p>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-[#453d6d]">
          <p>1. Reset ambient world so the marketplace backdrop is deterministic again.</p>
          <p>2. Prepare the hero auction, then switch to a shopper session and place a real bid.</p>
          <p>3. Keep the shopper on alerts or bids while you fire outbid, ending-soon, and close here.</p>
          <p>4. Open outcomes after the close beat to confirm the seller-side finish without hunting.</p>
        </div>
      </section>
    </>
  );
}
