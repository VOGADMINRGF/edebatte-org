"use client";
import React from "react";
import { colors } from "../theme";

interface BadgeProps {
  text: string;
  color?: string; // optional, für spezielle Anwendungsfälle
  className?: string;
}
const BADGE_COLORS: Record<string, string> = {
  live: colors.coral,
  replay: colors.indigo,
  geplant: "#008B8B",
  default: "#9CA3AF"
};
export default function Badge({ text, color, className = "" }: BadgeProps) {
  const bg = color || BADGE_COLORS[text?.toLowerCase()] || BADGE_COLORS.default;
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold shadow inline-block select-none ${className}`}
      style={{ backgroundColor: bg, color: "#fff" }}
    >
      {text}
    </span>
  );
}
