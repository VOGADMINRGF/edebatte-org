"use client";

import * as React from "react";

type VoteValue = "pro" | "neutral" | "contra" | null;

type Props = {
  value: VoteValue;
  onChange: (next: VoteValue) => void;
  size?: "sm" | "md";
  showToast?: boolean;
};

const VOTE_CONFIG = [
  {
    id: "pro" as const,
    label: "Zustimmen",
    icon: "👍",
    activeClass: "border-turquoise-500 bg-turquoise-50 text-turquoise-700",
  },
  {
    id: "neutral" as const,
    label: "Neutral",
    icon: "😐",
    activeClass: "border-violet-500 bg-violet-50 text-violet-700",
  },
  {
    id: "contra" as const,
    label: "Ablehnen",
    icon: "👎",
    activeClass: "border-coral-500 bg-coral-50 text-coral-700",
  },
];

export default function VogVoteButtons({ value, onChange, size = "md", showToast = true }: Props) {
  const [toastValue, setToastValue] = React.useState<Exclude<VoteValue, null>>("pro");
  const [showToastState, setShowToastState] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const triggerToast = (next: Exclude<VoteValue, null>) => {
    if (!showToast) return;
    setToastValue(next);
    setShowToastState(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setShowToastState(false), 800);
  };

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-[11px]"
      : "px-4 py-2 text-sm";
  const iconClasses = size === "sm" ? "text-base" : "text-lg";

  return (
    <div role="radiogroup" aria-label="Abstimmen" className="flex flex-wrap items-center gap-2">
      {VOTE_CONFIG.map((opt) => {
        const active = value === opt.id;
        return (
          <div key={opt.id} className="relative">
            {showToastState && toastValue === opt.id && (
              <span
                aria-live="polite"
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-lg drop-shadow"
              >
                {opt.icon}
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                const next = active ? null : opt.id;
                onChange(next);
                triggerToast(opt.id);
              }}
              className={[
                "flex items-center gap-2 rounded-full border font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200",
                sizeClasses,
                active ? `${opt.activeClass} shadow-sm` : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className={iconClasses}>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
