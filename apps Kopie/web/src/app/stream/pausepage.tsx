"use client";
import React from "react";
import StreamFilters from "@features/stream/components/StreamFilters";

export default function PausePage() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Stream Pause</h1>
      <StreamFilters filters={[]} active={[]} onToggle={() => {}} />
    </main>
  );
}
