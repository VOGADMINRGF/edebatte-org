"use client";
import React from "react";
import ContextExplorer from "@features/context/ContextExplorer";

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Kontext</h1>
      <ContextExplorer roots={[]} />
    </main>
  );
}
