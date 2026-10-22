"use client";

import { useEffect } from "react";

/** Registers /sw.js (web push + offline page). No-op where unsupported. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
