"use client";

import { startTransition, useState } from "react";
import { format } from "date-fns";

import { formatCurrency, formatLocationLabel, formatPackageLabel } from "@/lib/auctions/display";
import type { ConsumerFulfillmentItem } from "@/lib/fulfillment/queries";

import { FulfillmentStatusBadge } from "./fulfillment-status-badge";

type ConsumerFulfillmentCardProps = {
  item: ConsumerFulfillmentItem;
  focused?: boolean;
  onChange: (item: ConsumerFulfillmentItem) => void;
};

type QuoteSuccess = {
  ok: true;
  quote: {
    quoteId: string;
    feeCents: number;
    currency: string;
    etaMinutes: number | null;
    isStub: boolean;
  };
};

type FulfillmentSuccess = {
  ok: true;
  fulfillment: ConsumerFulfillmentItem;
};

type FailureResponse = {
  ok: false;
  error: {
    message: string;
  };
};

export function ConsumerFulfillmentCard({
  item,
  focused = false,
  onChange,
}: ConsumerFulfillmentCardProps) {
  const [pickupPending, setPickupPending] = useState(false);
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [quotePending, setQuotePending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteSuccess["quote"] | null>(null);
  const [form, setForm] = useState({
    recipientName: item.recipientName ?? "",
    recipientPhone: item.recipientPhone ?? "",
    deliveryAddressLine1: item.deliveryAddress.addressLine1,
    deliveryAddressLine2: item.deliveryAddress.addressLine2 ?? "",
    deliveryCity: item.deliveryAddress.city,
    deliveryState: item.deliveryAddress.state,
    deliveryPostalCode: item.deliveryAddress.postalCode,
    deliveryCountryCode: item.deliveryAddress.countryCode,
  });

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function choosePickup() {
    setPickupPending(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/consumer/fulfillments/${item.id}/pickup`, {
        method: "POST",
      });
      const data = (await response.json()) as FulfillmentSuccess | FailureResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "Pickup could not be selected." : data.error.message);
        return;
      }

      startTransition(() => {
        onChange(data.fulfillment);
      });
      setQuote(null);
      setFeedback("Pickup selected. Your code is ready.");
    } catch {
      setError("Pickup could not be selected. Try again in a moment.");
    } finally {
      setPickupPending(false);
    }
  }

  async function requestQuote() {
    setQuotePending(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/consumer/fulfillments/${item.id}/delivery-quote`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );
      const data = (await response.json()) as QuoteSuccess | FailureResponse;

      if (!response.ok || !data.ok) {
        setError(
          data.ok ? "The delivery quote could not be loaded." : data.error.message,
        );
        return;
      }

      setQuote(data.quote);
      setFeedback("Delivery quote ready.");
    } catch {
      setError("The delivery quote could not be loaded. Try again in a moment.");
    } finally {
      setQuotePending(false);
    }
  }

  async function confirmDelivery() {
    setDeliveryPending(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/consumer/fulfillments/${item.id}/delivery`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          quoteId: quote?.quoteId,
        }),
      });
      const data = (await response.json()) as FulfillmentSuccess | FailureResponse;

      if (!response.ok || !data.ok) {
        setError(
          data.ok ? "Delivery could not be started." : data.error.message,
        );
        return;
      }

      startTransition(() => {
        onChange(data.fulfillment);
      });
      setQuote(null);
      setFeedback("Delivery started.");
    } catch {
      setError("Delivery could not be started. Try again in a moment.");
    } finally {
      setDeliveryPending(false);
    }
  }

  return (
    <article
      className={`rounded-[2.2rem] border bg-white/92 p-5 shadow-[0_18px_60px_rgba(69,41,22,0.08)] ${
        focused
          ? "border-[#f75d36] shadow-[0_22px_70px_rgba(247,93,54,0.18)]"
          : "border-[#ecd8ca]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#a15d39]">
            {item.business.name}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#23150f]">
            {item.listing.title}
          </h2>
          <p className="mt-2 text-sm text-[#6d5548]">
            {formatPackageLabel(item.listing.packageDate)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <FulfillmentStatusBadge
            label={item.statusLabel}
            tone={item.statusTone}
          />
          <span className="rounded-full bg-[#f8efe8] px-3 py-1.5 text-xs font-medium text-[#77584a]">
            {format(item.updatedAt, "MMM d, h:mm a")}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6d5548]">
        <span className="rounded-full border border-[#ead9cd] px-3 py-1.5">
          {formatLocationLabel(item.business.city, item.business.state)}
        </span>
        <span className="rounded-full border border-[#ead9cd] px-3 py-1.5">
          {item.mode === "pickup" ? "Store pickup" : "Delivery"}
        </span>
      </div>

      {item.pickupCodeFormatted ? (
        <section className="mt-4 rounded-[1.7rem] border border-[#d9e8df] bg-[rgba(239,248,243,0.92)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#527663]">
            Pickup code
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[0.2em] text-[#173127]">
            {item.pickupCodeFormatted}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#4d685b]">
            Give these six digits to the store staff at handoff.
            {item.pickupCodeExpiresAt
              ? ` Code expires ${format(item.pickupCodeExpiresAt, "MMM d, h:mm a")}.`
              : ""}
          </p>
        </section>
      ) : null}

      {item.deliveryTrackingUrl ? (
        <section className="mt-4 rounded-[1.7rem] border border-[#d8dcef] bg-[rgba(244,246,255,0.92)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#5e6395]">
            Delivery tracking
          </p>
          <p className="mt-2 text-sm leading-6 text-[#4d5373]">
            Uber Direct is handling the run. Use the live tracking link for the
            latest courier movement.
          </p>
          <a
            href={item.deliveryTrackingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[#4d5bc9] px-4 py-2 text-sm font-semibold text-white"
          >
            Track your delivery
          </a>
        </section>
      ) : null}

      {item.status === "failed" ? (
        <section className="mt-4 rounded-[1.7rem] border border-[#efc8c0] bg-[rgba(255,240,237,0.92)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9a4e35]">
            Delivery fallback
          </p>
          <p className="mt-2 text-sm leading-6 text-[#7a4737]">
            Delivery could not be completed. Contact the store to arrange pickup:
            {" "}
            {item.business.contactPhone || item.business.contactEmail || "store contact missing"}.
          </p>
        </section>
      ) : null}

      {(item.canChoosePickup || item.canChooseDelivery) ? (
        <div className="mt-4 grid gap-4">
          <section className="rounded-[1.7rem] border border-[#ead8c8] bg-[rgba(255,248,240,0.92)] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#9b6a4d]">
              Pickup in store
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#2a1e17]">
              {item.business.pickupHours || "Pickup timing shared at the store"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6d5747]">
              {item.business.pickupInstructions ||
                "The staff will verify the six-digit code before handoff."}
            </p>
            <button
              type="button"
              onClick={() => void choosePickup()}
              disabled={pickupPending}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-[#234d3d] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#8cb39f]"
            >
              {pickupPending ? "Saving…" : "Pick up in store"}
            </button>
          </section>

          <section className="rounded-[1.7rem] border border-[#d8dcef] bg-[rgba(244,246,255,0.92)] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#5e6395]">
              Get it delivered
            </p>
            <div className="mt-4 grid gap-3">
              <input
                value={form.recipientName}
                onChange={(event) => updateField("recipientName", event.target.value)}
                placeholder="Recipient name"
                className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
              />
              <input
                value={form.recipientPhone}
                onChange={(event) => updateField("recipientPhone", event.target.value)}
                placeholder="Phone number"
                className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
              />
              <input
                value={form.deliveryAddressLine1}
                onChange={(event) =>
                  updateField("deliveryAddressLine1", event.target.value)
                }
                placeholder="Street address"
                className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
              />
              <input
                value={form.deliveryAddressLine2}
                onChange={(event) =>
                  updateField("deliveryAddressLine2", event.target.value)
                }
                placeholder="Apartment, suite, etc."
                className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.deliveryCity}
                  onChange={(event) => updateField("deliveryCity", event.target.value)}
                  placeholder="City"
                  className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
                />
                <input
                  value={form.deliveryState}
                  onChange={(event) => updateField("deliveryState", event.target.value)}
                  placeholder="State"
                  className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.deliveryPostalCode}
                  onChange={(event) =>
                    updateField("deliveryPostalCode", event.target.value)
                  }
                  placeholder="Postal code"
                  className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
                />
                <input
                  value={form.deliveryCountryCode}
                  onChange={(event) =>
                    updateField("deliveryCountryCode", event.target.value)
                  }
                  placeholder="Country"
                  className="rounded-[1.2rem] border border-[#d7dbef] bg-white/90 px-4 py-3 text-sm text-[#23150f] outline-none transition focus:border-[#4d5bc9]"
                />
              </div>
            </div>

            {quote ? (
              <div className="mt-4 rounded-[1.4rem] border border-[#ccd4fb] bg-white/86 p-4 text-sm text-[#4d5373]">
                <p className="font-semibold text-[#29306f]">
                  Delivery quote {formatCurrency(quote.feeCents)}
                  {quote.etaMinutes ? ` · about ${quote.etaMinutes} min` : ""}
                </p>
                <p className="mt-2 leading-6">
                  Confirm the run to lock in delivery and tracking.
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void requestQuote()}
                disabled={quotePending}
                className="inline-flex items-center justify-center rounded-full border border-[#c5cbef] bg-white/88 px-4 py-2 text-sm font-semibold text-[#3b447e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {quotePending ? "Quoting…" : "Get delivery quote"}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelivery()}
                disabled={!quote || deliveryPending}
                className="inline-flex items-center justify-center rounded-full bg-[#4d5bc9] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#a9b0e8]"
              >
                {deliveryPending ? "Starting…" : "Confirm delivery"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {feedback ? (
        <p className="mt-4 text-sm font-medium text-[#1f6b49]">{feedback}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm font-medium text-[#b4441b]">{error}</p> : null}
    </article>
  );
}
