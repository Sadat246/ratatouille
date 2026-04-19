"use client";

import { startTransition, useEffect, useState } from "react";

import type { ConsumerFulfillmentItem } from "@/lib/fulfillment/queries";

import { ConsumerFulfillmentCard } from "./consumer-fulfillment-card";

type ConsumerOrdersListProps = {
  initialItems: ConsumerFulfillmentItem[];
  focusAuctionId?: string;
};

type FulfillmentListResponse =
  | {
      ok: true;
      fulfillments: ConsumerFulfillmentItem[];
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

export function ConsumerOrdersList({
  initialItems,
  focusAuctionId,
}: ConsumerOrdersListProps) {
  const [items, setItems] = useState(initialItems);

  const focusedItem = focusAuctionId
    ? items.find((item) => item.auctionId === focusAuctionId)
    : null;
  const pollMessage =
    focusAuctionId && !focusedItem
      ? "Wrapping up payment capture. Your order will appear here as soon as fulfillment opens."
      : null;

  useEffect(() => {
    if (!focusAuctionId || focusedItem) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/consumer/fulfillments", {
          cache: "no-store",
        });
        const data = (await response.json()) as FulfillmentListResponse;

        if (!response.ok || !data.ok) {
          return;
        }

        startTransition(() => {
          setItems(data.fulfillments);
        });
      } catch {
        // Keep polling quietly; the next tick can recover.
      }
    }, 3_000);

    return () => window.clearInterval(timer);
  }, [focusAuctionId, focusedItem]);

  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-[#d8e6de] bg-[rgba(241,248,244,0.92)] p-5">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#183227]">
          No cleared orders yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#476456]">
          The moment one of your wins clears payment, pickup or delivery choice
          shows up here.
        </p>
        {pollMessage ? (
          <p className="mt-3 text-sm font-medium text-[#b4441b]">{pollMessage}</p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {pollMessage ? (
        <section className="rounded-[1.8rem] border border-[#ffd7c8] bg-[rgba(255,245,238,0.94)] p-4 text-sm leading-6 text-[#8b4e32]">
          {pollMessage}
        </section>
      ) : null}

      {items.map((item) => (
        <ConsumerFulfillmentCard
          key={item.id}
          item={item}
          focused={Boolean(focusAuctionId && item.auctionId === focusAuctionId)}
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
