"use client";
import React from "react";

export type StreamFiltersProps = {
  filters?: any[];
  active?: any;
  onToggle?: (...a: any[]) => void;
};

export default function StreamFilters(_props: StreamFiltersProps) {
  return (
    <div data-shim="StreamFilters" className="border rounded p-2 text-xs">
      StreamFilters (shim)
    </div>
  );
}
