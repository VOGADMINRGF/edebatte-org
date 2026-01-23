"use client";
import { useEffect, useMemo, useState } from "react";
export function useAnalyzeOverlay(text: string, totalSteps: number) {
  const sentences = useMemo(() => text.split(/(?<=[.!?])\s+/).filter(Boolean), [text]);
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveIdx(i => (i+1) % Math.max(1, sentences.length)), 900);
    return () => clearInterval(id);
  }, [sentences.length]);
  return { activeIdx };
}
