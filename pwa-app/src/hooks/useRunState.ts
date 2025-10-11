// src/hooks/useRunState.ts
import { useCallback, useEffect, useState } from "react";

export function useRunState(storageKey: string) {
  const [cursorIndex, setCursorIndex] = useState(0);
  const [shownPoiId, setShownPoiId] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set());

  // load
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.cursorIndex === "number") setCursorIndex(s.cursorIndex);
      if (Array.isArray(s.visited)) setVisited(new Set<number>(s.visited));
      if (s.shownPoiId == null || typeof s.shownPoiId === "number") setShownPoiId(s.shownPoiId ?? null);
    } catch {}
  }, [storageKey]);

  // save
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        cursorIndex,
        visited: [...visited],
        shownPoiId: shownPoiId ?? null,
        v: 1
      }));
    } catch {}
  }, [storageKey, cursorIndex, visited, shownPoiId]);

  const markVisited = useCallback((id: number) => {
    setVisited(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const reset = useCallback(() => {
    setCursorIndex(0);
    setShownPoiId(null);
    setVisited(new Set());
  }, []);

  return {
    cursorIndex, setCursorIndex,
    shownPoiId, setShownPoiId,
    visited, setVisited, markVisited,
    reset
  };
}
