"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps "saying hi" counts live: refreshes when the tab comes back and every minute while visible. */
export function LiveRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      // Don't disturb someone mid-way through typing (e.g. their first name).
      const typing = document.activeElement?.matches("input, textarea, select");
      if (document.visibilityState === "visible" && !typing) router.refresh();
    };
    const timer = setInterval(refresh, everyMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, everyMs]);
  return null;
}
