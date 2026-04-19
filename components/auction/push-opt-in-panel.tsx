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
    <section className="rounded-[2rem] border border-[#d9ddf6] bg-[rgba(243,245,255,0.9)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#6a5f9f]">
            Push notifications
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d1737]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#4a426d]">{description}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${
            isSubscribed
              ? "bg-[#1f7f55] text-white"
              : "bg-[#e8dcf8] text-[#6a4d97]"
          }`}
        >
          {isSubscribed ? "On" : "Off"}
        </span>
      </div>

      {!mounted ? (
        <p className="mt-4 text-sm font-medium text-[#7c5277]">
          Checking push notification support…
        </p>
      ) : !isSupported ? (
        <p className="mt-4 text-sm font-medium text-[#7c5277]">
          This browser does not expose Service Worker Push APIs.
        </p>
      ) : !availabilityLoaded ? (
        <p className="mt-4 text-sm font-medium text-[#7c5277]">
          Loading push settings…
        </p>
      ) : !isAvailable ? (
        <p className="mt-4 text-sm font-medium text-[#7c5277]">
          Push is not configured on this deployment yet. The rest of the auction
          flow still works normally.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void enablePush()}
            disabled={isPending || isSubscribed}
            className="inline-flex items-center justify-center rounded-full bg-[#5a4ea6] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#b2abd9]"
          >
            Enable alerts
          </button>
          <button
            type="button"
            onClick={() => void disablePush()}
            disabled={isPending || !isSubscribed}
            className="inline-flex items-center justify-center rounded-full border border-[#c4bddc] px-4 py-2 text-sm font-semibold text-[#554d78] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Disable alerts
          </button>
        </div>
      )}

      {feedback ? (
        <p className="mt-3 text-sm font-medium text-[#1e6b4a]">{feedback}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-[#b4441b]">{error}</p> : null}
    </section>
  );
}
