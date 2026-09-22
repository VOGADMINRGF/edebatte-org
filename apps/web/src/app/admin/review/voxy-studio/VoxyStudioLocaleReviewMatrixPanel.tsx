"use client";

import { useCallback, useEffect, useState } from "react";
import { getLocaleConfig } from "@/config/locales";

type FormatSafety = "not_prepared" | "ready" | "warning" | "blocked";

type LocaleEntry = {
  locale: string;
  direction: "ltr" | "rtl";
  draftId: string | null;
  draftRevision: number | null;
  storyPlanRevision: number | null;
  draftStatus: string;
  exactLocaleApprovalPresent: boolean;
  translationStatus: string;
  voiceStatus: string;
  voiceProfileId: string | null;
  fallbackLocale: null;
  captionStatus: string;
  formatSafety: Record<"16:9" | "9:16" | "1:1", FormatSafety>;
  rtlReviewRequired: boolean;
  rtlReviewSatisfiedByExplicitLocaleApproval: boolean;
};

type LocaleMatrix = {
  briefingId: string;
  title: string;
  originalLanguage: string;
  locales: LocaleEntry[];
  preparedLocales: number;
  approvedLocales: number;
  totalLocales: number;
};

type ResponsePayload = {
  ok: boolean;
  localeReviewMatrices: LocaleMatrix[];
  persistence: {
    audioInputs?: { mode: string; productionTruth: boolean };
  };
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

function safetyClass(value: FormatSafety) {
  if (value === "blocked") return "text-rose-700 dark:text-rose-300";
  if (value === "warning") return "text-amber-700 dark:text-amber-300";
  if (value === "ready") return "text-emerald-700 dark:text-emerald-300";
  return "text-[rgb(var(--muted))]";
}

export default function VoxyStudioLocaleReviewMatrixPanel() {
  const [matrices, setMatrices] = useState<LocaleMatrix[]>([]);
  const [audioPersistence, setAudioPersistence] = useState("wird geladen");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=100", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ResponsePayload | null;
      if (!response.ok || !payload?.ok) throw new Error("voxy_locale_matrix_not_loaded");
      setMatrices(payload.localeReviewMatrices ?? []);
      setAudioPersistence(payload.persistence.audioInputs?.mode ?? "unbekannt");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_locale_matrix_not_loaded");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
            Voxy · Locale Review Matrix
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Öffentliche Sprach-SSOT je Master-Briefing
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Jede Locale bleibt eine eigene revisionsgebundene Review-Einheit. Fehlende Übersetzung,
            Voice oder Caption bleibt sichtbar offen; es gibt keinen stillen Sprach- oder Voice-Fallback.
            Die drei Formatspalten zeigen die bestehende Safe-Area-/Overflow-Prüfung, nicht einen erfundenen Renderstatus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs text-[rgb(var(--muted))]">
            Audio: {audioPersistence}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
          >
            Matrix aktualisieren
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {matrices.length === 0 ? (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Noch kein Master-Briefing mit Studio-Draft vorhanden.
        </p>
      ) : null}

      {matrices.map((matrix) => (
        <article key={matrix.briefingId} className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[rgb(var(--fg))]">{matrix.title}</p>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                {matrix.briefingId} · Original {matrix.originalLanguage}
              </p>
            </div>
            <p className="text-xs font-semibold text-[rgb(var(--muted))]">
              vorbereitet {matrix.preparedLocales}/{matrix.totalLocales} · exakt freigegeben {matrix.approvedLocales}/{matrix.totalLocales}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
            <table className="min-w-[1120px] w-full border-collapse text-left text-xs">
              <thead className="bg-[rgb(var(--card))] text-[rgb(var(--muted))]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Locale</th>
                  <th className="px-3 py-2 font-semibold">Draft / Review</th>
                  <th className="px-3 py-2 font-semibold">Übersetzung</th>
                  <th className="px-3 py-2 font-semibold">Voice</th>
                  <th className="px-3 py-2 font-semibold">Captions</th>
                  <th className="px-3 py-2 font-semibold">16:9</th>
                  <th className="px-3 py-2 font-semibold">9:16</th>
                  <th className="px-3 py-2 font-semibold">1:1</th>
                  <th className="px-3 py-2 font-semibold">RTL</th>
                </tr>
              </thead>
              <tbody>
                {matrix.locales.map((entry) => {
                  const cfg = getLocaleConfig(entry.locale as Parameters<typeof getLocaleConfig>[0]);
                  return (
                    <tr key={entry.locale} className="border-t border-[rgb(var(--border))] align-top">
                      <td className="px-3 py-3 font-semibold text-[rgb(var(--fg))]">
                        {cfg.flagEmoji} {cfg.label} <span className="text-[rgb(var(--muted))]">({entry.locale})</span>
                      </td>
                      <td className="px-3 py-3 text-[rgb(var(--muted))]">
                        <p className={entry.exactLocaleApprovalPresent ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""}>
                          {label(entry.draftStatus)}
                        </p>
                        {entry.draftId ? (
                          <p className="mt-1">r{entry.draftRevision} · story r{entry.storyPlanRevision}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-[rgb(var(--muted))]">{label(entry.translationStatus)}</td>
                      <td className="px-3 py-3 text-[rgb(var(--muted))]">
                        <p className={entry.voiceStatus === "voice_available" ? "text-emerald-700 dark:text-emerald-300" : entry.voiceStatus === "voice_unavailable" ? "text-amber-700 dark:text-amber-300" : ""}>
                          {label(entry.voiceStatus)}
                        </p>
                        {entry.voiceProfileId ? <p className="mt-1 break-all">{entry.voiceProfileId}</p> : null}
                        <p className="mt-1">Fallback: keiner</p>
                      </td>
                      <td className="px-3 py-3 text-[rgb(var(--muted))]">{label(entry.captionStatus)}</td>
                      {(["16:9", "9:16", "1:1"] as const).map((format) => (
                        <td key={format} className={`px-3 py-3 font-semibold ${safetyClass(entry.formatSafety[format])}`}>
                          {label(entry.formatSafety[format])}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-[rgb(var(--muted))]">
                        {entry.rtlReviewRequired ? (
                          <span className={entry.rtlReviewSatisfiedByExplicitLocaleApproval ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-amber-700 dark:text-amber-300"}>
                            {entry.rtlReviewSatisfiedByExplicitLocaleApproval ? "exakte Locale-Freigabe vorhanden" : "explizites Review erforderlich"}
                          </span>
                        ) : (
                          "nicht zutreffend"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </section>
  );
}