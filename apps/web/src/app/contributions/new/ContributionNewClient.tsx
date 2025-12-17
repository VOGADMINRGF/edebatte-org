// apps/web/src/app/contributions/new/ContributionNewClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type {
  AnalyzeResult,
  ConsequenceRecord,
  ResponsibilityRecord,
  ResponsibilityPath,
  DecisionTree,
  EventualityNode,
} from "@features/analyze/schemas";
import {
  HighlightedTextarea,
} from "@/app/(components)/HighlightedTextarea";
import {
  normalizeClaim,
  type NormalizedClaim,
} from "@/app/(components)/normalizeClaim";
import {
  ConsequencesPreviewCard,
  ResponsibilityPreviewCard,
} from "@features/statement/components/StatementImpactPreview";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";
import type { VerificationLevel } from "@core/auth/verificationTypes";
import { VERIFICATION_REQUIREMENTS, meetsVerificationLevel } from "@features/auth/verificationRules";
import type { AccountOverview } from "@features/account/types";
import {
  getAccessTierConfigForUser,
  getUserAccessTier,
  hasUnlimitedContributions,
} from "@core/access/accessTiers";
import StatementCard, { type StatementVote } from "@/components/statements/StatementCard";
import AnalyzeProgress from "@/components/contributions/AnalyzeProgress";
import { ImpactSection, ResponsibilitySection } from "@/components/contributions/ImpactResponsibilitySection";
import { selectE150Questions } from "@features/e150/questions/catalog";
import { useRouter } from "next/navigation";

/* ---------- Types ---------- */

type NoteSection = { id: string; title: string; body: string };
type QuestionCard = {
  id: string;
  label: string;
  category: string;
  body: string;
};
type KnotCard = { id: string; title: string; category: string; body: string };

type VoteKind = StatementVote | null;

type StatementEntry = NormalizedClaim & {
  quality?: {
    precision: number;
    testability: number;
    readability: number;
    balance: number;
  };
  vote?: VoteKind;
  locallyEdited?: boolean; // lokal angepasst → redaktionelle Prüfung
  flagged?: boolean;       // vom User gemeldet
};

import type { ImpactAndResponsibility } from "@features/analyze/schemas";

type ProviderMatrixEntry = {
  provider: string;
  state: "queued" | "running" | "ok" | "failed" | "cancelled" | "skipped" | "disabled";
  attempt?: number | null;
  errorKind?: string | null;
  status?: number | null;
  durationMs?: number | null;
  model?: string | null;
  reason?: string | null;
};

type AnalyzeStepState = {
  key: "context" | "claims" | "questions" | "consequences" | "responsibility";
  label: string;
  state: "running" | "done" | "empty" | "failed";
  reason?: string | null;
};

const STORAGE_KEY = "vog_contribution_draft_v1";

const pageCopy = {
  title_de: "Beitrag analysieren",
  title_en: "Analyze your contribution",
  info_de: "Für die schlanke Bürger-Ansicht nutze /statements/new. Hier siehst du die ausführliche Analyse-Ansicht (E150).",
  info_en: "Use /statements/new for the lightweight citizen view. This is the full E150 analysis mode.",
};

const levelOptions = [
  { id: 1 as 1 | 2 | 3 | 4, label_de: "Level 1 – Kurz", label_en: "Level 1 – short" },
  { id: 2 as 1 | 2 | 3 | 4, label_de: "Level 2 – Statements", label_en: "Level 2 – statements" },
  { id: 3 as 1 | 2 | 3 | 4, label_de: "Level 3 – Impact & Zuständigkeiten", label_en: "Level 3 – impact & responsibility" },
  { id: 4 as 1 | 2 | 3 | 4, label_de: "Level 4 – Deep", label_en: "Level 4 – deep" },
];
const MAX_LEVEL1_STATEMENTS = 3;

const analyzeButtonTexts = {
  running_de: "Analyse läuft …",
  running_en: "Analysis running…",
  retry_de: "Erneut versuchen",
  retry_en: "Try again",
  start_de: "Analyse starten",
  start_en: "Start analysis",
};

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  mistral: "Mistral",
  anthropic: "Anthropic",
  ari: "ARI",
};

const defaultProviderMatrix = (): ProviderMatrixEntry[] =>
  Object.keys(providerLabel).map((provider) => ({
    provider,
    state: "running",
    attempt: 1,
    errorKind: null,
    status: null,
    durationMs: null,
    model: null,
    reason: null,
  }));

const BASE_STEPS: AnalyzeStepState[] = [
  { key: "context", label: "Kontext", state: "empty" },
  { key: "claims", label: "Aussagen", state: "empty" },
  { key: "questions", label: "Fragen", state: "empty" },
  { key: "consequences", label: "Folgen", state: "empty" },
  { key: "responsibility", label: "Zuständigkeit", state: "empty" },
];

type ContributionNewClientProps = {
  initialOverview: AccountOverview;
};

type GateState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "allowed"; overview: AccountOverview }
  | { status: "blocked"; overview: AccountOverview };

function deriveGateFromOverview(overview?: AccountOverview | null): GateState {
  if (!overview) return { status: "anon" };
  const cfg = getAccessTierConfigForUser(overview);
  const tier = getUserAccessTier(overview);
  const tierLimit = cfg.monthlyContributionLimit ?? 0;
  const hasCredits = (overview.stats?.contributionCredits ?? 0) > 0;
  const allowed = hasUnlimitedContributions(tier) || (tierLimit > 0 && hasCredits);
  return { status: allowed ? "allowed" : "blocked", overview };
}

/* ---------- AI → UI Mapping (nur 1:1, keine Heuristik) ---------- */

function mapAiNoteToSection(raw: any, idx: number): NoteSection | null {
  if (!raw || typeof raw.text !== "string") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `note-${idx + 1}`;
  const kind = typeof raw.kind === "string" ? raw.kind : null;

  return {
    id,
    title: kind ? kind.toUpperCase() : `Abschnitt ${idx + 1}`,
    body: raw.text,
  };
}

