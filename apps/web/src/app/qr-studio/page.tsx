"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  QR_STUDIO_CALLER_INVENTORY,
  getQrStudioCallerLabel,
  resolveQrStudioTarget,
} from "@features/qr";

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

const MAX_QUESTIONS = 5;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

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
    id: "scale",
    label: "Zustimmungsskala (1-5)",
    options: ["1", "2", "3", "4", "5"],
  },
  {
    id: "impact",
    label: "Auswirkung (niedrig/mittel/hoch)",
    options: ["Niedrig", "Mittel", "Hoch"],
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

function extractCandidates(text: string) {
  const lines = parseLines(text);
  if (lines.length) return lines;
  return text
    .split(/[.!?]\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildOptionList(input: string) {
  const raw = input
    .split(/[,\n]/)
    .map((opt) => opt.trim())
    .filter(Boolean);
  return raw;
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export default function QrStudioPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"manual" | "research">("manual");
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [questionsInput, setQuestionsInput] = useState("");
  const [presetId, setPresetId] = useState(OPTION_PRESETS[0].id);
  const [customOptions, setCustomOptions] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [targetQrImage, setTargetQrImage] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [targetBase, setTargetBase] = useState("");

  const [summaryCode, setSummaryCode] = useState("");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setTargetBase(window.location.origin);
    }
  }, []);

  const options = useMemo(() => {
    if (customOptions.trim()) {
      return buildOptionList(customOptions);
    }
    return OPTION_PRESETS.find((preset) => preset.id === presetId)?.options ?? OPTION_PRESETS[0].options;
  }, [customOptions, presetId]);

  const optionError =
    options.length < MIN_OPTIONS
      ? "Mindestens 2 Optionen erforderlich."
      : options.length > MAX_OPTIONS
        ? "Maximal 5 Optionen in der freien Variante."
        : null;

  const draftQuestions = useMemo(() => {
    const lines = parseLines(questionsInput);
    return lines.slice(0, MAX_QUESTIONS).map((line) => ({ title: line }));
  }, [questionsInput]);

  const canCreate = mode === "manual" && draftQuestions.length > 0 && !optionError;

  const { effectiveBase, targetError } = useMemo(() => {
    const raw = targetBase.trim() || origin;
    if (!raw) return { effectiveBase: "", targetError: null };
    try {
      const url = new URL(raw);
      return { effectiveBase: url.origin, targetError: null };
    } catch {
      return {
        effectiveBase: "",
        targetError: "Bitte eine gueltige URL inkl. https:// eingeben.",
      };
    }
  }, [origin, targetBase]);

  const studioTarget = useMemo(
    () =>
      resolveQrStudioTarget({
        target: searchParams.get("target"),
        caller: searchParams.get("caller"),
        publicOrigin: origin || undefined,
      }),
    [origin, searchParams],
  );

  const studioTargetBlocked =
    studioTarget.status === "blocked" ||
    (studioTarget.status === "empty" && searchParams.get("targetState") === "blocked");

  const studioCallerLabel = getQrStudioCallerLabel(searchParams.get("caller"));
  const studioCallerInventory = Object.values(QR_STUDIO_CALLER_INVENTORY).join(" · ");

  useEffect(() => {
    async function renderQr() {
      if (!createdCode || !effectiveBase) {
        setQrImage(null);
        return;
      }
      try {
        const target = `${effectiveBase}/qr/${createdCode}`;
        const dataUrl = await QRCode.toDataURL(target, { width: 240, margin: 1 });
        setQrImage(dataUrl);
      } catch {
        setQrImage(null);
      }
    }
    void renderQr();
  }, [createdCode, effectiveBase]);

  useEffect(() => {
    async function renderTargetQr() {
      if (studioTarget.status !== "ready") {
        setTargetQrImage(null);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(studioTarget.absoluteHref, {
          width: 240,
          margin: 1,
        });
        setTargetQrImage(dataUrl);
      } catch {
        setTargetQrImage(null);
      }
    }

    void renderTargetQr();
  }, [studioTarget]);

  const adoptFromSource = () => {
    const candidates = extractCandidates(sourceText).slice(0, MAX_QUESTIONS);
    if (!candidates.length) return;
    const normalized = candidates.map((item) => (item.endsWith("?") ? item : `${item}?`));
    setQuestionsInput(normalized.join("\n"));
  };

  const handleCreate = async () => {
    if (mode !== "manual") {
      setCreateError("Recherche-Schub ist nur im ProPilot verfügbar.");
      return;
    }
    if (!canCreate) {
      setCreateError(optionError ?? "Bitte mindestens eine Frage anlegen.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCreatedCode(null);
    try {
      const res = await fetch("/api/qr/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          questions: draftQuestions.map((q) => ({
            title: q.title,
            options,
            publicAttribution: "hidden",
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "create_failed");
      }
      const code = String(body.code ?? "");
      setCreatedCode(code);
      setSummaryCode(code);
      setSummary(null);
      setQuestionsInput("");
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
        const res = await fetch(`/api/qr/sets/summary?code=${encodeURIComponent(target)}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as SummaryResponse | null;
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error || "summary_failed");
        }
        setSummary({
          ...body,
          questions: toArray(body.questions).map((question) => ({
            ...question,
            options: toArray(question.options),
          })),
        });
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

  const summaryQuestions = toArray(summary?.questions);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[rgb(var(--bg))] pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute left-0 top-1/3 h-80 w-80 rounded-full bg-emerald-100/45 blur-3xl" />
      </div>

      <section className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 lg:py-16">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">QR Studio</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[rgb(var(--fg))]">
            QR-Fragen in 3 Minuten starten
          </h1>
          <p className="text-sm leading-relaxed text-[rgb(var(--muted))]">
            Ohne Voranmeldung: Fragen eintragen, QR-Code erzeugen und direkt einsetzen. Die manuelle Variante ist
            kostenfrei. ProPilot erweitert Limits, Automationen und KI-Unterstützung (Kontingent begrenzt).
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1">Max. 5 Fragen pro Set</span>
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1">2-5 Optionen</span>
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1">Anonym &amp; ohne Login</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">QR-Set erstellen</h2>
              <p className="text-sm text-[rgb(var(--muted))]">
                Führe dein Thema Schritt für Schritt: erst Grundtext, dann Fragen, dann Alternativen. Der QR-Code
                bündelt alles in einer Sitzung.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: "manual",
                  title: "Manuell geführt",
                  text: "Du steuerst Inhalt, Fragen und Alternativen Schritt für Schritt.",
                },
                {
                  id: "research",
                  title: "Recherche-Schub (KI-Orchester)",
                  text: "Automatische Aufschlüsselung & Dynamik (nur ProPilot).",
                },
              ].map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left text-xs transition ${
                    mode === card.id
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:border-sky-200"
                  }`}
                  onClick={() => setMode(card.id as "manual" | "research")}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{card.title}</p>
                  <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">{card.text}</p>
                </button>
              ))}
            </div>

            {mode === "research" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
                Recherche-Schub ist Teil von ProPilot. Voranmeldung erforderlich, damit wir KI-Orchester, Budget und
                Durchlauf sauber einrichten.
                <div className="mt-2">
                  <Link href="/pricing" className="font-semibold text-amber-900 underline">
                    ProPilot ansehen
                  </Link>
                </div>
              </div>
            )}

            <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
              Titel (optional)
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="z.B. Stadtteil-Forum, Leserumfrage, Talkshow"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
              Grundtext / Beitrag / Skript
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                className="min-h-[140px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="Fasse den Beitrag oder das Skript zusammen. Aus diesem Text werden Fragen abgeleitet."
              />
              <span className="text-[11px] text-[rgb(var(--muted))]">
                Tipp: Stichpunkte oder kurze Absaetze beschleunigen die Ableitung.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[rgb(var(--muted))]">
                Schritt 2: Fragen aus dem Grundtext ableiten (manuell geführt).
              </div>
              <button
                type="button"
                onClick={adoptFromSource}
                className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]"
              >
                Fragen ableiten
              </button>
            </div>

            <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
              Fragen (1 pro Zeile)
              <textarea
                value={questionsInput}
                onChange={(event) => setQuestionsInput(event.target.value)}
                className="min-h-[160px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder={"Wie bewertest du die neue Verkehrsplanung?\nSoll der Marktplatz autofrei werden?\nWie wichtig ist dir mehr Gruen?"}
              />
              <span className="text-[11px] text-[rgb(var(--muted))]">
                {Math.min(parseLines(questionsInput).length, MAX_QUESTIONS)} / {MAX_QUESTIONS} Fragen
              </span>
              <span className="text-[11px] text-[rgb(var(--muted))]">
                ProPilot kann Fragen &amp; Optionen aus dem Grundtext dynamisch erweitern.
              </span>
            </label>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[rgb(var(--muted))]">Alternativen &amp; Eventualitaeten (Antwortoptionen)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OPTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      presetId === preset.id && !customOptions.trim()
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:border-sky-200"
                    }`}
                    onClick={() => {
                      setPresetId(preset.id);
                      setCustomOptions("");
                    }}
                  >
                    <span className="block text-[11px] uppercase tracking-wide text-[rgb(var(--muted))]">{preset.label}</span>
                    <span className="mt-1 block text-[11px] text-[rgb(var(--muted))]">{preset.options.join(" · ")}</span>
                  </button>
                ))}
              </div>

              <label className="grid gap-1 text-sm font-medium text-[rgb(var(--muted))]">
                Eigene Alternativen (Komma oder Zeilen)
                <input
                  value={customOptions}
                  onChange={(event) => setCustomOptions(event.target.value)}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="z.B. Zustimmung, Neutral, Ablehnung"
                />
                <span className="text-[11px] text-[rgb(var(--muted))]">
                  {Math.min(buildOptionList(customOptions).length || options.length, MAX_OPTIONS)} / {MAX_OPTIONS} Optionen
                </span>
              </label>
              {optionError && <p className="text-xs text-rose-600">{optionError}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[rgb(var(--muted))]">
                Manuell kostenfrei · ProPilot nach dem ersten Durchlauf (Automationen, Support, KI-Kontingent).
              </p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(14,165,233,0.25)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCreate}
                disabled={creating || !canCreate}
              >
                {creating
                  ? "QR-Set wird erstellt..."
                  : mode === "research"
                    ? "ProPilot erforderlich"
                    : "QR-Set erstellen"}
              </button>
            </div>
            {createError && <p className="text-sm text-rose-600">{createError}</p>}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Kanonischer Public-QR</h3>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Alte Share-, Druck- und Review-Links laufen kontrolliert hier zusammen. Erlaubt
                sind interne Pfade und freigegebene HTTPS-Ziele.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[rgb(var(--muted))]">
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1">
                  Aufrufer: {studioCallerLabel}
                </span>
                {studioTarget.status === "ready" ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                    {studioTarget.targetKind === "internal" ? "Interner Pfad" : "Freigegebenes HTTPS-Ziel"}
                  </span>
                ) : null}
                {studioTargetBlocked ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
                    Ziel blockiert
                  </span>
                ) : null}
              </div>

              {studioTarget.status === "ready" ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {targetQrImage ? (
                      <img
                        src={targetQrImage}
                        alt="QR-Code für das kanonische Ziel"
                        className="h-28 w-28 rounded-xl border border-[rgb(var(--border))]"
                      />
                    ) : (
                      <div className="h-28 w-28 rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))]" />
                    )}
                    <div className="text-xs text-[rgb(var(--muted))]">
                      <p className="font-semibold text-[rgb(var(--fg))]">Ziel</p>
                      <a
                        className="break-all underline"
                        href={studioTarget.absoluteHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {studioTarget.displayHref}
                      </a>
                      <p className="mt-2">
                        Dieser QR bleibt guardrailed: kein Open Redirect, kein `javascript:` und
                        kein `data:`-Ziel.
                      </p>
                    </div>
                  </div>
                </div>
              ) : studioTargetBlocked ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-800">
                  Das übergebene Ziel wurde fail-closed blockiert. Erlaubt sind nur interne Pfade
                  oder freigegebene HTTPS-Ziele unter der bekannten eDebatte-Domain.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-4 text-xs text-[rgb(var(--muted))]">
                  Wenn ein sichtbarer Public-Link aus Review, Themenseite oder Organisationskontext
                  kommt, erscheint das kanonische Ziel hier.
                </div>
              )}

              <p className="mt-3 text-[11px] text-[rgb(var(--muted))]">
                Caller-Inventar: {studioCallerInventory}
              </p>
            </div>

            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Dein QR-Code</h3>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Nach dem Erstellen kannst du den QR direkt teilen oder in Druckmaterial einbauen.
              </p>
              <label className="mt-3 grid gap-1 text-xs font-semibold text-[rgb(var(--muted))]">
                Ziel-Domain (optional)
                <input
                  value={targetBase}
                  onChange={(event) => setTargetBase(event.target.value)}
                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs text-[rgb(var(--muted))] shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  placeholder="https://edebatte.org"
                />
                {targetError && <span className="text-[11px] text-rose-600">{targetError}</span>}
              </label>
              {createdCode ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-[rgb(var(--muted))]">
                    <span>Aktiver Code</span>
                    <span className="rounded-full bg-[rgb(var(--bg))] px-3 py-1 font-semibold text-[rgb(var(--fg))]">
                      {createdCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {qrImage ? (
                      <img src={qrImage} alt="QR Code" className="h-28 w-28 rounded-xl border border-[rgb(var(--border))]" />
                    ) : (
                      <div className="h-28 w-28 rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))]" />
                    )}
                    <div className="text-xs text-[rgb(var(--muted))]">
                      <p className="font-semibold text-[rgb(var(--fg))]">QR-Link</p>
                      {effectiveBase ? (
                        <a className="underline" href={`${effectiveBase}/qr/${createdCode}`}>
                          {effectiveBase}/qr/{createdCode}
                        </a>
                      ) : (
                        <span className="text-rose-600">Bitte Ziel-Domain angeben.</span>
                      )}
                      <p className="mt-2">Teilbar und sofort einsatzbereit.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-6 text-center text-xs text-[rgb(var(--muted))]">
                  QR erscheint hier nach dem Erstellen.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Mehr mit ProPilot</h3>
              <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                Mehr Fragen, dynamische Ableitung, Automationen, Support und KI-Assistenz (kontingentiert) gibt es im
                ProPilot-Paket. Voranmeldung erforderlich.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]"
              >
                Pilotpakete ansehen
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Live-Auswertung</h2>
                <p className="text-sm text-[rgb(var(--muted))]">
                  Ergebnisse erscheinen sofort. Nur Creator/Admins sehen Zuschauerzahlen – hier zeigen wir ausschliesslich
                Abstimmungstendenzen.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={summaryCode}
                onChange={(event) => setSummaryCode(event.target.value)}
                placeholder="QR-Code eingeben"
                className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm text-[rgb(var(--muted))] shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
                onClick={() => loadSummary()}
                disabled={summaryLoading}
              >
                {summaryLoading ? "Lade..." : "Auswertung laden"}
              </button>
            </div>
          </div>

          {summaryError && <p className="mt-3 text-sm text-rose-600">{summaryError}</p>}

          {summary && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                <span>Code: {summary.set?.code}</span>
                <span>Gesamtstimmen: {summary.totalVotes ?? 0}</span>
              </div>

              {summaryQuestions.length ? (
                <div className="grid gap-4">
                  {summaryQuestions.map((question) => (
                    <div key={question.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[rgb(var(--fg))]">{question.title}</p>
                        <span className="text-xs text-[rgb(var(--muted))]">{question.totalVotes} Stimmen</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {toArray(question.options).map((opt) => {
                          const total = question.totalVotes || 1;
                          const pct = Math.round((opt.count / total) * 100);
                          return (
                            <div key={opt.label} className="grid gap-1">
                              <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                                <span>{opt.label}</span>
                                <span>{opt.count}</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-[rgb(var(--card))]">
                                <div
                                  className="h-2 rounded-full bg-sky-500"
                                  style={{ width: `${pct}%` }}
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          );
                        })}
                        {question.totalVotes === 0 && (
                          <p className="text-xs text-[rgb(var(--muted))]">Noch keine Stimmen.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[rgb(var(--muted))]">Noch keine Daten für diesen Code.</p>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
