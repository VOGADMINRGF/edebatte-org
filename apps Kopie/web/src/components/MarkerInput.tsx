"use client";
import * as React from "react";

/** Textarea mit Overlay-Highlight (fertige Zeichen werden „markiert“) */
export function MarkerInput({
  value, onChange, processedLen = 0, className,
}: {
  value: string;
  onChange: (v: string) => void;
  processedLen?: number;
  className?: string;
}) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-Resize
  const fit = React.useCallback(() => {
    const el = taRef.current; if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(192, el.scrollHeight)}px`;
  }, []);
  React.useEffect(() => { fit(); }, [value, fit]);

  const done = value.slice(0, processedLen);
  const pending = value.slice(processedLen);

  return (
    <div className={`hl-wrap ${className ?? ""}`}>
      <div className="hl-bg" aria-hidden>
        <span className="done">{done}</span>
        <span className="pending">{pending}</span>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hl-ta"
        placeholder="Beschreibe dein Anliegen …"
        spellCheck
      />
    </div>
  );
}
