import { useEffect, useRef, useCallback } from "react";

export default function useWakeLock(active: boolean) {
  const sentinel = useRef<any>(null);

  const request = useCallback(async () => {
    try {
      const navAny = navigator as any;
      if (navAny.wakeLock?.request) {
        sentinel.current = await navAny.wakeLock.request("screen");
        sentinel.current?.addEventListener?.("release", () => {
          if (active) request(); // re-acquire efter tab/fokus
        });
      }
    } catch { /* no-op */ }
  }, [active]);

  useEffect(() => {
    if (!active) {
      sentinel.current?.release?.();
      sentinel.current = null;
      return;
    }
    request();
    const onVis = () => {
      if (document.visibilityState === "visible" && active) request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      sentinel.current?.release?.();
      sentinel.current = null;
    };
  }, [active, request]);
}
