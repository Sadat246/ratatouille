"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function InstallCard() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    );
  });
  const [isIos] = useState(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return isIosDevice(navigator.userAgent);
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const syncInstalled = () =>
      setInstalled(
        mediaQuery.matches ||
          (window.navigator as Navigator & { standalone?: boolean })
            .standalone === true,
      );

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    mediaQuery.addEventListener("change", syncInstalled);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      mediaQuery.removeEventListener("change", syncInstalled);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const outcome = await promptEvent.userChoice;
    if (outcome.outcome === "accepted") {
      setInstalled(true);
    }
    setPromptEvent(null);
  }

  let body = (
    <p className="text-sm leading-7 text-[#5d4738]">
      Installability is wired for HTTPS deployment. Once this shell is served
      live, browsers with native support can promote the app directly from the
      address bar menu.
    </p>
  );

  if (installed) {
    body = (
      <p className="text-sm leading-7 text-[#355745]">
        This app is already running in standalone mode. The shell is ready to
        behave like a saved home-screen experience.
      </p>
    );
  } else if (promptEvent) {
    body = (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[#5d4738]">
          Your browser exposed a native install prompt. Trigger it here to check
          the install name and icon without leaving the page.
        </p>
        <button
          type="button"
          onClick={() => {
            void handleInstall();
          }}
          className="inline-flex items-center justify-center rounded-full bg-[#244f3f] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1b3d30]"
        >
          Install app
        </button>
      </div>
    );
  } else if (isIos) {
    body = (
      <p className="text-sm leading-7 text-[#5d4738]">
        On iPhone, open the share sheet in Safari and choose Add to Home Screen
        to test the standalone icon and app name.
      </p>
    );
  }

  return (
    <section className="rounded-[2.2rem] border border-[#d8e7db] bg-[rgba(238,246,240,0.86)] p-5 shadow-[0_24px_80px_rgba(43,69,56,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#4e715f]">
            Install baseline
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#173026]">
            PWA-ready without risky offline magic.
          </h2>
        </div>
        <span className="rounded-full bg-[#244f3f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#eff8f4]">
          Safe updates
        </span>
      </div>
      <div className="mt-4">{body}</div>
    </section>
  );
}
