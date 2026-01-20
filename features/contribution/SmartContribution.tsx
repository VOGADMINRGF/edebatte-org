"use client";

import { useEffect, useMemo, useState } from "react";
import { useErrorToast } from "@/hooks/useErrorToast";
import { buildPrefillUrl, createDraftAndNavigate } from "../common/utils/draftNavigation";

type AnalyzeResult = {
  claims?: Array<{ id?: string; text: string; stance?: string; domain?: string; topic?: string }>;
  notes?: Array<{ id?: string; text: string; kind?: string | null }>;
  questions?: Array<{ id?: string; text: string; dimension?: string | null }>;
  missingPerspectives?: Array<{ id?: string; text: string; dimension?: string }>;
  knots?: Array<{ id?: string; label: string; description: string }>;
  participationCandidates?: Array<{ id?: string; text: string; rationale?: string; stance?: string; dimension?: string }>;
};

type ParticipationItem = {
  id?: string;
  text: string;
  dimension?: string;
  stance?: string;
  rationale?: string;
  kind: "participation" | "claim";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: React.ReactNode;
};

const ROLE_OPTIONS = ["Bürger:in", "Redaktion", "Verwaltung", "NGO"] as const;
const LEVEL_OPTIONS = ["Kommune", "Land", "Bund", "EU", "Themenraum"] as const;
const FOCUS_OPTIONS = ["Recht", "Finanzen", "Betroffene", "Klima/Umwelt", "Umsetzung/Operativ", "Werte/Fairness"] as const;
const STORAGE_KEY = "edb_assistant_draft";

