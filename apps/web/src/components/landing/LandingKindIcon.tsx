import React from "react";

type LandingKindIconProps = {
  kind: "vote" | "topic";
  className?: string;
};

export function LandingKindIcon({ kind, className }: LandingKindIconProps) {
  if (kind === "vote") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className={className ?? "h-4 w-4"}>
        <path
          d="M9.2 11.2l2 2 3.7-4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 3.8h11a2 2 0 0 1 2 2v12.4a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M7.2 16.6h5.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className ?? "h-4 w-4"}>
      <path
        d="M6.5 6.2h11a3 3 0 0 1 3 3v4.2a3 3 0 0 1-3 3H12l-3.6 2.4v-2.4H6.5a3 3 0 0 1-3-3V9.2a3 3 0 0 1 3-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 11.2h.01M12 11.2h.01M15.8 11.2h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
