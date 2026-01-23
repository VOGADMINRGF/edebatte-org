// apps/web/src/ui/InlineClarify.tsx
"use client";
import { useState } from "react";

type MissingKey = "zeitraum" | "zuständigkeit" | "ort";

type Props = {
  missing: MissingKey | null;
  onResolve?: (k: MissingKey, val: any) => void;
  // Legacy alias (V1):
  onSubmit?: (k: MissingKey, val: any) => void;
};

const LEVELS = ["EU", "Bund", "Land", "Kommune", "Unklar"] as const;

function InlineClarifyImpl({ missing, onResolve, onSubmit }: Props) {
  const cb = onResolve ?? onSubmit ?? (() => {});
  const [val, setVal] = useState("");

  if (!missing) return null;

  const label =
    missing === "zeitraum"
      ? "Zeitraum wählen (z. B. 2020–2024)"
      : missing === "zuständigkeit"
      ? "Ebene wählen"
      : "Ort";

  return (
    <div className="rounded-xl border p-3 text-sm">
      <div className="mb-2 font-medium">Uns fehlt: {label}</div>

      {missing === "zuständigkeit" ? (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              className="rounded-lg border px-2 py-1 hover:bg-muted"
              onClick={() => cb("zuständigkeit", l)}
            >
              {l}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="w-full rounded-lg border px-2 py-1"
          placeholder={label}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") cb(missing, val.trim() || "Sonstiges");
          }}
        />
      )}

      <button
        type="button"
        className="mt-2 text-xs underline"
        onClick={() => cb(missing, "Sonstiges")}
      >
        Sonstiges
      </button>
    </div>
  );
}

const InlineClarify = InlineClarifyImpl;
export { InlineClarify };     // named export (V2-Style)
export default InlineClarify; // default export (V1-Style)
