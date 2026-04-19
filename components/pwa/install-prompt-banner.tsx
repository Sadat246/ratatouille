"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function InstallPromptBanner() {
  const [show, setShow] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const isIos =
    typeof navigator !== "undefined" && isIosDevice(navigator.userAgent);

  useEffect(() => {
    // Dismiss guard
    if (sessionStorage.getItem("pwa-install-dismissed")) return;
    // Already installed guard
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
      return;

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setShow(false);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    void Promise.resolve().then(() => {
      setShow(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  // Animate in after show becomes true
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [show]);

  const dismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
    setTimeout(() => setShow(false), 200);
  };

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const outcome = await promptEvent.userChoice;
    if (outcome.outcome === "accepted") setShow(false);
    setPromptEvent(null);
  }

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-[72px] left-4 right-4 z-20 transition-transform duration-200 sm:left-auto sm:max-w-sm lg:bottom-8 lg:left-8 lg:right-auto ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="rounded-[1.6rem] border border-[#d8e7db] bg-[rgba(238,246,240,0.96)] p-4 shadow-[0_16px_60px_rgba(43,69,56,0.14)] backdrop-blur-sm lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-6 text-[#234d3d]">
            {isIos
              ? "Open in Safari, tap Share, then Add to Home Screen."
              : "Save Ratatouille to your home screen for instant deal access."}
          </p>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            onClick={dismiss}
            className="flex-shrink-0 rounded-full p-1 text-[#3d7a5e] hover:bg-[#d0e8d8]"
          >
            ×
          </button>
        </div>
        {!isIos && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="mt-3 rounded-full bg-[#234d3d] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add to Home Screen
          </button>
        )}
      </div>
    </div>
  );
}
