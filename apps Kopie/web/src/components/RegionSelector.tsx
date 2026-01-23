// apps/web/src/components/RegionSelector.tsx
"use client";

import { useState } from "react";
import { useEffectiveRegion } from "@/hooks/useEffectiveRegion";

type RegionOption = { code: string; label: string };

export default function RegionSelector({
  options,
}: {
  options: RegionOption[];
}) {
  const { data, setRegion, loading } = useEffectiveRegion();
  const [busy, setBusy] = useState(false);

  async function apply(code: string) {
    try {
      setBusy(true);
      await setRegion(code, { persist: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        Region: <strong>{data?.region?.name ?? "—"}</strong>{" "}
        <span className="text-xs text-gray-400">({data?.source ?? "—"})</span>
      </span>
      <select
        className="border rounded px-2 py-1"
        defaultValue={data?.region?.code ?? ""}
        onChange={(e) => apply(e.target.value)}
        disabled={loading || busy}
      >
        <option value="" disabled>
          Region wählen…
        </option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
