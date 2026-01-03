"use client";

import * as React from "react";
import { UI_LANGS, type LanguageCode } from "@features/i18n/languages";

export default function ContentLanguageSelect({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (v: LanguageCode) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-600">
      <span className="font-semibold uppercase tracking-wide text-slate-500">Language</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
      >
        {UI_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
