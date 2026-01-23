"use client";

import * as React from "react";

type HighlightedTextareaProps = {
  value: string;
  onChange: (val: string) => void;
  analyzing: boolean;
  placeholder?: string;
  rows?: number;
  textareaClassName?: string;
  overlayClassName?: string;
};

const baseTextareaClass =
  "relative z-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300";

const baseOverlayClass =
  "pointer-events-none absolute inset-0 overflow-hidden rounded-lg px-3 py-2 text-sm leading-relaxed font-sans text-transparent marker-mask";

/**
 * Gemeinsamer Textmarker-Editor für /contributions/new & /statements/new
 * – gleiche Animation (Marker läuft blau von links nach rechts).
 */
export function HighlightedTextarea({
  value,
  onChange,
  analyzing,
  placeholder,
  rows = 12,
  textareaClassName,
  overlayClassName,
}: HighlightedTextareaProps) {
  const [markerPct, setMarkerPct] = React.useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const total = value.length;
    if (!analyzing || total === 0) {
      setMarkerPct(100);
      return;
    }

    setMarkerPct(0);
    const duration = Math.min(3000, Math.max(900, total * 5));
    const start = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setMarkerPct(progress * 100);
      if (progress < 1 && analyzing) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setMarkerPct(100);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [analyzing, value]);

  const handleScroll = () => {
    if (!textareaRef.current || !overlayRef.current) return;
    overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
  };

  const overlayCls = [baseOverlayClass, overlayClassName]
    .filter(Boolean)
    .join(" ");
  const textareaCls = [baseTextareaClass, textareaClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <div
        ref={overlayRef}
        aria-hidden="true"
        className={overlayCls}
        style={{ ["--marker-pct" as any]: `${markerPct}%` }}
      >
        {value || placeholder || " "}
      </div>

      <textarea
        ref={textareaRef}
        className={textareaCls}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
      />
    </div>
  );
}
