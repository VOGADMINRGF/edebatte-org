import React from "react";
import { STATE_CRESTS } from "./stateCrests";

type StateCrestBadgeProps = {
  regionCode?: string | null;
  size?: number;
  className?: string;
};

export function StateCrestBadge({ regionCode, size = 18, className = "" }: StateCrestBadgeProps) {
  if (!regionCode) return null;
  const crest = STATE_CRESTS[regionCode.toUpperCase()];
  if (!crest) return null;

  const classes = ["inline-block rounded-sm", className].filter(Boolean).join(" ");

  return (
    <img
      src={crest.file}
      width={size}
      height={size}
      alt={`${crest.name} Wappen`}
      className={classes}
      style={{ width: size, height: size }}
      decoding="async"
      loading="lazy"
    />
  );
}
