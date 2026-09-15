"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";

type QuestionDraft = {
  title: string;
  description?: string | null;
};

type SummaryResponse = {
  ok: boolean;
  set?: { code: string; title?: string | null; status?: string };
  totalVotes?: number;
  questions?: Array<{
    id: string;
    title: string;
    description?: string | null;
    totalVotes: number;
    options: Array<{ label: string; count: number }>;
  }>;
  error?: string;
};

const OPTION_PRESETS = [
  {
    id: "trend",
    label: "Tendenz (Pro/Neutral/Contra)",
    options: ["Pro", "Neutral", "Contra"],
  },
  {
    id: "yn",
    label: "Ja / Nein / Enthaltung",
    options: ["Ja", "Nein", "Enthaltung"],
  },
  {
    id: "nps",
    label: "NPS 0–10",
    options: Array.from({ length: 11 }, (_, idx) => String(idx)),
  },
];

function parseLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\\d.\\s]+/, "").trim())
    .filter(Boolean);
}

export default function AdminMediaPage() {
  const [title, setTitle] = useState("");
  const [scriptInput, setScriptInput] = useState("");
  const [questionsInput, setQuestionsInput] = useState("");
  const [presetId, setPresetId] = useState(OPTION_PRESETS[0].id);
  const [customOptions, setCustomOptions] = useState("");
  const [publicAttribution, setPublicAttribution] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [reviewRequiredCode, setReviewRequiredCode] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const [summaryCode, setSummaryCode] = useState("");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const options = useMemo(() => {
    if (customOptions.trim()) {
      return customOptions
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean);
    }
    return OPTION_PRESETS.find((preset) => preset.id === presetId)?.options ?? OPTION_PRESETS[0].options;
  }, [customOptions, presetId]);

  const draftQuestions = useMemo(() => {
    const lines = parseLines(questionsInput);
    return lines.slice(0, 10).map((line) => ({ title: line })) as QuestionDraft[];
  }, [questionsInput]);

  const canCreate = draftQuestions.length > 0 && options.length >= 2;

  useEffect(() => {
    async function renderQr() {
      if (!createdCode || !origin) {
        setQrImage(null);
        return;
      }
      try {
        const target = `${origin}/qr/${createdCode}`;
        const dataUrl = await QRCode.toDataURL(target, { width: 220, margin: 1 });
        setQrImage(dataUrl);
      } catch {
        setQrImage(null);
      }
    }
    void renderQr();
  }, [createdCode, origin]);

  const handleAdoptScript = () => {
    const lines = parseLines(scriptInput);
    if (!lines.length) return;
    setQuestionsInput(lines.join("\n"));
  };

  const handleCreate = async () => {
    if (!canCreate) {
      setCreateError("Bitte mindestens eine Frage und zwei Optionen angeben.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreatedCode(null);
    setReviewRequiredCode(null);
    try {
      const res = await fetch("/api/qr/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          questions: draftQuestions.map((q) => ({
            title: q.title,
            description: q.description ?? undefined,
            options,
            publicAttribution: publicAttribution ? "public" : "hidden",
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "create_failed");
      }
      const code = String(body.code ?? "");
      if (body.status === "review_required") {
        setReviewRequiredCode(code);
      } else {
        setCreatedCode(code);
        setSummaryCode(code);
      }
      setSummary(null);
      setQuestionsInput("");
      setScriptInput("");
      setCustomOptions("");
      setTitle("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "create_failed");
    } finally {
      setCreating(false);
    }
  };

  const loadSummary = useCallback(
    async (code?: string) => {
      const target = (code ?? summaryCode).trim();
      if (!target) return;
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await fetch(`/api/admin/qr/sets/summary?code=${encodeURIComponent(target)}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as SummaryResponse | null;
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error || "summary_failed");
        }
        setSummary(body);
      } catch (err: unknown) {
        setSummaryError(err instanceof Error ? err.message : "summary_failed");
        setSummary(null);
      } finally {
        setSummaryLoading(false);
      }
    },
    [summaryCode],
  );

  useEffect(() => {
    if (createdCode) {
      void loadSummary(createdCode);
    }
  }, [createdCode, loadSummary]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Admin · Media &amp; TV</p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">QR Studio &amp; Live-Trends</h1>
        <p className="text-sm text-[rgb(var(--muted))]">
          Erstelle QR-Fragen-Sets für Veranstaltungen, TV-Formate oder Leserbrief-Aktionen.
          Pro Frage ein QR – oder ein geschlossenes Set mit allen Fragen in einer Sitzung.
        </p>
      </header>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">QR-Set erstellen</h2>
            <p className="text-sm text-[rgb(var(--muted))]">
              Erstellt eine Sitzung mit bis zu 10 Fragen. Jede Zeile wird eine Frage.
            </p>
          </div>
          {createdCode && (
            <div className="text-sm text-[rgb(var(--muted))]">
              <span className="font-semibold">Aktiver Code:</span>{" "}
              <span className="rounded-full bg-[rgb(var(--bg))] px-3 py-1 font-semibold text-[rgb(var(--fg))]">
                {createdCode}
              </span>
            </div>
          )}
          {reviewRequiredCode && (
            <div className="text-sm text-amber-800">
              <span className="font-semibold">Review erforderlich:</span>{" "}
              {reviewRequiredCode}
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
              Titel (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. TV-Talkrunde: Wohnpolitik"
                className="rounded-2xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
              Agenda / Script (jede Zeile eine Frage)
              <textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                rows={4}
                placeholder="- Soll die Stadt mehr Radwege bauen?\n- Wie bewerten Sie den Vorschlag?"
                className="rounded-2xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              className="w-fit rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]"
              onClick={handleAdoptScript}
            >
              Aus Script übernehmen
            </button>

            <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
              Fragenliste (max. 10, je Zeile eine Frage)
              <textarea
                value={questionsInput}
                onChange={(e) => setQuestionsInput(e.target.value)}
                rows={6}
                placeholder="Frage 1\nFrage 2\nFrage 3"
                className="rounded-2xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-[rgb(var(--muted))]">{draftQuestions.length} von 10 Fragen vorbereitet.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 space-y-3">
              <p className="text-sm font-semibold text-[rgb(var(--fg))]">Antwort-Optionen</p>
              <label className="grid gap-1 text-sm text-[rgb(var(--muted))]">
                Preset
                <select
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
                >
                  {OPTION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-[rgb(var(--muted))]">
                Eigene Optionen (Komma-getrennt, optional)
                <input
                  value={customOptions}
                  onChange={(e) => setCustomOptions(e.target.value)}
                  placeholder="Ja, Nein, Enthaltung"
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
                />
              </label>
              <p className="text-xs text-[rgb(var(--muted))]">Aktive Optionen: {options.join(", ")}</p>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={publicAttribution}
                onChange={(e) => setPublicAttribution(e.target.checked)}
              />
              Nur verifizierte Teilnehmende (nicht anonym)
            </label>

            {createError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {createError}
              </div>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !canCreate}
              className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? "QR-Set wird erstellt…" : "QR-Set erstellen"}
            </button>

            {createdCode && (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm text-[rgb(var(--muted))] space-y-3">
                <p className="font-semibold text-[rgb(var(--fg))]">QR-Link bereit</p>
                <p>
                  Link:{" "}
                  <Link href={`/qr/${createdCode}`} className="font-semibold text-sky-600 underline">
                    /qr/{createdCode}
                  </Link>
                </p>
                {qrImage && (
                  <img src={qrImage} alt="QR Code" className="h-28 w-28 rounded-xl border border-[rgb(var(--border))]" />
                )}
              </div>
            )}
            {reviewRequiredCode && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Noch kein öffentlicher QR-Link</p>
                <p className="mt-1">
                  Das Set {reviewRequiredCode} ist reviewpflichtig gespeichert.
                  Erst unabhängige Akteursprüfung und separate Aktivierung
                  machen den Link öffentlich nutzbar.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Live-Auswertung</h2>
            <p className="text-sm text-[rgb(var(--muted))]">
              Trends in Echtzeit für TV, Events oder Leserbriefe. Code eingeben und aktualisieren.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadSummary()}
            className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]"
            disabled={summaryLoading}
          >
            {summaryLoading ? "Lädt…" : "Aktualisieren"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={summaryCode}
            onChange={(e) => setSummaryCode(e.target.value)}
            placeholder="QR Code (z.B. A1b2C3d4)"
            className="flex-1 rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => loadSummary()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Laden
          </button>
        </div>

        {summaryError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {summaryError}
          </div>
        )}

        {summary?.ok && summary.questions ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-sm text-[rgb(var(--muted))]">
              <p className="font-semibold text-[rgb(var(--fg))]">
                {summary.set?.title ?? "QR-Set"} · Gesamtstimmen: {summary.totalVotes ?? 0}
              </p>
            </div>
            {summary.questions.map((q) => (
              <div key={q.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-2">
                <div>
                  <p className="text-sm font-semibold text-[rgb(var(--fg))]">{q.title}</p>
                  {q.description && <p className="text-xs text-[rgb(var(--muted))]">{q.description}</p>}
                  <p className="text-xs text-[rgb(var(--muted))]">Stimmen: {q.totalVotes}</p>
                </div>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const pct = q.totalVotes > 0 ? Math.round((opt.count / q.totalVotes) * 100) : 0;
                    return (
                      <div key={opt.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                          <span>{opt.label}</span>
                          <span>
                            {opt.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[rgb(var(--bg))]">
                          <div
                            className="h-2 rounded-full bg-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--muted))]">Noch keine Auswertung geladen.</p>
        )}
      </section>
    </main>
  );
}