export default function SmartContribution({ initialText }: { initialText?: string }) {
  const [text, setText] = useState(initialText ?? "");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastResult, setLastResult] = useState<AnalyzeResult | null>(null);
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number] | null>(null);
  const [level, setLevel] = useState<(typeof LEVEL_OPTIONS)[number] | null>(null);
  const [focus, setFocus] = useState<Set<(typeof FOCUS_OPTIONS)[number]>>(new Set());

  const showError = useErrorToast();

  const preparedContext = useMemo(() => {
    const parts: string[] = [];
    if (role) parts.push(`Rolle: ${role}`);
    if (level) parts.push(`Ebene: ${level}`);
    if (focus.size) parts.push(`Fokus: ${Array.from(focus).join(", ")}`);
    return parts.length ? parts.join(" | ") : "";
  }, [role, level, focus]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (initialText && initialText.trim()) {
        setText(initialText);
        return;
      }
      if (stored) setText(stored);
    } catch {
      // ignore
    }
  }, [initialText]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // ignore
    }
  }, [text]);

  const handleAnalyze = async (opts?: { refined?: boolean }) => {
    if (!text.trim()) return;
    setLoading(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: (
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">Dein Input</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
          {preparedContext && (
            <p className="text-[11px] text-slate-500">Kontext: {preparedContext}</p>
          )}
        </div>
      ),
    };

    setMessages((prev) => [...prev, userMsg, createTypingMessage()]);

    try {
      const body: Record<string, unknown> = { text: text.trim(), locale: "de" };
      if (opts?.refined && preparedContext) {
        body.textPrepared = `${text.trim()}\n\n[Analyse-Kontext: ${preparedContext}]`;
        body.textOriginal = text.trim();
      }

      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data?.result) {
        throw new Error(data?.message || "Analyse fehlgeschlagen.");
      }

      const result: AnalyzeResult = data.result || {};
      setLastResult(result);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "assistant-typing"),
        buildAssistantMessage(result),
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== "assistant-typing"));
      showError(err, "Analyse fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFocus = (item: (typeof FOCUS_OPTIONS)[number]) => {
    setFocus((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6 bg-gradient-to-b from-slate-50 via-white to-emerald-50 px-4 pb-16 pt-10">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">eDebatte Assistent</p>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
          Check → Dossier → Beteiligung in einem Messenger.
        </h1>
        <p className="text-sm text-slate-600 md:text-base">
          Gib dein Anliegen ein. Der Assistent zerlegt es in Claims, zeigt offene Fragen, fehlende Perspektiven
          und erstellt abstimmbare Optionen – ohne Wahlempfehlung.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nachricht an eDebatte</p>
                <p className="text-[12px] text-slate-500">Keine Wiederholung im Output, keine Wahlempfehlungen.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                Check · Dossier · Beteiligung
              </span>
            </div>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              rows={6}
              placeholder="Beschreibe dein Anliegen, Frage oder Vorhaben …"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={loading || !text.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Analysiere …" : "Analyse starten"}
              </button>
              {lastResult && (
                <button
                  type="button"
                  onClick={() => handleAnalyze({ refined: true })}
                  disabled={loading || !text.trim()}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Mit Auswahl verfeinern
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Onboarding (optional)</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-slate-700">Rolle</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRole((prev) => (prev === opt ? null : opt))}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        role === opt
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-slate-700">Ebene</p>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLevel((prev) => (prev === opt ? null : opt))}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        level === opt
                          ? "bg-sky-100 text-sky-800 border border-sky-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-slate-700">Fokus-Aspekte</p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleFocus(opt)}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                      focus.has(opt)
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Deine Auswahl steuert die nächste Analyse (Kontext wird nicht gespeichert).
            </p>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Verlauf</p>
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">
                  Noch kein Verlauf. Starte mit einem Anliegen, z. B. „Mehr Schattenplätze auf dem Marktplatz“.
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "border-slate-200 bg-white text-slate-800"
                      : "border-emerald-100 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
            {lastResult && (
              <div className="mt-2 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700">
                  Wie möchtest du weiter?
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/statements/new"
                    onClick={(event) => {
                      event.preventDefault();
                      void createDraftAndNavigate({
                        kind: "statement",
                        text,
                        targetPath: "/statements/new",
                        fallbackPath: buildPrefillUrl("/statements/new", text),
                      });
                    }}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Abstimmung vorbereiten
                  </a>
                  <a
                    href="/howtoworks/edebatte/dossier"
                    className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Dossier vertiefen
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setRole(null);
                      setLevel(null);
                      setFocus(new Set());
                    }}
                    className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Fokus setzen & neu prüfen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Assistent erklärt</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>• Fasst Kernaussagen neutral zusammen.</li>
              <li>• Hebt offene Fragen, Bias und fehlende Stimmen hervor.</li>
              <li>• Schlägt abstimmbare Optionen vor, ohne Empfehlung.</li>
            </ul>
          </div>

          {lastResult && (
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Letzter Check (Kurz)</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {(lastResult.claims ?? []).slice(0, 3).map((claim, idx) => (
                  <li key={claim.id ?? idx} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{claim.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">Details im Verlauf links.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function createTypingMessage(): ChatMessage {
  return {
    id: "assistant-typing",
    role: "assistant",
    content: <p className="text-sm text-emerald-800">Analysiere …</p>,
  };
}

function buildAssistantMessage(result: AnalyzeResult): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content: <AssistantSummary result={result} />,
  };
}

function AssistantSummary({ result }: { result: AnalyzeResult }) {
  const claims = result.claims ?? [];
  const questions = result.questions ?? [];
  const notes = result.notes ?? [];
  const knots = result.knots ?? [];
  const missing = result.missingPerspectives ?? [];
  const participation = result.participationCandidates ?? [];
  const participationItems: ParticipationItem[] = (participation.length ? participation : claims).map((item) =>
    "rationale" in item
      ? {
          id: item.id,
          text: item.text,
          dimension: item.dimension,
          stance: item.stance,
          rationale: item.rationale,
          kind: "participation" as const,
        }
      : {
          id: item.id,
          text: item.text,
          dimension: item.domain ?? item.topic ?? undefined,
          stance: item.stance,
          kind: "claim" as const,
        },
  );

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Assistent</p>
        <span className="rounded-full bg-white/60 px-2 py-1 text-[11px] font-semibold text-emerald-800">
          Check → Dossier → Beteiligung
        </span>
      </header>

      <Section title="Check" badge="Claims">
        <div className="space-y-2">
          {claims.length === 0 && <p className="text-sm text-emerald-900">Keine Claims erkannt.</p>}
          {claims.map((c, idx) => (
            <div key={c.id ?? idx} className="rounded-xl border border-emerald-100 bg-white/80 p-3 text-sm text-emerald-900">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-semibold text-emerald-800">
                  {idx + 1}
                </span>
                <p className="font-semibold">{c.text}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-700">
                {c.stance && <Pill label={`Stance: ${c.stance}`} />}
                {c.domain && <Pill label={`Domäne: ${c.domain}`} />}
                {c.topic && <Pill label={`Thema: ${c.topic}`} />}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Dossier" badge="Fragen & Gaps">
        {questions.length === 0 && missing.length === 0 && knots.length === 0 && notes.length === 0 ? (
          <p className="text-sm text-emerald-900">Keine offenen Fragen oder Perspektiven erkannt.</p>
        ) : (
          <div className="space-y-3">
            {questions.length > 0 && (
              <Block title="Offene Fragen">
                <ul className="space-y-2">
                  {questions.map((q, idx) => (
                    <li key={q.id ?? idx} className="rounded-lg bg-white/70 p-2 text-sm text-emerald-900">
                      {q.text}
                      {q.dimension && (
                        <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {q.dimension}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {missing.length > 0 && (
              <Block title="Fehlende Perspektiven / Bias">
                <ul className="space-y-2">
                  {missing.map((p, idx) => (
                    <li key={p.id ?? idx} className="rounded-lg bg-white/70 p-2 text-sm text-emerald-900">
                      {p.text}
                      {p.dimension && (
                        <span className="ml-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          {p.dimension}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {knots.length > 0 && (
              <Block title="Spannungsfelder">
                <ul className="space-y-2">
                  {knots.map((k, idx) => (
                    <li key={k.id ?? idx} className="rounded-lg bg-white/70 p-2 text-sm text-emerald-900">
                      <p className="font-semibold">{k.label}</p>
                      <p className="text-[13px] text-emerald-800">{k.description}</p>
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {notes.length > 0 && (
              <Block title="Kontext & Hinweise">
                <ul className="space-y-2">
                  {notes.map((n, idx) => (
                    <li key={n.id ?? idx} className="rounded-lg bg-white/70 p-2 text-sm text-emerald-900">
                      {n.kind && <span className="mr-2 text-[11px] font-semibold uppercase text-emerald-700">{n.kind}</span>}
                      {n.text}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
          </div>
        )}
      </Section>

      <Section title="Beteiligung" badge="Abstimmbar">
        <div className="space-y-2">
          {participationItems.map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="rounded-xl border border-emerald-100 bg-white/80 p-3 text-sm text-emerald-900"
            >
              <p className="font-semibold">{item.text}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-emerald-700">
                {item.dimension && <Pill label={item.dimension} />}
                {item.stance && <Pill label={`Stance: ${item.stance}`} />}
                {item.rationale && <Pill label="Kontext" />}
              </div>
              <div className="mt-2">
                <a
                  href="/statements/new"
                  onClick={(event) => {
                    event.preventDefault();
                    void createDraftAndNavigate({
                      kind: "statement",
                      text: item.text,
                      targetPath: "/statements/new",
                      fallbackPath: buildPrefillUrl("/statements/new", item.text),
                    });
                  }}
                  className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                >
                  Abstimmung vorbereiten
                </a>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-emerald-700">
            Neutral formuliert. Keine Empfehlung, nur Optionen sichtbar machen.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/70 p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-emerald-900">{title}</p>
        {badge && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-emerald-700">{title}</p>
      {children}
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      {label}
    </span>
  );
}
