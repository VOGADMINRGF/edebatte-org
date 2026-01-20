"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPrefillUrl, createDraftAndNavigate } from "../common/utils/draftNavigation";

type Preview = {
  claims: string[];
  questions: string[];
  options: string[];
};

const STORAGE_KEY = "edb_assistant_draft";

export default function AssistantHeroCard() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setText(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // ignore
    }
  }, [text]);

  const disabled = loading || !text.trim();

  const handleQuickCheck = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), maxClaims: 3 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Analyse nicht verfügbar");
      }
      const claims = (data.result?.claims || []).slice(0, 2).map((c: any) => c.text).filter(Boolean);
      const questions = (data.result?.questions || [])
        .slice(0, 2)
        .map((q: any) => q.text)
        .filter(Boolean);
      const options = (data.result?.participationCandidates || data.result?.claims || [])
        .slice(0, 4)
        .map((c: any) => c.text)
        .filter(Boolean);
      setPreview({
        claims: claims.length ? claims : ["Wir haben dein Anliegen erfasst."],
        questions:
          questions.length > 0
            ? questions
            : ["Wer ist besonders betroffen oder profitiert?", "Wie messen wir Wirkung und Nebenwirkungen?"].slice(0, 2),
        options:
          options.length > 0
            ? options
            : ["Option A: Umsetzen", "Option B: Varianten prüfen", "Option C: Vertagen"].slice(0, 3),
      });
    } catch (err: any) {
      setError(err?.message || "Schnell-Check nicht möglich.");
    } finally {
      setLoading(false);
    }
  };

  const ctaHref = useMemo(() => `/contribute`, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white/90 shadow-[0_16px_60px_rgba(16,185,129,0.18)]">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Schnell-Check</p>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            eDebatte Assistent
          </span>
        </div>
        <textarea
          className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          rows={4}
          placeholder="Kurze Beschreibung deines Anliegens …"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleQuickCheck}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Analysiere …" : "Schnell-Check"}
          </button>
          <a
            href={ctaHref}
            onClick={(event) => {
              event.preventDefault();
              void createDraftAndNavigate({
                kind: "contribution",
                text,
                targetPath: "/contribute",
                fallbackPath: buildPrefillUrl("/contribute", text),
              });
            }}
            className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Im Messenger öffnen
          </a>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {preview && (
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-emerald-900">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Check</p>
              <ul className="mt-1 space-y-1">
                {preview.claims.map((c, idx) => (
                  <li key={idx}>
                    <a
                      href="/statements/new"
                      onClick={(event) => {
                        event.preventDefault();
                        void createDraftAndNavigate({
                          kind: "statement",
                          text: c,
                          targetPath: "/statements/new",
                          fallbackPath: buildPrefillUrl("/statements/new", c),
                        });
                      }}
                      className="block rounded-lg bg-white/80 px-2 py-1 hover:bg-white hover:underline"
                    >
                      {c}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Offene Fragen</p>
              <ul className="mt-1 space-y-1">
                {preview.questions.map((q, idx) => (
                  <li key={idx} className="rounded-lg bg-white/80 px-2 py-1">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Abstimm-Optionen</p>
              <ul className="mt-1 space-y-1">
                {preview.options.map((o, idx) => (
                  <li key={idx}>
                    <a
                      href="/statements/new"
                      onClick={(event) => {
                        event.preventDefault();
                        void createDraftAndNavigate({
                          kind: "statement",
                          text: o,
                          targetPath: "/statements/new",
                          fallbackPath: buildPrefillUrl("/statements/new", o),
                        });
                      }}
                      className="block rounded-lg bg-white/80 px-2 py-1 hover:bg-white hover:underline"
                    >
                      {o}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
