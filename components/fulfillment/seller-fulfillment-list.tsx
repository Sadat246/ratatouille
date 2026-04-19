"use client";

import { startTransition, useState } from "react";
import { format } from "date-fns";

import { formatPackageLabel } from "@/lib/auctions/display";
import type { SellerFulfillmentItem } from "@/lib/fulfillment/queries";

import { FulfillmentStatusBadge } from "./fulfillment-status-badge";

type SellerFulfillmentListProps = {
  initialItems: SellerFulfillmentItem[];
};

type SuccessResponse = {
  ok: true;
  fulfillment: SellerFulfillmentItem;
};

type FailureResponse = {
  ok: false;
  error: {
    message: string;
  };
};

function SellerFulfillmentCard({
  item,
  onChange,
}: {
  item: SellerFulfillmentItem;
  onChange: (item: SellerFulfillmentItem) => void;
}) {
  const [code, setCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyPickup() {
    setIsPending(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/business/fulfillments/${item.id}/verify-pickup`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ code }),
        },
      );
      const data = (await response.json()) as SuccessResponse | FailureResponse;

      if (!response.ok || !data.ok) {
        setError(
          data.ok ? "Pickup could not be verified." : data.error.message,
        );
        return;
      }

      startTransition(() => {
        onChange(data.fulfillment);
      });
      setCode("");
      setFeedback("Pickup verified.");
    } catch {
      setError("Pickup could not be verified. Try again in a moment.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <article className="rounded-[2rem] border border-[#d9e1dc] bg-white/92 p-5 shadow-[0_18px_60px_rgba(43,59,47,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#5f7c6d]">
            {item.mode === "pickup" ? "Store pickup" : "Uber Direct"}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#17241e]">
            {item.listing.title}
          </h3>
          <p className="mt-2 text-sm text-[#5b6d64]">
            {formatPackageLabel(item.listing.packageDate)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <FulfillmentStatusBadge
            label={item.statusLabel}
            tone={item.statusTone}
          />
          <span className="rounded-full bg-[#eef4f1] px-3 py-1.5 text-xs font-medium text-[#5f7068]">
            {format(item.updatedAt, "MMM d, h:mm a")}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#4c5d55]">
        <p>
          Buyer {item.buyer.name || item.buyer.email || "Unknown shopper"}.
        </p>
        {item.recipientPhone ? <p>Recipient phone {item.recipientPhone}.</p> : null}
        {item.pickupCodeExpiresAt ? (
          <p>Pickup code expires {format(item.pickupCodeExpiresAt, "MMM d, h:mm a")}.</p>
        ) : null}
      </div>

      {item.status === "ready_for_pickup" ? (
        <section className="mt-4 rounded-[1.7rem] border border-[#ead8c8] bg-[rgba(255,248,240,0.92)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#946549]">
            Verify pickup
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="482 619"
              className="flex-1 rounded-[1.2rem] border border-[#e1ccb8] bg-white/88 px-4 py-3 text-base tracking-[0.16em] text-[#24150f] outline-none transition focus:border-[#d98353]"
            />
            <button
              type="button"
              onClick={() => void verifyPickup()}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#234d3d] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#8cb39f]"
            >
              {isPending ? "Checking…" : "Verify"}
            </button>
          </div>
        </section>
      ) : null}

      {item.deliveryTrackingUrl ? (
        <a
          href={item.deliveryTrackingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-[#c5d0fb] bg-[rgba(244,246,255,0.92)] px-4 py-2 text-sm font-semibold text-[#4050ba]"
        >
          Track delivery
        </a>
      ) : null}

      {item.status === "failed" ? (
        <p className="mt-4 text-sm font-medium text-[#a0432d]">
          Delivery failed. Contact the buyer to arrange manual pickup.
        </p>
      ) : null}
      {feedback ? (
        <p className="mt-4 text-sm font-medium text-[#1f6b49]">{feedback}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm font-medium text-[#b4441b]">{error}</p> : null}
    </article>
  );
}

export function SellerFulfillmentList({
  initialItems,
}: SellerFulfillmentListProps) {
  const [items, setItems] = useState(initialItems);

  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-[#d8e6de] bg-[rgba(241,248,244,0.92)] p-5">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#183227]">
          No fulfillment work yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#476456]">
          Paid orders will collect here as soon as buyers choose pickup or delivery.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <SellerFulfillmentCard
          key={item.id}
          item={item}
          onChange={(nextItem) => {
            startTransition(() => {
              setItems((current) =>
                current.map((entry) => (entry.id === nextItem.id ? nextItem : entry)),
              );
            });
          }}
        />
      ))}
    </div>
  );
}
