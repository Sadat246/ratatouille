"use client";

import { useState, useTransition } from "react";

type MockCardSnapshot = {
  enabled: boolean;
  brand: string | null;
  last4: string | null;
  addedAt?: Date | string | null;
};

type MockCardPanelProps = {
  initialMockCard: MockCardSnapshot;
  onChange?: (mockCard: MockCardSnapshot) => void;
  variant?: "compact" | "full";
};

export function MockCardPanel({
  initialMockCard,
  onChange,
  variant = "full",
}: MockCardPanelProps) {
  const [mockCard, setMockCard] = useState(initialMockCard);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startPendingTransition] = useTransition();

  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return null;
  }

  async function updateMockCard(enabled: boolean) {
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/consumer/mock-card", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      const data = (await response.json()) as
        | {
            ok: true;
            mockCard: MockCardSnapshot;
          }
        | {
            ok: false;
            error: {
              message: string;
            };
          };

      if (!response.ok || !data.ok) {
        setError(
          data.ok
            ? "The mock card could not be updated."
            : data.error.message,
        );
        return;
      }

      startPendingTransition(() => {
        setMockCard(data.mockCard);
        onChange?.(data.mockCard);
      });

      setFeedback(
        data.mockCard.enabled
          ? "Mock Visa 4242 is ready for bidding."
          : "Mock card removed.",
      );
    } catch {
      setError("The mock card request failed. Try again in a moment.");
    }
  }

  const compact = variant === "compact";

  return (
    <section
      className={`rounded-[1.9rem] border ${
        compact
          ? "border-[#ffd7c7] bg-[rgba(255,242,234,0.92)] p-4"
          : "border-[#d8e6de] bg-[rgba(241,248,244,0.92)] p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f634c]">
            {compact ? "Bid gate" : "Mock card on file"}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1f1511]">
            {mockCard.enabled
              ? `${mockCard.brand ?? "Mock card"} •••• ${mockCard.last4 ?? "4242"}`
              : "Add the mock card before bidding"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#6d5244]">
            Phase 4 uses a mock card gate so the auction experience behaves like
            a real checkout-qualified marketplace before Stripe arrives.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${
            mockCard.enabled
              ? "bg-[#1f7f55] text-white"
              : "bg-[#f5d9c9] text-[#8c4e2d]"
          }`}
        >
          {mockCard.enabled ? "Ready" : "Blocked"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void updateMockCard(true)}
          disabled={isPending || mockCard.enabled}
          className="inline-flex items-center justify-center rounded-full bg-[#1f7f55] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91c3af]"
        >
          Add mock Visa 4242
        </button>
        <button
          type="button"
          onClick={() => void updateMockCard(false)}
          disabled={isPending || !mockCard.enabled}
          className="inline-flex items-center justify-center rounded-full border border-[#d7b7a4] px-4 py-2 text-sm font-semibold text-[#744d39] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove card
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm font-medium text-[#1f6b49]">{feedback}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-[#b2421a]">{error}</p> : null}
    </section>
  );
}