function mapAiQuestionToCard(raw: any, idx: number): QuestionCard | null {
  if (!raw || typeof raw.text !== "string") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `q-${idx + 1}`;
  const dimension =
    typeof raw.dimension === "string" && raw.dimension ? raw.dimension : null;

  return {
    id,
    label: dimension ? dimension.toUpperCase() : "FRAGE",
    category: dimension ?? "",
    body: raw.text,
  };
}

function mapAiKnotToCard(raw: any, idx: number): KnotCard | null {
  if (!raw || typeof raw.description !== "string") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `k-${idx + 1}`;
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label
      : `Knoten ${idx + 1}`;

  return {
    id,
    title: label,
    category: "Themenschwerpunkt",
    body: raw.description,
  };
}

function mapAiClaimToStatement(raw: any, idx: number): StatementEntry | null {
  const normalized = normalizeClaim(raw, idx);
  if (!normalized) return null;

  const meta =
    raw && typeof raw.meta === "object" && raw.meta !== null ? raw.meta : {};

  const quality =
    meta && typeof meta === "object" && meta.quality
      ? (meta.quality as StatementEntry["quality"])
      : undefined;

  return {
    ...normalized,
    quality,
    vote: null,
    locallyEdited: false,
    flagged: false,
  };
}

function deriveTagsFromAnalysis(statements: StatementEntry[], knots: KnotCard[]): string[] {
  const tags = new Set<string>();
  statements.forEach((s) => {
    if (s.topic) tags.add(s.topic.toLowerCase());
    if (s.responsibility) tags.add(s.responsibility.toLowerCase());
  });
  knots.forEach((k) => {
    if (k.category) tags.add(k.category.toLowerCase());
  });
  return Array.from(tags);
}

function dedupeQuestions(qs: QuestionCard[]): QuestionCard[] {
  const seen = new Set<string>();
  const out: QuestionCard[] = [];
  for (const q of qs) {
    const key = q.body.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

function computeStepStatesFromData(params: {
  notes: NoteSection[];
  statements: StatementEntry[];
  questions: QuestionCard[];
  consequences: ConsequenceRecord[];
  responsibilities: ResponsibilityRecord[];
  impactAndResponsibility: ImpactAndResponsibility;
  degradedReason?: string | null;
  failedReason?: string | null;
}): AnalyzeStepState[] {
  const { notes, statements, questions, consequences, responsibilities, impactAndResponsibility, degradedReason, failedReason } = params;

  if (degradedReason) {
    return BASE_STEPS.map((s) => ({ ...s, state: "failed", reason: degradedReason }));
  }
  if (failedReason) {
    return BASE_STEPS.map((s) => ({ ...s, state: "failed", reason: failedReason }));
  }

  const hasContext = notes.length > 0;
  const hasClaims = statements.length > 0;
  const hasQuestions = questions.length > 0;
  const hasConsequences = consequences.length > 0;
  const hasResponsibility =
    responsibilities.length > 0 || (impactAndResponsibility.responsibleActors?.length ?? 0) > 0;

  return BASE_STEPS.map((s) => {
    if (s.key === "context") return { ...s, state: hasContext ? "done" : "empty" };
    if (s.key === "claims") return { ...s, state: hasClaims ? "done" : "empty" };
    if (s.key === "questions") return { ...s, state: hasQuestions ? "done" : "empty" };
    if (s.key === "consequences") return { ...s, state: hasConsequences ? "done" : "empty" };
    if (s.key === "responsibility") return { ...s, state: hasResponsibility ? "done" : "empty" };
    return s;
  });
}

/* ---------- Inline-Editor ---------- */

type InlineEditableTextProps = {
  value: string;
  onChange: (val: string) => void;
  label?: string;
};

function InlineEditableText({ value, onChange, label }: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => setDraft(value), [value]);

  const save = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onChange(trimmed);
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        {label && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </div>
        )}
        <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">
          {value}
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="absolute -top-1 -right-1 hidden items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[11px] text-sky-600 shadow-sm group-hover:inline-flex"
          aria-label="Text bearbeiten"
        >
          ✏️
        </button>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
      )}
      <textarea
        className="w-full rounded-md border border-sky-200 bg-white px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
      />
    </div>
  );
}

/* ---------- Hauptseite ---------- */

