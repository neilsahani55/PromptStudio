"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

export function useFeedbackNotifications(endpoint: string, enabled: boolean = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.count === "number") setCount(data.count);
    } catch {
      // swallow — notification polling is best-effort
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, enabled]);

  return { count, refresh, setCount };
}
