"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useEffect, useRef, useState } from "react";

type SetupIntentResponse =
  | { ok: true; clientSecret: string }
  | { ok: false; error: { message: string } };

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> = publishableKey
  ? loadStripe(publishableKey)
  : Promise.resolve(null);

type StripeCardSetupProps = {
  onCardAttached: () => void;
};

export function StripeCardSetup({ onCardAttached }: StripeCardSetupProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(() =>
    publishableKey
      ? null
      : "Stripe is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local.",
  );
  const fetchStartedRef = useRef(false);

  useEffect(() => {
    if (!publishableKey) return;
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/consumer/setup-intent", {
          method: "POST",
        });
        const data = (await response.json()) as SetupIntentResponse;
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setBootstrapError(
            data.ok ? "Could not start card setup." : data.error.message,
          );
          return;
        }
        setClientSecret(data.clientSecret);
      } catch {
        if (!cancelled) {
          setBootstrapError("Network error while starting card setup.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (bootstrapError) {
    return (
      <section className="rounded-[1.9rem] border border-[#ffd7c7] bg-[rgba(255,242,234,0.92)] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8f634c]">
          Card setup
        </p>
        <p className="mt-2 text-sm font-medium text-[#b2421a]">
          {bootstrapError}
        </p>
      </section>
    );
  }

  if (!clientSecret) {
    return (
      <section className="rounded-[1.9rem] border border-[#d8e6de] bg-[rgba(241,248,244,0.92)] p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#1f7f55]">
          Card setup
        </p>
        <p className="mt-2 text-sm text-[#6d5244]">
          Preparing secure card form…
        </p>
      </section>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardForm onCardAttached={onCardAttached} />
    </Elements>
  );
}

function CardForm({ onCardAttached }: { onCardAttached: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setError(null);
    setIsSubmitting(true);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/consumer/card-return`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Could not save your card.");
      setIsSubmitting(false);
      return;
    }

    // Don't wait for `setup_intent.succeeded` to land via webhook — call our
    // server immediately so the bid panel sees `hasMockCardOnFile = true` on
    // the next refresh. The webhook handler is idempotent with this call.
    if (setupIntent?.id) {
      try {
        await fetch("/api/consumer/setup-intent/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ setupIntentId: setupIntent.id }),
        });
      } catch {
        // The webhook will catch up; surface a soft note but still proceed.
        console.warn("Could not eagerly confirm card; awaiting webhook.");
      }
    }

    setIsSubmitting(false);
    onCardAttached();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[1.9rem] border border-[#d8e6de] bg-[rgba(241,248,244,0.92)] p-5"
    >
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#1f7f55]">
          Add a card to bid
        </p>
        <p className="mt-2 text-sm text-[#6d5244]">
          Cards are saved with Stripe so future bids clear instantly. Use test
          card 4242 4242 4242 4242 in this environment.
        </p>
      </div>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-[#1f7f55] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91c3af]"
      >
        {isSubmitting ? "Saving…" : "Save card"}
      </button>
      {error ? (
        <p className="text-sm font-medium text-[#b2421a]">{error}</p>
      ) : null}
    </form>
  );
}
