import React from "react";
export type ContextNode = any;
export default function ContextExplorer(_: { roots?: ContextNode[] }) {
  return (
    <div data-shim="ContextExplorer" className="border rounded p-3">
      ContextExplorer (shim)
    </div>
  );
}
