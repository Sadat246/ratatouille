"use client";

import { useEffect } from "react";

export function PwaBoot() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      return undefined;
    });
  }, []);

  return null;
}
