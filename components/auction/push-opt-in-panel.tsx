"use client";

import { useEffect, useState } from "react";

type PushAvailabilityResponse =
  | {
      ok: true;
      available: boolean;
      publicKey: string | null;
      subscribed: boolean;
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

type PushOptInPanelProps = {
  title?: string;
  description?: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(normalized);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function PushOptInPanel({
  title = "Outbid alerts",
  description = "Enable browser notifications so the app can call you back when a live auction moves without you.",
}: PushOptInPanelProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Avoid SSR vs browser mismatch: support + API result only apply after mount. */
  const [mounted, setMounted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    setMounted(true);

    if (!supported) {
      setAvailabilityLoaded(true);
      return;
    }

    async function loadAvailability() {
      try {
        const response = await fetch("/api/push/subscribe", {
          cache: "no-store",
        });
        const data = (await response.json()) as PushAvailabilityResponse;

        if (!response.ok || !data.ok) {
          setError(data.ok ? "Push availability failed." : data.error.message);
          return;
        }

        setIsAvailable(data.available);
        setPublicKey(data.publicKey);
        setIsSubscribed(data.subscribed);
      } catch {
        setError("Push availability failed. Try again in a moment.");
      } finally {
        setAvailabilityLoaded(true);
      }
    }

    void loadAvailability();
  }, []);

  async function enablePush() {
    if (!publicKey) {
      setError("Push is not configured on this deployment yet.");
      return;
    }

    setIsPending(true);
    setError(null);
    setFeedback(null);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = (await response.json()) as PushAvailabilityResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "Push opt-in failed." : data.error.message);
        return;
      }

      setIsSubscribed(true);
      setFeedback("Browser alerts are now connected for this account.");
    } catch {
      setError("Push opt-in failed. Check browser notification permissions.");
    } finally {
      setIsPending(false);
    }
  }

  async function disablePush() {
    setIsPending(true);
    setError(null);
    setFeedback(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        setFeedback("No active browser alert subscription was found.");
        return;
      }

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      setIsSubscribed(false);
      setFeedback("Browser alerts were disconnected.");
    } catch {
      setError("Push opt-out failed. Try again in a moment.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-[1rem] border border-[#eaeaea] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
            Push notifications
          </p>
          <h3 className="mt-1.5 text-base font-semibold tracking-tight text-[#1a1a1a]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#6b6b6b]">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
            isSubscribed
              ? "bg-[#e6f1ea] text-[#2f6b4d]"
              : "bg-[#f0f0f0] text-[#5a5a5a]"
          }`}
        >
          {isSubscribed ? "On" : "Off"}
        </span>
      </div>

      {!mounted ? (
        <p className="mt-4 text-sm text-[#7a7a7a]">
          Checking push notification support…
        </p>
      ) : !isSupported ? (
        <p className="mt-4 text-sm text-[#7a7a7a]">
          This browser does not expose Service Worker Push APIs.
        </p>
      ) : !availabilityLoaded ? (
        <p className="mt-4 text-sm text-[#7a7a7a]">Loading push settings…</p>
      ) : !isAvailable ? (
        <p className="mt-4 text-sm text-[#7a7a7a]">
          Push is not configured on this deployment yet. The rest of the auction
          flow still works normally.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void enablePush()}
            disabled={isPending || isSubscribed}
            className="inline-flex items-center justify-center rounded-full bg-[#3d8d5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e5a37] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enable alerts
          </button>
          <button
            type="button"
            onClick={() => void disablePush()}
            disabled={isPending || !isSubscribed}
            className="inline-flex items-center justify-center rounded-full border border-[#eaeaea] bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition hover:border-[#dcdcdc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Disable alerts
          </button>
        </div>
      )}

      {feedback ? (
        <p className="mt-3 text-sm font-medium text-[#2f6b4d]">{feedback}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-[#a14431]">{error}</p> : null}
    </section>
  );
}