export function ContributionNewClient({ initialOverview }: ContributionNewClientProps) {
  const { locale } = useLocale();
  const [verificationLevel, setVerificationLevel] = React.useState<VerificationLevel>(
    initialOverview?.verificationLevel ?? "none",
  );
  const [levelStatus, setLevelStatus] = React.useState<"loading" | "ok" | "login_required" | "error">(
    initialOverview ? "ok" : "login_required",
  );
  const [gate, setGate] = React.useState<GateState>(() => deriveGateFromOverview(initialOverview));
  const textContent = React.useCallback(
    (entry: Record<string, any>, key: string) => resolveLocalizedField(entry, key, locale),
    [locale],
  );
  const [viewLevel, setViewLevel] = React.useState<1 | 2 | 3 | 4>(2);
  const [text, setText] = React.useState("");
  const hasLoadedDraft = React.useRef(false);

  const [notes, setNotes] = React.useState<NoteSection[]>([]);
  const [questions, setQuestions] = React.useState<QuestionCard[]>([]);
  const [knots, setKnots] = React.useState<KnotCard[]>([]);
  const [statements, setStatements] = React.useState<StatementEntry[]>([]);
  const [consequences, setConsequences] = React.useState<ConsequenceRecord[]>([]);
  const [responsibilities, setResponsibilities] = React.useState<ResponsibilityRecord[]>([]);
  const [responsibilityPaths, setResponsibilityPaths] = React.useState<ResponsibilityPath[]>([]);
  const [eventualities, setEventualities] = React.useState<EventualityNode[]>([]);
  const [decisionTrees, setDecisionTrees] = React.useState<DecisionTree[]>([]);
  const [impactAndResponsibility, setImpactAndResponsibility] = React.useState<ImpactAndResponsibility>({
    impacts: [],
    responsibleActors: [],
  });
  const [report, setReport] = React.useState<any>(null);
  const [providerMatrix, setProviderMatrix] = React.useState<ProviderMatrixEntry[]>([]);
  const hedgeTimersRef = React.useRef<number[]>([]);
  const clearHedgeTimers = React.useCallback(() => {
    hedgeTimersRef.current.forEach((id) => clearTimeout(id));
    hedgeTimersRef.current = [];
  }, []);
  const [steps, setSteps] = React.useState<AnalyzeStepState[]>(BASE_STEPS);
  const scheduleHedgeTransition = React.useCallback(
    (delayMs: number, providers: string[]) => {
      const id = window.setTimeout(() => {
        setProviderMatrix((prev) =>
          prev.map((p) => {
            if (providers.includes(p.provider) && p.state === "queued") {
              return { ...p, state: "running", reason: null };
            }
            return p;
          }),
        );
      }, delayMs);
      hedgeTimersRef.current.push(id);
    },
    [setProviderMatrix],
  );

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [saveInfo, setSaveInfo] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState<
    "idle" | "success" | "error" | "empty" | "degraded"
  >("idle");

  // welches Statement ist gerade im Meta-Edit-Modus?
  const [metaEditingId, setMetaEditingId] = React.useState<string | null>(null);
  const statementsRef = React.useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    let ignore = false;
    async function loadLevel() {
      try {
        const res = await fetch("/api/account/overview", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (ignore) return;
        if (!res.ok || !body?.overview) {
          const unauthorized = res.status === 401;
          setLevelStatus(unauthorized ? "login_required" : "error");
          setGate(unauthorized ? { status: "anon" } : deriveGateFromOverview(body?.overview));
          return;
        }
        const overview = body.overview as AccountOverview;
        setVerificationLevel(overview.verificationLevel ?? "none");
        setLevelStatus("ok");
        setGate(deriveGateFromOverview(overview));
      } catch {
        if (ignore) return;
        setLevelStatus("error");
      }
    }
    loadLevel();
    return () => {
      ignore = true;
    };
  }, []);

  React.useEffect(
    () => () => {
      clearHedgeTimers();
    },
    [clearHedgeTimers],
  );

  // Draft aus localStorage holen
  React.useEffect(() => {
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === "string") {
        setText(parsed.text);
      }
    } catch {
      // ignore
    }
  }, []);

  if (gate.status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-500">
        Lade dein Profil …
      </main>
    );
  }
  if (gate.status === "anon") {
    return (
      <ContributionGate
        variant="anon"
        overview={undefined}
      />
    );
  }
  if (gate.status === "blocked") {
    return (
      <ContributionGate
        variant="blocked"
        overview={gate.overview}
      />
    );
  }

  const updateNote = (id: string, body: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body } : n)));

  const updateQuestion = (id: string, body: string) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, body } : q)));

  const updateKnot = (id: string, body: string) =>
    setKnots((prev) => prev.map((k) => (k.id === id ? { ...k, body } : k)));

  const setVote = (id: string, vote: VoteKind) =>
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, vote: s.vote === vote ? null : vote } : s
      )
    );

  const updateStatementText = (id: string, newText: string) =>
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, text: newText, locallyEdited: true } : s
      )
    );

  const updateStatementMeta = (
    id: string,
    patch: Partial<Pick<StatementEntry, "title" | "responsibility" | "topic">>
  ) =>
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...patch, locallyEdited: true } : s
      )
    );

  const reportStatement = (id: string) => {
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, flagged: true } : s
      )
    );
    setInfo(
      "Danke für deinen Hinweis. Das Statement wurde zur redaktionellen Prüfung markiert. Deine eigene Stimme bleibt davon unberührt."
    );
  };

  const removeStatement = (id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id));
    if (metaEditingId === id) setMetaEditingId(null);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setInfo(null);
    setSaveInfo(null);
    setLastStatus("idle");
    setMetaEditingId(null);
    setSteps(BASE_STEPS.map((s) => ({ ...s, state: "running", reason: null })));
    clearHedgeTimers();
    setProviderMatrix([
      { provider: "openai", state: "running", attempt: 1, errorKind: null, status: null, durationMs: null, model: null, reason: null },
      { provider: "mistral", state: "queued", attempt: 1, errorKind: null, status: null, durationMs: null, model: null, reason: null },
      { provider: "anthropic", state: "queued", attempt: 1, errorKind: null, status: null, durationMs: null, model: null, reason: null },
      { provider: "ari", state: "queued", attempt: 1, errorKind: null, status: null, durationMs: null, model: null, reason: null },
    ]);
    scheduleHedgeTransition(1_200, ["mistral"]);
    scheduleHedgeTransition(2_400, ["anthropic", "ari"]);

    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        const code = (data as any)?.errorCode;
        if (code === "NO_ANALYZE_PROVIDER") {
          throw new Error(
            "NO_ANALYZE_PROVIDER__Aktuell ist kein KI-Provider für die Analyse konfiguriert. Wir arbeiten daran – bis dahin bleibt dein Beitrag oben erhalten. Du kannst ihn speichern oder später erneut versuchen.",
          );
        }
        if (code === "ANALYZE_PROVIDER_FAILED" || code === "BAD_JSON") {
          throw new Error(
            "ANALYZE_PROVIDER_FAILED__Die Analyse hat heute nicht zuverlässig geantwortet. Bitte erneut versuchen.",
          );
        }
        throw new Error(
          data?.message ||
            data?.error ||
            `Analyse fehlgeschlagen (HTTP ${res.status}).`,
        );
      }

      const resultPayload = data.result ?? data;
      if (!resultPayload) {
        throw new Error("Analyse lieferte keine Ergebnisse.");
      }
      const result: AnalyzeResult = resultPayload as AnalyzeResult;

      const rawNotes: any[] = Array.isArray((result as any).notes)
        ? (result as any).notes
        : [];
      const rawQuestions: any[] = Array.isArray((result as any).questions)
        ? (result as any).questions
        : [];
      const rawKnots: any[] = Array.isArray((result as any).knots)
        ? (result as any).knots
        : [];
      const rawClaims: any[] = Array.isArray((result as any).claims)
        ? (result as any).claims
        : [];

      const mappedNotes = rawNotes
        .map(mapAiNoteToSection)
        .filter((x): x is NoteSection => x !== null);
      const mappedQuestions = rawQuestions
        .map(mapAiQuestionToCard)
        .filter((x): x is QuestionCard => x !== null);
      const mappedKnots = rawKnots
        .map(mapAiKnotToCard)
        .filter((x): x is KnotCard => x !== null);
      const mappedStatements = rawClaims
        .map(mapAiClaimToStatement)
        .filter((x): x is StatementEntry => x !== null);

      const impactBlock = (result as any)?.impactAndResponsibility;
      const impactAndResponsibilityLocal: ImpactAndResponsibility = {
        impacts: Array.isArray(impactBlock?.impacts) ? impactBlock.impacts : [],
        responsibleActors: Array.isArray(impactBlock?.responsibleActors)
          ? impactBlock.responsibleActors
          : [],
      };
      setImpactAndResponsibility(impactAndResponsibilityLocal);
      setReport((result as any)?.report ?? null);
      const matrixFromResponse: ProviderMatrixEntry[] = Array.isArray(data?.meta?.providerMatrix)
        ? data.meta.providerMatrix
        : defaultProviderMatrix().map((p) => ({ ...p, state: "failed", reason: "keine Meta" }));
      clearHedgeTimers();
      setProviderMatrix(matrixFromResponse);

      const inferredTags = deriveTagsFromAnalysis(mappedStatements, mappedKnots);
      const level = viewLevel >= 2 ? "vertieft" : "basis";
      const catalogQuestions = selectE150Questions(inferredTags, level).map((q) => ({
        id: q.id,
        label: q.tags[0]?.toUpperCase() ?? "FRAGE",
        category: q.tags[0] ?? "",
        body: q.text,
      }));

      const mergedQuestions = dedupeQuestions([...catalogQuestions, ...mappedQuestions]);

      setNotes(mappedNotes);
      setQuestions(mergedQuestions);
      setKnots(mappedKnots);
      setStatements(mappedStatements);

      const consequenceBundle = (result as any)?.consequences;
      const mappedConsequences: ConsequenceRecord[] = Array.isArray(
        consequenceBundle?.consequences,
      )
        ? consequenceBundle.consequences
        : [];
      const mappedResponsibilities: ResponsibilityRecord[] = Array.isArray(
        consequenceBundle?.responsibilities,
      )
        ? consequenceBundle.responsibilities
        : [];
      const mappedPaths: ResponsibilityPath[] = Array.isArray(
        (result as any)?.responsibilityPaths,
      )
        ? (result as any).responsibilityPaths
        : [];

      setConsequences(mappedConsequences);
      setResponsibilities(mappedResponsibilities);
      setResponsibilityPaths(mappedPaths);
      setEventualities(Array.isArray(result.eventualities) ? result.eventualities : []);
      setDecisionTrees(Array.isArray(result.decisionTrees) ? result.decisionTrees : []);
      if (data?.degraded) {
        setInfo(data?.warning ?? "Analyse degradiert, bitte später erneut versuchen.");
        setLastStatus("degraded");
        setSteps(
          computeStepStatesFromData({
            notes: mappedNotes,
            statements: mappedStatements,
            questions: mappedQuestions,
            consequences: mappedConsequences,
            responsibilities: mappedResponsibilities,
            impactAndResponsibility: impactAndResponsibilityLocal,
            degradedReason: "KI temporär nicht erreichbar",
          }),
        );
      } else {
        setSteps(
          computeStepStatesFromData({
            notes: mappedNotes,
            statements: mappedStatements,
            questions: mergedQuestions,
            consequences: mappedConsequences,
            responsibilities: mappedResponsibilities,
            impactAndResponsibility: impactAndResponsibilityLocal,
          }),
        );
      }

      if (mappedStatements.length === 0) {
        setLastStatus("empty");
        setInfo(
          "Die Analyse konnte aus deinem Beitrag im Moment keine klaren Einzel-Statements ableiten. Du kannst deinen Text leicht anpassen (z.B. kürzere Sätze) und die Analyse erneut starten."
        );
      } else {
        setLastStatus("success");
        setInfo(null);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.startsWith("NO_ANALYZE_PROVIDER__")) {
        setError(msg.replace("NO_ANALYZE_PROVIDER__", ""));
      } else if (msg.startsWith("ANALYZE_PROVIDER_FAILED__")) {
        setError(msg.replace("ANALYZE_PROVIDER_FAILED__", ""));
      } else {
        setError(
          msg ||
            "Analyse fehlgeschlagen. Vermutlich gab es ein Problem mit dem KI-Dienst."
        );
      }
      setInfo(
        "Dein Beitrag bleibt oben erhalten. Du kannst es nach einem kurzen Moment mit „Erneut versuchen“ noch einmal probieren."
      );
      setNotes([]);
      setQuestions([]);
      setKnots([]);
      setStatements([]);
      setConsequences([]);
      setResponsibilities([]);
      setResponsibilityPaths([]);
      setEventualities([]);
      setDecisionTrees([]);
      setImpactAndResponsibility({ impacts: [], responsibleActors: [] });
      setReport(null);
      setLastStatus("error");
      setMetaEditingId(null);
      setSteps(
        computeStepStatesFromData({
          notes: [],
          statements: [],
          questions: [],
          consequences: [],
          responsibilities: [],
          impactAndResponsibility: { impacts: [], responsibleActors: [] },
          failedReason: msg || "Analyse fehlgeschlagen",
        }),
      );
    } finally {
      clearHedgeTimers();
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setText("");
    setNotes([]);
    setQuestions([]);
    setKnots([]);
    setStatements([]);
    setConsequences([]);
    setResponsibilities([]);
    setResponsibilityPaths([]);
    setEventualities([]);
    setDecisionTrees([]);
    setImpactAndResponsibility({ impacts: [], responsibleActors: [] });
    setReport(null);
    setError(null);
    setInfo(null);
    setSaveInfo(null);
    setLastStatus("idle");
    setMetaEditingId(null);
    setSteps(BASE_STEPS);
  };

  const handleSave = () => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          text,
          savedAt: new Date().toISOString(),
        })
      );
      setSaveInfo(
        "Dein Beitrag wurde lokal im Browser gespeichert (nicht auf dem Server). Du kannst ihn später in diesem Browser wieder aufrufen."
      );
    } catch {
      setSaveInfo(
        "Speichern im Browser ist fehlgeschlagen. Kopiere deinen Text bitte vorsichtshalber in ein Dokument."
      );
    }
  };

  const handleFinalize = async () => {
    try {
      const res = await fetch("/api/contributions/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          analysis: {
            statements,
            notes,
            questions,
            knots,
            consequences,
            responsibilities,
            responsibilityPaths,
            impactAndResponsibility,
            report,
          },
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Übernahme fehlgeschlagen");
      }
      const id = body.id ?? "draft";
      router.push(
        `/vote/new?fromContribution=${encodeURIComponent(String(id))}` as any,
      );
    } catch (err: any) {
      setInfo(err?.message ?? "Beitrag konnte nicht übernommen werden.");
    }
  };

  const layoutClass = "grid gap-4 lg:grid-cols-[minmax(0,1.8fr)] max-w-5xl mx-auto";

  const analyzeButtonLabel =
    isAnalyzing
      ? textContent(analyzeButtonTexts, "running")
      : lastStatus === "error" || lastStatus === "empty"
      ? textContent(analyzeButtonTexts, "retry")
      : textContent(analyzeButtonTexts, "start");
  const topStatements = statements.slice(0, MAX_LEVEL1_STATEMENTS);
  const levelStatements = viewLevel === 1 ? topStatements : statements;
  const totalStatements = statements.length;
  const hasScenarioMatrix = (() => {
    if (statements.length === 0) return false;
    const treeByStatement = new Map<string, DecisionTree>();
    decisionTrees.forEach((tree) => {
      if (tree?.rootStatementId) {
        treeByStatement.set(tree.rootStatementId, tree);
      }
    });
    const fallbackByStatement = groupEventualitiesByStatement(eventualities);
    return statements.some((statement) => {
      const tree = treeByStatement.get(statement.id);
      const fallback = fallbackByStatement.get(statement.id);
      return Boolean(tree || hasScenarioBuckets(fallback));
    });
  })();
  const showStickyCta = lastStatus === "success" && statements.length > 0;
  const scrollToStatements = () => {
    if (statementsRef.current) {
      statementsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const requiredLevel =
    viewLevel >= 2
      ? VERIFICATION_REQUIREMENTS.contribution_level2
      : VERIFICATION_REQUIREMENTS.contribution_level1;
  const meetsLevel = meetsVerificationLevel(verificationLevel, requiredLevel);
  const analyzeDisabled =
    isAnalyzing || !text.trim() || levelStatus === "loading" || !meetsLevel;
  const gatingMessage =
    levelStatus === "login_required"
      ? "Bitte melde dich an, um Beiträge zu analysieren."
      : levelStatus === "error"
      ? "Level konnte nicht geladen werden – bitte später erneut versuchen."
      : !meetsLevel
      ? `Für diese Ansicht benötigst du mindestens Verifizierungs-Level "${requiredLevel}".`
      : null;

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] bg-[linear-gradient(180deg,#e9f6ff_0%,#c0f8ff_45%,#a4fcec_100%)]">
        <div className="container-vog space-y-4 pb-10 pt-6">
          {/* Hinweis oben */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-2 text-xs text-sky-800">
            {textContent(pageCopy, "info")}{" "}
            <Link href="/statements/new" className="font-semibold underline">
              /statements/new
            </Link>
            .
          </div>

          {/* Level-Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="vog-head">{textContent(pageCopy, "title")}</h1>
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
              {levelOptions.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setViewLevel(lvl.id)}
                  className={[
                    "rounded-full px-3 py-1 transition",
                    viewLevel === lvl.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900",
                  ].join(" ")}
                >
                  {textContent(lvl, "label")}
                </button>
              ))}
            </div>
          </div>

          <AnalyzeProgress
            steps={steps}
            providerMatrix={providerMatrix}
          />

          {/* Layout */}
          <div className={layoutClass}>
            {/* Mitte: Editor + Statements */}
            <div className="flex flex-col gap-4">
              {/* Editor */}
              <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm" ref={statementsRef}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Diesen Beitrag (Editor-Ansicht)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Du kannst deinen Beitrag später jederzeit überarbeiten.
                      Speicherung erfolgt derzeit lokal in deinem Browser.
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sprache: <span className="font-medium uppercase">{locale}</span>
                  </div>
                </div>

                <HighlightedTextarea
                  value={text}
                  onChange={setText}
                  analyzing={isAnalyzing}
                  rows={14}
                />

                {/* Buttons */}
                <div className="mt-3 flex flex-col items-center gap-1 text-[11px] text-slate-500">
                  <span>{text.length} Zeichen</span>
                  <div className="inline-flex gap-2 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={analyzeDisabled}
                      className="rounded-full bg-sky-500 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {analyzeButtonLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Zurücksetzen
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="rounded-full border border-emerald-300 px-4 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    >
                      Speichern
                    </button>
                  </div>
                  {gatingMessage && (
                    <p className="mt-1 text-xs font-semibold text-rose-600">{gatingMessage}</p>
                  )}
                </div>

                {error && (
                  <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 space-y-1">
                    <p>{error}</p>
                    <p>
                      Wenn das häufiger passiert, gib uns bitte kurz Bescheid über
                      unsere{" "}
                      <Link
                        href="/kontakt"
                        className="underline font-semibold text-rose-700"
                      >
                        Kontakt-Seite
                      </Link>
                      .
                    </p>
                  </div>
                )}

                {saveInfo && (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                    {saveInfo}
                  </p>
                )}

                {info && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                    {info}
                  </p>
                )}
              </div>

              {/* Statements + Voting */}
              {viewLevel <= 2 && (
                <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                  {viewLevel === 1 && (
                    <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Kurzfassung
                      </p>
                      {report?.summary ? (
                        <p className="mt-1 text-sm text-slate-800">{report.summary}</p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">
                          Noch keine Zusammenfassung vorhanden.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-800">
                      {viewLevel === 1 ? "Top-Statements" : "Abgeleitete Statements (Claims)"}
                    </h2>
                    <div className="text-[11px] text-slate-500">
                      {totalStatements > 0
                        ? viewLevel === 1
                          ? `${totalStatements} Statements gesamt (Top ${Math.min(MAX_LEVEL1_STATEMENTS, totalStatements)})`
                          : `${totalStatements} Statements zu diesem Beitrag`
                        : "Noch keine Statements – die Analyse muss zuerst erfolgreich durchlaufen."}
                    </div>
                  </div>

                  {info && (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-[11px] text-slate-700">
                      {info}
                    </div>
                  )}

                  <div className="space-y-3 max-w-2xl mx-auto">
                    {levelStatements.map((s) => {
                      const inMetaEdit = metaEditingId === s.id;
                      const stanceLabel =
                        s.stance === "pro"
                          ? "pro"
                          : s.stance === "contra"
                          ? "contra"
                          : s.stance === "neutral"
                          ? "neutral"
                          : null;
                      const tags: string[] = [];
                      if (stanceLabel) tags.push(`Haltung: ${stanceLabel}`);
                      if (typeof s.importance === "number") {
                        tags.push(`Wichtigkeit: ${s.importance}/5`);
                      }

                      return (
                        <StatementCard
                          key={s.id}
                          variant="analyze"
                          statementId={s.id}
                          text={s.text}
                          title={s.title && s.title.trim().length > 0 ? s.title : `Statement #${s.index + 1}`}
                          mainCategory={s.title ?? `Statement #${s.index + 1}`}
                          jurisdiction={s.responsibility || undefined}
                          topic={s.topic || undefined}
                          tags={tags}
                          currentVote={s.vote}
                          onVoteChange={(vote) => setVote(s.id, vote)}
                          showQualityMetrics={Boolean(s.quality)}
                          quality={s.quality}
                          source="ai"
                        >
                          <div className="space-y-2">
                            <InlineEditableText
                              value={s.text}
                              onChange={(val) => updateStatementText(s.id, val)}
                              label="Statement-Text"
                            />
                            {inMetaEdit ? (
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <input
                                  type="text"
                                  className="min-w-[120px] flex-1 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-300"
                                  placeholder={`Titel (z.B. „Tierwohl-Standard Stufe 4“)`}
                                  value={s.title ?? ""}
                                  onChange={(e) =>
                                    updateStatementMeta(s.id, {
                                      title: e.target.value,
                                    })
                                  }
                                />
                                <input
                                  type="text"
                                  className="min-w-[120px] rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300"
                                  placeholder="Zuständigkeit (z.B. Bund, EU, Kommune …)"
                                  value={s.responsibility ?? ""}
                                  onChange={(e) =>
                                    updateStatementMeta(s.id, {
                                      responsibility: e.target.value,
                                    })
                                  }
                                />
                                <input
                                  type="text"
                                  className="min-w-[120px] rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300"
                                  placeholder="Topic (z.B. Tierwohl, Sicherheit …)"
                                  value={s.topic ?? ""}
                                  onChange={(e) =>
                                    updateStatementMeta(s.id, {
                                      topic: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                  Zuständigkeit: <span className="font-medium">{s.responsibility || "–"}</span>
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                  Topic: <span className="font-medium">{s.topic || "–"}</span>
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                              <div className="flex gap-2">
                                {s.locallyEdited && (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                    Änderung wird redaktionell geprüft
                                  </span>
                                )}
                                {s.flagged && (
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                                    Zur Prüfung gemeldet
                                  </span>
                                )}
                              </div>
                              <div className="ml-auto flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => reportStatement(s.id)}
                                  className="text-[10px] text-slate-500 hover:text-rose-700 hover:underline"
                                >
                                  melden
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMetaEditingId(metaEditingId === s.id ? null : s.id)}
                                  className="text-[10px] text-slate-500 hover:text-sky-700 hover:underline"
                                >
                                  {metaEditingId === s.id ? "Änderung schließen" : "Metadaten ändern"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeStatement(s.id)}
                                  className="text-[10px] text-slate-500 hover:text-rose-700 hover:underline"
                                >
                                  entfernen
                                </button>
                              </div>
                            </div>
                          </div>
                        </StatementCard>
                      );
                    })}

                    {!totalStatements && !info && (
                      <p className="text-sm text-slate-500">
                        Noch keine Statements vorhanden. Sie erscheinen nur, wenn
                        die Analyse erfolgreich war und der KI-Dienst klare
                        Einzel-Statements liefern konnte.
                      </p>
                    )}
                  </div>

                  {viewLevel === 1 && totalStatements > MAX_LEVEL1_STATEMENTS && (
                    <p className="mt-3 text-[11px] text-slate-500">
                      Weitere Statements findest du in Level 2.
                    </p>
                  )}
                </div>
              )}

              {viewLevel === 3 && (
                <div className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800">Mögliche Folgen</h3>
                        {impactAndResponsibility.impacts?.length ? (
                          <span className="text-[11px] text-slate-500">
                            {impactAndResponsibility.impacts.length} Vorschläge
                          </span>
                        ) : null}
                      </div>
                      <ImpactSection
                        impacts={impactAndResponsibility.impacts ?? []}
                        onChange={(next) =>
                          setImpactAndResponsibility((prev) => ({ ...prev, impacts: next }))
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800">Wer wäre zuständig?</h3>
                        {impactAndResponsibility.responsibleActors?.length ? (
                          <span className="text-[11px] text-slate-500">
                            {impactAndResponsibility.responsibleActors.length} Vorschläge
                          </span>
                        ) : null}
                      </div>
                      <ResponsibilitySection
                        actors={impactAndResponsibility.responsibleActors ?? []}
                        onChange={(next) =>
                          setImpactAndResponsibility((prev) => ({
                            ...prev,
                            responsibleActors: next,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <ResponsibilityPreviewCard
                    responsibilities={responsibilities}
                    paths={responsibilityPaths}
                    showPathOverlay
                  />
                </div>
              )}

              {viewLevel === 4 && (
                <div className="space-y-3">
                  <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Kontext (Notizen)
                    </summary>
                    {notes.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch keine Notizen vorhanden.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {notes.map((note, idx) => (
                          <li key={note.id ?? `note-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {note.title ?? `Notiz ${idx + 1}`}
                            </p>
                            <p className="text-sm text-slate-800">{note.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>

                  <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Fragen zum Weiterdenken
                    </summary>
                    {questions.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch keine Fragen vorhanden.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {questions.map((q, idx) => (
                          <li key={q.id ?? `q-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {q.label ?? `Frage ${idx + 1}`}
                            </p>
                            <p className="text-sm text-slate-800">{q.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>

                  <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Knoten (Themenschwerpunkte)
                    </summary>
                    {knots.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch keine Knoten vorhanden.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm text-slate-700">
                        {knots.map((k, idx) => (
                          <li key={k.id ?? `k-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {k.title ?? `Knoten ${idx + 1}`}
                            </p>
                            <p className="text-sm text-slate-800">{k.body}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>

                  <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Eventualitäten &amp; Entscheidungsbäume
                    </summary>
                    {eventualities.length === 0 && decisionTrees.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch keine Eventualitäten oder Decision Trees vorhanden.
                      </p>
                    ) : hasScenarioMatrix ? (
                      <div className="mt-3 space-y-3">
                        <EventualitiesPanel
                          statements={statements}
                          decisionTrees={decisionTrees}
                          fallbackNodes={eventualities}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 space-y-3 text-sm text-slate-700">
                        {eventualities.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Eventualitäten</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {eventualities.map((e, idx) => (
                                <li key={e.id ?? `ev-${idx}`}>
                                  {e.narrative || e.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {decisionTrees.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Decision Trees</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {decisionTrees.map((d, idx) => (
                                <li key={d.id ?? `dt-${idx}`}>
                                  Decision Tree für Statement {d.rootStatementId}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </details>

                  <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Folgen &amp; Zuständigkeiten
                    </summary>
                    <div className="mt-3 space-y-3">
                      <ConsequencesPreviewCard
                        consequences={consequences}
                        responsibilities={responsibilities}
                      />
                      <ResponsibilityPreviewCard
                        responsibilities={responsibilities}
                        paths={responsibilityPaths}
                        showPathOverlay
                      />
                    </div>
                  </details>

                  <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Bericht
                    </summary>
                    {report ? (
                      <div className="mt-3 space-y-3 text-sm text-slate-800">
                        {report.summary && <p>{report.summary}</p>}
                        {Array.isArray(report.keyConflicts) && report.keyConflicts.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Konfliktlinien</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {report.keyConflicts.map((c: string, idx: number) => (
                                <li key={`${c}-${idx}`}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {report.facts && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Fakten (lokal)</p>
                              <ul className="mt-1 list-disc space-y-1 pl-4">
                                {(report.facts.local ?? []).map((f: string, idx: number) => (
                                  <li key={`f-l-${idx}`}>{f}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-500">Fakten (international)</p>
                              <ul className="mt-1 list-disc space-y-1 pl-4">
                                {(report.facts.international ?? []).map((f: string, idx: number) => (
                                  <li key={`f-i-${idx}`}>{f}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        {Array.isArray(report.takeaways) && report.takeaways.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Takeaways</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {report.takeaways.map((c: string, idx: number) => (
                                <li key={`t-${idx}`}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Noch kein Bericht vorhanden.
                      </p>
                    )}
                  </details>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showStickyCta && (
        <div className="fixed bottom-4 left-0 right-0 z-30">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Analyse erfolgreich</p>
              <p className="text-xs text-slate-500">
                {statements.length} Statements bereit. Übernimm den Beitrag als Vorschlag oder passe die Claims noch an.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={scrollToStatements}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Weiter bearbeiten
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                className="rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Beitrag als Vorschlag übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type ScenarioOptionKey = "pro" | "neutral" | "contra";
type ScenarioBuckets = Record<ScenarioOptionKey | "other", EventualityNode[]>;

type EventualitiesPanelProps = {
  statements: StatementEntry[];
  decisionTrees: DecisionTree[];
  fallbackNodes: EventualityNode[];
};

const SCENARIO_LABELS: Record<ScenarioOptionKey, string> = {
  pro: "Pro-Szenario",
  neutral: "Neutral",
  contra: "Contra-Szenario",
};

function EventualitiesPanel({ statements, decisionTrees, fallbackNodes }: EventualitiesPanelProps) {
  const treeByStatement = React.useMemo(() => {
    const m = new Map<string, DecisionTree>();
    decisionTrees.forEach((tree) => {
      if (tree?.rootStatementId) {
        m.set(tree.rootStatementId, tree);
      }
    });
    return m;
  }, [decisionTrees]);

  const fallbackByStatement = React.useMemo(() => groupEventualitiesByStatement(fallbackNodes), [fallbackNodes]);

  const relevantStatements = React.useMemo(
    () =>
      statements.filter((statement) => {
        const tree = treeByStatement.get(statement.id);
        const fallback = fallbackByStatement.get(statement.id);
        return Boolean(tree || hasScenarioBuckets(fallback));
      }),
    [statements, treeByStatement, fallbackByStatement],
  );

  if (relevantStatements.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Was-wäre-wenn · Szenario-Matrix</h2>
        <p className="text-[11px] text-slate-500">Pro/Neutral/Contra laut aktueller Analyse</p>
      </div>

      <div className="space-y-4">
        {relevantStatements.map((statement) => (
          <div key={statement.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Statement #{statement.index + 1}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {statement.title?.trim().length ? statement.title : statement.text.slice(0, 96)}
              </div>
            </div>
            <ScenarioGrid
              tree={treeByStatement.get(statement.id)}
              fallback={fallbackByStatement.get(statement.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type ScenarioGridProps = {
  tree?: DecisionTree;
  fallback?: ScenarioBuckets;
};

const SCENARIO_ORDER: ScenarioOptionKey[] = ["pro", "neutral", "contra"];

function ScenarioGrid({ tree, fallback }: ScenarioGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {SCENARIO_ORDER.map((option) => {
        const node = tree?.options?.[option];
        const fallbackNodes = fallback ? fallback[option] : [];
        if (!node && fallbackNodes.length === 0) {
          return (
            <div
              key={option}
              className="rounded-lg border border-dashed border-slate-200 bg-white/40 p-3 text-xs text-slate-400"
            >
              {SCENARIO_LABELS[option]} – noch keine Angaben
            </div>
          );
        }

        return (
          <div key={option} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {SCENARIO_LABELS[option]}
            </div>
            {node && <ScenarioCard node={node} />}
            {fallbackNodes.length > 0 && <FallbackList nodes={fallbackNodes} />}
          </div>
        );
      })}

      {fallback?.other?.length ? (
        <div className="md:col-span-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Weitere Szenarien
          </div>
          <FallbackList nodes={fallback.other} />
        </div>
      ) : null}
    </div>
  );
}

function ScenarioCard({ node }: { node: EventualityNode }) {
  const consequenceSnippets = (node.consequences ?? []).slice(0, 2);
  const responsibilitySnippets = (node.responsibilities ?? []).slice(0, 2);

  return (
    <div className="space-y-2 text-sm text-slate-700">
      <p className="text-slate-800">{node.narrative}</p>
      {consequenceSnippets.length > 0 && (
        <div className="text-[11px] text-slate-500">
          Folgen:
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {consequenceSnippets.map((cons) => (
              <li key={cons.id}>{cons.text}</li>
            ))}
          </ul>
        </div>
      )}
      {responsibilitySnippets.length > 0 && (
        <div className="text-[11px] text-slate-500">
          Zuständigkeiten:
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {responsibilitySnippets.map((resp) => (
              <li key={resp.id}>{resp.actor || resp.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FallbackList({ nodes }: { nodes: EventualityNode[] }) {
  const items = nodes.slice(0, 3);
  return (
    <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-500">
      {items.map((entry) => (
        <li key={entry.id}>{entry.narrative}</li>
      ))}
    </ul>
  );
}

function groupEventualitiesByStatement(nodes: EventualityNode[]): Map<string, ScenarioBuckets> {
  const buckets = new Map<string, ScenarioBuckets>();
  nodes.forEach((node) => {
    if (!node?.statementId) return;
    if (!buckets.has(node.statementId)) {
      buckets.set(node.statementId, {
        pro: [],
        neutral: [],
        contra: [],
        other: [],
      });
    }
    const entry = buckets.get(node.statementId)!;
    const stance = normalizeScenarioKey(node.stance);
    if (stance) entry[stance].push(node);
    else entry.other.push(node);
  });
  return buckets;
}

function normalizeScenarioKey(value?: string | null): ScenarioOptionKey | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "pro" || normalized === "neutral" || normalized === "contra") {
    return normalized as ScenarioOptionKey;
  }
  return null;
}

function hasScenarioBuckets(buckets?: ScenarioBuckets): boolean {
  if (!buckets) return false;
  return (
    buckets.pro.length > 0 ||
    buckets.neutral.length > 0 ||
    buckets.contra.length > 0 ||
    buckets.other.length > 0
  );
}

type ContributionGateProps = {
  variant: "anon" | "blocked";
  overview?: AccountOverview;
};

function ContributionGate({ variant, overview }: ContributionGateProps) {
  const stats = overview?.stats;
  const tier = overview ? getUserAccessTier(overview) : "citizenBasic";
  const tierCfg = overview ? getAccessTierConfigForUser(overview) : null;
  const swipes = stats?.swipeCountTotal ?? 0;
  const credits = stats?.contributionCredits ?? 0;
  const xp = stats?.xp ?? 0;
  const levelLabel = (stats?.engagementLevel ?? "interessiert").toString();
  const nextCreditIn = stats?.nextCreditIn ?? 100;
  const tierLimit = tierCfg?.monthlyContributionLimit ?? 0;
  const tierLimitLabel = tierCfg?.monthlyContributionLimit === null ? "unbegrenzt" : tierLimit;

  const title =
    variant === "anon"
      ? "Registriere dich für deinen ersten E150-Beitrag"
      : "Du brauchst einen Contribution-Credit oder citizenPremium+";
  const description =
    variant === "anon"
      ? "Mit einem kostenlosen citizenBasic-Konto sammelst du XP, swipes und erhältst nach 100 Swipes einen Contribution-Credit (1 Beitrag mit bis zu 3 Statements)."
      : `Freie Pläne erlauben ${tierLimit || 0} Beiträge/Monat. Du hast ${swipes} Swipes gesammelt – dir fehlen noch ${nextCreditIn} bis zum nächsten Credit oder du wechselst auf citizenPremium, citizenPro oder citizenUltra.`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-6 rounded-4xl border border-slate-200 bg-white/95 p-8 shadow-xl">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Citizen Core Journey</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-3 text-base text-slate-600">{description}</p>
          <p className="mt-2 text-sm text-slate-500">
            Beim Abschicken eines Beitrags im Free-Plan wird genau 1 Contribution-Credit verbraucht.
          </p>
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2">
          <StatBox label="Plan" value={tier} hint="citizenPremium+ erlaubt unbegrenzt Contributions" />
          <StatBox label="Contribution-Credits" value={credits} hint="1 Credit = 1 Beitrag mit bis zu 3 Statements" />
          <StatBox label="XP & Level" value={`${xp} XP · ${levelLabel}`} hint="Swipes geben XP & steigern dein Level" />
          <StatBox label="Swipes" value={`${swipes} total`} hint={`Noch ${nextCreditIn} bis zum nächsten Credit`} />
          <StatBox label="Monatslimit" value={tierLimitLabel ?? tierLimit} hint="Beiträge pro Monat laut aktuellem Tier" />
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row">
          <a
            href="/swipe"
            className="flex-1 rounded-full bg-brand-grad px-5 py-3 text-center text-white font-semibold shadow-lg"
          >
            Weiter swipen
          </a>
          <a
            href="/mitglied-werden"
            className="flex-1 rounded-full border border-slate-200 px-5 py-3 text-center font-semibold text-slate-700"
          >
            Mehr erfahren
          </a>
        </div>
      </div>
    </main>
  );
}

function StatBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
