"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HighlightedTextarea } from "@/app/(components)/HighlightedTextarea";
import { normalizeClaim, type NormalizedClaim } from "@/app/(components)/normalizeClaim";
import StatementCard from "@/components/statements/StatementCard";
import AnalyzeProgress from "@/components/contributions/AnalyzeProgress";
import { ImpactSection, ResponsibilitySection } from "@/components/contributions/ImpactResponsibilitySection";
import {
  ConsequencesPreviewCard,
  ResponsibilityPreviewCard,
} from "@features/statement/components/StatementImpactPreview";
import type {
  AnalyzeResult,
  ConsequenceRecord,
  ResponsibilityRecord,
  ResponsibilityPath,
  DecisionTree,
  EventualityNode,
  ImpactAndResponsibility,
} from "@features/analyze/schemas";
import { useLocale } from "@/context/LocaleContext";
import { selectE150Questions } from "@features/e150/questions/catalog";
import { VERIFICATION_REQUIREMENTS, meetsVerificationLevel } from "@features/auth/verificationRules";
import type { VerificationLevel } from "@core/auth/verificationTypes";
import VogVoteButtons, { type VoteValue } from "@features/vote/components/VogVoteButtons";

const MAX_LEVEL1_STATEMENTS = 3;

const TRACE_MODE_META: Record<TraceAttribution["mode"], { label: string; className: string }> = {
  verbatim: { label: "Wörtlich", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  paraphrase: { label: "Paraphrase", className: "bg-sky-50 text-sky-700 ring-sky-100" },
  inference: { label: "Ableitung", className: "bg-amber-50 text-amber-700 ring-amber-100" },
};

const TRACE_COLOR_MAP: Record<TraceAttribution["mode"], string> = {
  verbatim: "bg-sky-100 text-slate-900",
  paraphrase: "bg-amber-100 text-slate-900",
  inference: "bg-rose-100 text-slate-900",
};

const JOURNEY_OPTIONS = [
  {
    id: "concern",
    label: "Nur Anliegen",
    defaultLevel: 1 as 1 | 2 | 3 | 4,
    maxClaims: 3,
    openPanels: {
      notes: false,
      questions: false,
      knots: false,
      eventualities: false,
      consequences: false,
      report: false,
    },
  },
  {
    id: "context",
    label: "Einordnen",
    defaultLevel: 2 as 1 | 2 | 3 | 4,
    maxClaims: 8,
    openPanels: {
      notes: true,
      questions: true,
      knots: false,
      eventualities: false,
      consequences: false,
      report: false,
    },
  },
  {
    id: "connect",
    label: "Verbinden",
    defaultLevel: 3 as 1 | 2 | 3 | 4,
    maxClaims: 12,
    openPanels: {
      notes: true,
      questions: true,
      knots: true,
      eventualities: true,
      consequences: true,
      report: false,
    },
  },
  {
    id: "stay",
    label: "Dranbleiben",
    defaultLevel: 4 as 1 | 2 | 3 | 4,
    maxClaims: 12,
    openPanels: {
      notes: true,
      questions: true,
      knots: true,
      eventualities: true,
      consequences: true,
      report: true,
    },
  },
] as const;

type JourneyId = (typeof JOURNEY_OPTIONS)[number]["id"];
type PanelKey = keyof (typeof JOURNEY_OPTIONS)[number]["openPanels"];

const analyzeButtonTexts = {
  running: "Analyse läuft …",
  retry: "Erneut versuchen",
  start: "Analyse starten",
};

type NoteSection = { id: string; title: string; body: string };

type QuestionCard = {
  id: string;
  label: string;
  category: string;
  body: string;
};

type KnotCard = { id: string; title: string; category: string; body: string };

type TraceAttribution = {
  mode: "verbatim" | "paraphrase" | "inference";
  quotes: string[];
  why: string;
};

type TraceGuidance = {
  concern: string;
  scopeHints: { levels: string[]; why: string };
  istStandChecklist: { society: string[]; media: string[]; politics: string[] };
  proFrames: { frame: string; stakeholders: string[] }[];
  contraFrames: { frame: string; stakeholders: string[] }[];
  alternatives: string[];
  searchQueries: string[];
  sourceTypes: string[];
};

type TraceResult = {
  attribution: Record<string, TraceAttribution>;
  guidance: TraceGuidance | null;
};

type StatementEntry = NormalizedClaim & {
  stance?: "pro" | "contra" | "neutral" | string | null;
  importance?: number | null;
  quality?: {
    precision: number;
    testability: number;
    readability: number;
    balance: number;
  };
  vote?: VoteValue | null;
  locallyEdited?: boolean;
  flagged?: boolean;
};

type AnalyzeStepState = {
  key: "context" | "claims" | "questions" | "consequences" | "responsibility";
  label: string;
  state: "running" | "done" | "empty" | "failed";
  reason?: string | null;
};

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

type AnalyzeWorkspaceProps = {
  mode: "contribution" | "statement";
  defaultLevel?: 1 | 2 | 3 | 4;
  storageKey: string;
  analyzeEndpoint: string;
  saveEndpoint: string;
  finalizeEndpoint: string;
  afterFinalizeNavigateTo?: string;
  verificationLevel?: VerificationLevel;
  verificationStatus?: "loading" | "ok" | "login_required" | "error";
};

const BASE_STEPS: AnalyzeStepState[] = [
  { key: "context", label: "Kontext", state: "empty" },
  { key: "claims", label: "Kernaussagen", state: "empty" },
  { key: "questions", label: "Fragen", state: "empty" },
  { key: "consequences", label: "Wirkung", state: "empty" },
  { key: "responsibility", label: "Zuständigkeit", state: "empty" },
];

type DraftStorage = {
  text?: string;
  draftId?: string | null;
  localDraftId?: string | null;
  savedAt?: string | null;
};

function mapAiNoteToSection(raw: any, idx: number): NoteSection | null {
  if (!raw || typeof raw.text !== "string") return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `note-${idx + 1}`;
  const kind = typeof raw.kind === "string" ? raw.kind : null;

  return {
    id,
    title: kind ? kind.toUpperCase() : `Abschnitt ${idx + 1}`,
    body: raw.text,
  };
}

function mapAiQuestionToCard(raw: any, idx: number): QuestionCard | null {
  if (!raw || typeof raw.text !== "string") return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `q-${idx + 1}`;
  const dimension = typeof raw.dimension === "string" && raw.dimension ? raw.dimension : null;

  return {
    id,
    label: dimension ? dimension.toUpperCase() : "FRAGE",
    category: dimension ?? "",
    body: raw.text,
  };
}

function mapAiKnotToCard(raw: any, idx: number): KnotCard | null {
  if (!raw || typeof raw.description !== "string") return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `k-${idx + 1}`;
  const label = typeof raw.label === "string" && raw.label.trim() ? raw.label : `Knoten ${idx + 1}`;

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

  const meta = raw && typeof raw.meta === "object" && raw.meta !== null ? raw.meta : {};
  const quality = meta && typeof meta === "object" && meta.quality ? (meta.quality as StatementEntry["quality"]) : undefined;

  return {
    ...normalized,
    stance: typeof raw?.stance === "string" ? raw.stance : null,
    importance: typeof raw?.importance === "number" ? raw.importance : null,
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

function buildDraftLabel(draftId?: string | null, localDraftId?: string | null) {
  if (draftId) return draftId;
  if (localDraftId) return `${localDraftId} (lokal)`;
  return "lokal";
}

function formatDateLabel(value?: string | null) {
  if (!value) return "noch nicht gespeichert";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

type QuoteRange = { start: number; end: number; mode: TraceAttribution["mode"] };

function buildQuoteRanges(text: string, quotes: Array<{ quote: string; mode: TraceAttribution["mode"] }>): QuoteRange[] {
  if (!text || quotes.length === 0) return [];
  const lower = text.toLowerCase();
  const ranges: QuoteRange[] = [];

  quotes.forEach(({ quote, mode }) => {
    const trimmed = quote.trim();
    if (!trimmed) return;
    const needle = trimmed.toLowerCase();
    let idx = lower.indexOf(needle);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + trimmed.length, mode });
      idx = lower.indexOf(needle, idx + needle.length);
    }
  });

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: QuoteRange[] = [];
  ranges.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
      return;
    }
    last.end = Math.max(last.end, range.end);
  });

  return merged;
}

function renderHighlightedText(text: string, ranges: QuoteRange[]): React.ReactNode {
  if (!ranges.length) return text;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  ranges.forEach((range, idx) => {
    if (range.start > lastIndex) nodes.push(text.slice(lastIndex, range.start));
    nodes.push(
      <mark
        key={`quote-${range.start}-${range.end}-${idx}`}
        className={`rounded px-0.5 ${TRACE_COLOR_MAP[range.mode]}`}
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    lastIndex = range.end;
  });

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function prepareText(raw: string): { original: string; prepared: string; ratio: number } {
  const original = raw ?? "";
  let prepared = original.replace(/\r\n/g, "\n");
  prepared = prepared.replace(/[ \t]+/g, " ");
  prepared = prepared.replace(/\n{3,}/g, "\n\n").trim();
  const ratio =
    original.length > 0 ? Math.max(0, Math.round(((original.length - prepared.length) / original.length) * 100)) : 0;
  return { original, prepared, ratio };
}

function defaultJourneyForLevel(level?: number): JourneyId {
  if (!level || level <= 1) return "concern";
  if (level === 2) return "context";
  if (level === 3) return "connect";
  return "stay";
}

function hashLocalDraft(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(31, hash) + text.charCodeAt(i);
  }
  const digest = Math.abs(hash >>> 0).toString(36).slice(0, 6);
  return `local-${digest}`;
}

function InlineEditableText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [isEditing, value]);

  if (!isEditing) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
        >
          Statement bearbeiten
        </button>
      </div>
    );
  }

  const save = () => {
    setIsEditing(false);
    if (draft.trim() && draft.trim() !== value) onChange(draft.trim());
  };

  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Änderungen werden beim Speichern übernommen.</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsEditing(false)} className="hover:underline">
            Abbrechen
          </button>
          <button type="button" onClick={save} className="font-semibold text-sky-700 hover:underline">
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnalyzeWorkspace({
  mode,
  defaultLevel = 2,
  storageKey,
  analyzeEndpoint,
  saveEndpoint,
  finalizeEndpoint,
  afterFinalizeNavigateTo,
  verificationLevel,
  verificationStatus,
}: AnalyzeWorkspaceProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const initialJourney = defaultJourneyForLevel(defaultLevel);
  const journeyConfig = JOURNEY_OPTIONS.find((opt) => opt.id === initialJourney) ?? JOURNEY_OPTIONS[0];
  const [journey, setJourney] = React.useState<JourneyId>(journeyConfig.id);
  const [viewLevel, setViewLevel] = React.useState<1 | 2 | 3 | 4>(journeyConfig.defaultLevel);
  const [maxClaims, setMaxClaims] = React.useState<number>(journeyConfig.maxClaims);
  const [openPanels, setOpenPanels] = React.useState<Record<PanelKey, boolean>>(journeyConfig.openPanels);
  const [text, setText] = React.useState("");
  const [textMode, setTextMode] = React.useState<"edit" | "preview">("edit");
  const [showAttributionLayer, setShowAttributionLayer] = React.useState(false);
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
  const [steps, setSteps] = React.useState<AnalyzeStepState[]>(BASE_STEPS);
  const [analysisStatus, setAnalysisStatus] = React.useState<"idle" | "running" | "success" | "empty" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [saveInfo, setSaveInfo] = React.useState<string | null>(null);
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [localDraftId, setLocalDraftId] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isFinalizing, setIsFinalizing] = React.useState(false);
  const [finalizeInfo, setFinalizeInfo] = React.useState<string | null>(null);
  const [finalizeRedirectTo, setFinalizeRedirectTo] = React.useState<string | null>(null);
  const [selectedClaimIds, setSelectedClaimIds] = React.useState<string[]>([]);
  const [hasManualSelection, setHasManualSelection] = React.useState(false);
  const [traceResult, setTraceResult] = React.useState<TraceResult | null>(null);
  const [traceError, setTraceError] = React.useState<string | null>(null);
  const [isTracing, setIsTracing] = React.useState(false);
  const [lastTraceKey, setLastTraceKey] = React.useState<string | null>(null);
  const ctaRef = React.useRef<HTMLDivElement | null>(null);
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);

  const levelStatements = viewLevel === 1 ? statements.slice(0, MAX_LEVEL1_STATEMENTS) : statements;
  const totalStatements = statements.length;
  const prepared = React.useMemo(() => prepareText(text), [text]);
  const preparedText = prepared.prepared;
  const preparedRatio = prepared.ratio;
  const previewText = preparedText || text;

  const traceQuotes = React.useMemo(() => {
    if (!traceResult?.attribution) return [];
    const items: Array<{ quote: string; mode: TraceAttribution["mode"] }> = [];
    Object.values(traceResult.attribution).forEach((entry) => {
      entry.quotes?.forEach((quote) => {
        const trimmed = quote.trim();
        if (trimmed) items.push({ quote: trimmed, mode: entry.mode });
      });
    });
    return items;
  }, [traceResult]);

  const quoteRanges = React.useMemo(() => buildQuoteRanges(previewText, traceQuotes), [previewText, traceQuotes]);

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftStorage;
      if (parsed.text) setText(parsed.text);
      if (parsed.draftId) setDraftId(parsed.draftId);
      if (parsed.localDraftId) setLocalDraftId(parsed.localDraftId);
      if (parsed.savedAt) setSavedAt(parsed.savedAt);
    } catch {
      // ignore
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (!storageKey) return;
    const payload: DraftStorage = {
      text,
      draftId,
      localDraftId,
      savedAt,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [storageKey, text, draftId, localDraftId, savedAt]);

  React.useEffect(() => {
    const ids = statements.map((s) => s.id);
    setSelectedClaimIds((prev) => {
      if (!hasManualSelection) return ids;
      const prevSet = new Set(prev);
      return ids.filter((id) => prevSet.has(id));
    });
  }, [hasManualSelection, statements]);

  const analyzeButtonLabel =
    analysisStatus === "running"
      ? analyzeButtonTexts.running
      : analysisStatus === "error" || analysisStatus === "empty"
      ? analyzeButtonTexts.retry
      : analyzeButtonTexts.start;

  const levelCompletion = React.useMemo(
    () => ({
      1: Boolean(report?.summary || statements.length > 0),
      2: statements.length > 0,
      3: Boolean(
        (impactAndResponsibility.impacts?.length ?? 0) > 0 ||
          (impactAndResponsibility.responsibleActors?.length ?? 0) > 0 ||
          responsibilityPaths.length > 0,
      ),
      4: Boolean(notes.length || questions.length || knots.length || eventualities.length || decisionTrees.length || report),
    }),
    [
      decisionTrees.length,
      eventualities.length,
      impactAndResponsibility.impacts,
      impactAndResponsibility.responsibleActors,
      knots.length,
      notes.length,
      questions.length,
      report,
      responsibilityPaths.length,
      statements.length,
    ],
  );

  const requiredLevel =
    verificationLevel && mode === "contribution"
      ? viewLevel >= 2
        ? VERIFICATION_REQUIREMENTS.contribution_level2
        : VERIFICATION_REQUIREMENTS.contribution_level1
      : null;

  const meetsLevel =
    verificationLevel && requiredLevel
      ? meetsVerificationLevel(verificationLevel, requiredLevel)
      : true;

  const analyzeDisabled =
    analysisStatus === "running" || !preparedText.trim() || verificationStatus === "loading" || !meetsLevel;
  const traceDisabled = isTracing || !preparedText.trim() || statements.length === 0;
  const traceButtonLabel = isTracing
    ? "Herkunft läuft …"
    : traceResult
    ? "Herkunft aktualisieren"
    : "Herkunft anzeigen";
  const guidance = traceResult?.guidance ?? null;

  const gatingMessage =
    verificationStatus === "login_required"
      ? "Bitte melde dich an, um Beiträge zu analysieren."
      : verificationStatus === "error"
      ? "Level konnte nicht geladen werden – bitte später erneut versuchen."
      : !meetsLevel && requiredLevel
      ? `Für diese Ansicht benötigst du mindestens Verifizierungs-Level "${requiredLevel}".`
      : null;

  const handleJourneyChange = (nextId: JourneyId) => {
    const config = JOURNEY_OPTIONS.find((opt) => opt.id === nextId) ?? JOURNEY_OPTIONS[0];
    setJourney(config.id);
    setViewLevel(config.defaultLevel);
    setMaxClaims(config.maxClaims);
    setOpenPanels(config.openPanels);
  };

  const togglePanel = (key: PanelKey, isOpen?: boolean) => {
    setOpenPanels((prev) => ({
      ...prev,
      [key]: typeof isOpen === "boolean" ? isOpen : !prev[key],
    }));
  };

  const saveDraftSnapshot = React.useCallback(async () => {
    if (!preparedText.trim()) {
      setSaveInfo("Bitte zuerst einen Text eingeben.");
      return;
    }

    setIsSaving(true);
    setSaveInfo(null);
    try {
      const payload = {
        draftId,
        text: preparedText || text,
        textOriginal: text,
        textPrepared: preparedText,
        locale,
        source: mode === "statement" ? "statement_new" : "contribution_new",
        analysis: {
          claims: statements,
          notes,
          questions,
          knots,
          consequences,
          responsibilities,
          responsibilityPaths,
          impactAndResponsibility,
          report,
          eventualities,
          decisionTrees,
        },
      };

      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Speichern fehlgeschlagen");
      }
      setDraftId(body.draftId ?? draftId);
      setSavedAt(body.updatedAt ?? new Date().toISOString());
      setSaveInfo("Entwurf gespeichert.");
      return;
    } catch (err: any) {
      const fallbackId = localDraftId ?? hashLocalDraft(text);
      setLocalDraftId(fallbackId);
      setSavedAt(new Date().toISOString());
      setSaveInfo("Server speichern nicht erreichbar – Entwurf lokal gesichert.");
    } finally {
      setIsSaving(false);
    }
  }, [
    decisionTrees,
    draftId,
    eventualities,
    impactAndResponsibility,
    knots,
    locale,
    mode,
    notes,
    preparedText,
    questions,
    report,
    responsibilities,
    responsibilityPaths,
    saveEndpoint,
    statements,
    text,
    consequences,
    localDraftId,
  ]);

  const handleFinalize = React.useCallback(async () => {
    if (!draftId) {
      setFinalizeInfo("Bitte zuerst einen serverseitigen Entwurf speichern.");
      return;
    }
    if (selectedClaimIds.length === 0) {
      setFinalizeInfo("Bitte wähle mindestens ein Statement aus.");
      return;
    }

    setIsFinalizing(true);
    setFinalizeInfo(null);
    try {
      const res = await fetch(finalizeEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId,
          selectedClaimIds,
          source: mode === "statement" ? "statement_new" : "contribution_new",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Einreichen fehlgeschlagen");
      }
      setFinalizeInfo("Erfolgreich eingereicht. Deine Vorschlaege erscheinen jetzt im Swipe-Pool.");
      setFinalizeRedirectTo(body.redirectTo ?? afterFinalizeNavigateTo ?? null);
    } catch (err: any) {
      setFinalizeInfo(err?.message ?? "Einreichen fehlgeschlagen.");
    } finally {
      setIsFinalizing(false);
    }
  }, [afterFinalizeNavigateTo, draftId, finalizeEndpoint, mode, selectedClaimIds]);

  const handleAnalyze = React.useCallback(async () => {
    if (analyzeDisabled) return;
    setError(null);
    setInfo(null);
    setTraceResult(null);
    setTraceError(null);
    setAnalysisStatus("running");
    setSteps(BASE_STEPS.map((s) => ({ ...s, state: "running" })));

    try {
      const res = await fetch(analyzeEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          textOriginal: text,
          preparedText,
          text: preparedText,
          locale,
          maxClaims,
          detailPreset: viewLevel,
          evidenceItems: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || `Analyse fehlgeschlagen (HTTP ${res.status}).`);
      }

      const resultPayload = data.result ?? data;
      if (!resultPayload) throw new Error("Analyse lieferte keine Ergebnisse.");
      const result: AnalyzeResult = resultPayload as AnalyzeResult;

      const rawNotes = Array.isArray((result as any).notes) ? (result as any).notes : [];
      const rawQuestions = Array.isArray((result as any).questions) ? (result as any).questions : [];
      const rawKnots = Array.isArray((result as any).knots) ? (result as any).knots : [];
      const rawClaims = Array.isArray((result as any).claims) ? (result as any).claims : [];

      const mappedNotes = rawNotes.map(mapAiNoteToSection).filter((x): x is NoteSection => x !== null);
      const mappedQuestions = rawQuestions.map(mapAiQuestionToCard).filter((x): x is QuestionCard => x !== null);
      const mappedKnots = rawKnots.map(mapAiKnotToCard).filter((x): x is KnotCard => x !== null);
      const mappedStatements = rawClaims.map(mapAiClaimToStatement).filter((x): x is StatementEntry => x !== null);

      const impactBlock = (result as any)?.impactAndResponsibility;
      const impactAndResponsibilityLocal: ImpactAndResponsibility = {
        impacts: Array.isArray(impactBlock?.impacts) ? impactBlock.impacts : [],
        responsibleActors: Array.isArray(impactBlock?.responsibleActors) ? impactBlock.responsibleActors : [],
      };

      const consequenceBundle = (result as any)?.consequences;
      const mappedConsequences: ConsequenceRecord[] = Array.isArray(consequenceBundle?.consequences)
        ? consequenceBundle.consequences
        : [];
      const mappedResponsibilities: ResponsibilityRecord[] = Array.isArray(consequenceBundle?.responsibilities)
        ? consequenceBundle.responsibilities
        : [];
      const mappedPaths: ResponsibilityPath[] = Array.isArray((result as any)?.responsibilityPaths)
        ? (result as any).responsibilityPaths
        : [];

      const inferredTags = deriveTagsFromAnalysis(mappedStatements, mappedKnots);
      const level = viewLevel >= 2 ? "vertieft" : "basis";
      const catalogQuestions = selectE150Questions(inferredTags, level).map((q) => ({
        id: q.id,
        label: q.tags[0]?.toUpperCase() ?? "FRAGE",
        category: q.tags[0] ?? "",
        body: q.text,
      }));

      const mergedQuestions = dedupeQuestions([...catalogQuestions, ...mappedQuestions]);

      setHasManualSelection(false);
      setNotes(mappedNotes);
      setQuestions(mergedQuestions);
      setKnots(mappedKnots);
      setStatements(mappedStatements);
      setImpactAndResponsibility(impactAndResponsibilityLocal);
      setConsequences(mappedConsequences);
      setResponsibilities(mappedResponsibilities);
      setResponsibilityPaths(mappedPaths);
      setEventualities(Array.isArray(result.eventualities) ? result.eventualities : []);
      setDecisionTrees(Array.isArray(result.decisionTrees) ? result.decisionTrees : []);
      setReport((result as any)?.report ?? null);

      const matrixFromResponse: ProviderMatrixEntry[] = Array.isArray(data?.meta?.providerMatrix)
        ? data.meta.providerMatrix
        : [];
      setProviderMatrix(matrixFromResponse);

      const degraded = Boolean(data?.degraded);
      const degradedReason = degraded ? "KI temporär nicht erreichbar" : null;

      setSteps(
        computeStepStatesFromData({
          notes: mappedNotes,
          statements: mappedStatements,
          questions: mergedQuestions,
          consequences: mappedConsequences,
          responsibilities: mappedResponsibilities,
          impactAndResponsibility: impactAndResponsibilityLocal,
          degradedReason,
        }),
      );

      if (mappedStatements.length === 0) {
        setAnalysisStatus("empty");
        setInfo(
          "Die Analyse konnte aus deinem Beitrag im Moment keine klaren Einzel-Statements ableiten. Du kannst deinen Text leicht anpassen (z.B. kuerzere Saetze) und die Analyse erneut starten.",
        );
      } else {
        setAnalysisStatus("success");
        setInfo(null);
      }
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      setError(msg || "Analyse fehlgeschlagen. Vermutlich gab es ein Problem mit dem KI-Dienst.");
      setInfo("Dein Entwurf bleibt erhalten. Du kannst es nach einem kurzen Moment erneut versuchen.");
      setAnalysisStatus("error");
      setHasManualSelection(false);
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
    }
  }, [analyzeDisabled, analyzeEndpoint, locale, maxClaims, preparedText, text, viewLevel]);

  const handleTrace = React.useCallback(async () => {
    if (isTracing) return;
    const key = `${preparedText}::${statements.map((s) => `${s.id}-${s.text}`).join("|")}`;
    if (lastTraceKey && lastTraceKey === key) return;
    if (!preparedText.trim() || statements.length === 0) return;
    setIsTracing(true);
    setTraceError(null);
    try {
      const res = await fetch("/api/contributions/trace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          textOriginal: text,
          preparedText: preparedText || undefined,
          locale,
          statements: statements.map((s) => ({ id: s.id, text: s.text })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Herkunft konnte nicht ermittelt werden.");
      }
      setTraceResult({
        attribution: body.attribution ?? {},
        guidance: body.guidance ?? null,
      });
      setLastTraceKey(key);
    } catch (err: any) {
      setTraceError(err?.message ?? "Herkunft konnte nicht ermittelt werden.");
    } finally {
      setIsTracing(false);
    }
  }, [isTracing, lastTraceKey, locale, preparedText, statements, text]);

  const toggleSelected = (id: string) => {
    setHasManualSelection(true);
    setSelectedClaimIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRedirect = React.useCallback(() => {
    if (!finalizeRedirectTo) return;
    router.push(finalizeRedirectTo as any);
  }, [finalizeRedirectTo, router]);

  const scrollToNextLevel = () => {
    const order: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
    const currentIndex = order.indexOf(viewLevel);
    const nextIncomplete = order.slice(currentIndex + 1).find((lvl) => !levelCompletion[lvl]);
    const target = nextIncomplete ?? (viewLevel < 4 ? ((viewLevel + 1) as 1 | 2 | 3 | 4) : null);
    if (target) {
      setViewLevel(target);
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div ref={workspaceRef} className="min-h-[calc(100vh-64px)] bg-[linear-gradient(180deg,#e9f6ff_0%,#c0f8ff_45%,#a4fcec_100%)]">
      <div className="container-vog max-w-none px-4 space-y-4 pb-24 pt-6">
        <div className="space-y-2">
          <h1 className="vog-head text-3xl sm:text-4xl">
            {mode === "statement" ? (
              <>
                <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                  Statement
                </span>{" "}
                analysieren
              </>
            ) : (
              <>
                <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                  Beitrag
                </span>{" "}
                analysieren
              </>
            )}
          </h1>
          <p className="text-xs text-slate-600">
            Klare Einordnung, nachvollziehbare Kernaussagen und ein Prüfplan – ohne externe Fakten.
          </p>
        </div>

        <div className="sticky top-0 z-20 -mx-4 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ziel & Detailgrad</span>
              <div className="overflow-x-auto">
                <div className="inline-flex min-w-full gap-2 rounded-full bg-slate-100 p-1 text-[11px]">
                  {JOURNEY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleJourneyChange(opt.id)}
                      className={[
                        "rounded-full px-3 py-1 transition whitespace-nowrap",
                        journey === opt.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Entwurf: <span className="font-semibold text-slate-900">{buildDraftLabel(draftId, localDraftId)}</span>
                </span>
                <span>
                  zuletzt gespeichert: <span className="font-semibold text-slate-900">{formatDateLabel(savedAt)}</span>
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Dein Text</h2>
                  <p className="text-[11px] text-slate-500">
                    Schreibe frei heraus. Die Analyse nutzt deinen Text als Basis fuer Kernaussagen, Fragen und Folgen.
                  </p>
                </div>
                <div className="text-[11px] text-slate-500">
                  Sprache: <span className="font-medium uppercase">{locale}</span>
                </div>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
                  {(["edit", "preview"] as const).map((modeOption) => (
                    <button
                      key={modeOption}
                      type="button"
                      onClick={() => setTextMode(modeOption)}
                      className={[
                        "rounded-full px-3 py-1 transition",
                        textMode === modeOption
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      {modeOption === "edit" ? "Bearbeiten" : "Vorschau"}
                    </button>
                  ))}
                </div>

                {textMode === "preview" && (
                  <label className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={showAttributionLayer}
                      onChange={(event) => setShowAttributionLayer(event.target.checked)}
                      disabled={traceQuotes.length === 0}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 disabled:opacity-50"
                    />
                    Herkunft-Layer
                  </label>
                )}
              </div>

              {textMode === "preview" ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {showAttributionLayer && traceQuotes.length > 0
                    ? renderHighlightedText(previewText, quoteRanges)
                    : previewText}
                </div>
              ) : (
                <HighlightedTextarea value={text} onChange={setText} analyzing={analysisStatus === "running"} rows={12} />
              )}

              <div className="mt-3 flex flex-col items-center gap-2 text-[11px] text-slate-500">
                <span>{text.length} Zeichen</span>
                <span>Aufbereitet: ~{preparedRatio}% kürzer (spart Zeit & Coins)</span>
                <div className="inline-flex gap-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={analyzeDisabled}
                    className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analyzeButtonLabel}
                  </button>
                </div>
                {gatingMessage && <p className="text-xs font-semibold text-rose-600">{gatingMessage}</p>}
              </div>

              {error && (
                <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 space-y-1">
                  <p>{error}</p>
                </div>
              )}
              {saveInfo && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">{saveInfo}</p>
              )}
              {info && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">{info}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <AnalyzeProgress steps={steps} providerMatrix={providerMatrix} />

            <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Einordnung & nächste Schritte</p>
                  <p className="text-[11px] text-slate-500">
                    Vorschläge / Prüfplan – keine recherchierten Fakten.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTrace}
                  disabled={traceDisabled}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {traceButtonLabel}
                </button>
              </div>

              {traceError && (
                <p className="mt-2 text-[11px] font-semibold text-rose-600">{traceError}</p>
              )}

              {!guidance && !traceError && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Erzeuge Herkunftshinweise und einen Prüfplan auf Basis deines Texts.
                </p>
              )}

              {guidance && (
                <div className="mt-3 space-y-3 text-[11px] text-slate-700">
                  {guidance.concern && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Anliegen</p>
                      <p className="mt-1 text-sm text-slate-800">{guidance.concern}</p>
                    </div>
                  )}

                  {guidance.scopeHints && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ebenen</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {guidance.scopeHints.levels?.map((lvl) => (
                          <span key={lvl} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                            {lvl}
                          </span>
                        ))}
                      </div>
                      {guidance.scopeHints.why && (
                        <p className="mt-1 text-[11px] text-slate-600">{guidance.scopeHints.why}</p>
                      )}
                    </div>
                  )}

                  {guidance.istStandChecklist && (
                    <div className="grid gap-3 md:grid-cols-3">
                      {([
                        { key: "society", label: "Gesellschaft" },
                        { key: "media", label: "Medien" },
                        { key: "politics", label: "Politik" },
                      ] as const).map(({ key, label }) => (
                        <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                          <ul className="mt-1 space-y-1">
                            {(guidance.istStandChecklist[key] ?? []).map((item) => (
                              <li key={item} className="text-[11px] text-slate-700">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pro-Frames</p>
                      <ul className="mt-1 space-y-1">
                        {(guidance.proFrames ?? []).map((frame, idx) => (
                          <li key={`${frame.frame}-${idx}`}>
                            <span className="font-semibold text-slate-700">{frame.frame}</span>
                            {frame.stakeholders?.length ? (
                              <span className="text-slate-500"> · {frame.stakeholders.join(", ")}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contra-Frames</p>
                      <ul className="mt-1 space-y-1">
                        {(guidance.contraFrames ?? []).map((frame, idx) => (
                          <li key={`${frame.frame}-${idx}`}>
                            <span className="font-semibold text-slate-700">{frame.frame}</span>
                            {frame.stakeholders?.length ? (
                              <span className="text-slate-500"> · {frame.stakeholders.join(", ")}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {guidance.alternatives?.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Alternativen</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                        {guidance.alternatives.map((alt) => (
                          <li key={alt}>{alt}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {guidance.searchQueries?.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suchbegriffe</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                        {guidance.searchQueries.map((query) => (
                          <li key={query}>{query}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {guidance.sourceTypes?.length ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quellentypen</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {guidance.sourceTypes.map((source) => (
                          <span key={source} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {viewLevel <= 2 && (
              <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                {viewLevel === 1 && (
                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Schnellblick</p>
                    {report?.summary ? (
                      <p className="mt-1 text-sm text-slate-800">{report.summary}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Noch keine Zusammenfassung vorhanden.</p>
                    )}
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {viewLevel === 1 ? "Top-Kernaussagen" : "Alle Kernaussagen"}
                  </h2>
                  <div className="text-[11px] text-slate-500">
                    {totalStatements > 0
                      ? viewLevel === 1
                        ? `${totalStatements} Statements gesamt (Top ${Math.min(MAX_LEVEL1_STATEMENTS, totalStatements)})`
                        : `${totalStatements} Statements zu diesem Beitrag`
                      : "Noch keine Statements – die Analyse muss zuerst erfolgreich durchlaufen."}
                  </div>
                </div>

                <div className="space-y-3">
                  {levelStatements.map((s) => {
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
                    if (typeof s.importance === "number") tags.push(`Wichtigkeit: ${s.importance}/5`);
                    const attribution = traceResult?.attribution?.[s.id] ?? null;
                    const modeMeta = attribution ? TRACE_MODE_META[attribution.mode] : null;

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
                        source="ai"
                        showVoteButtons={false}
                      >
                        <div className="space-y-3">
                          <InlineEditableText
                            value={s.text}
                            onChange={(val) =>
                              setStatements((prev) =>
                                prev.map((entry) => (entry.id === s.id ? { ...entry, text: val } : entry)),
                              )
                            }
                          />
                          {attribution && (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                              <div className="flex flex-wrap items-center gap-2">
                                {modeMeta && (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${modeMeta.className}`}
                                  >
                                    {modeMeta.label}
                                  </span>
                                )}
                                {attribution.why && <span className="text-slate-600">{attribution.why}</span>}
                              </div>
                              {Array.isArray(attribution.quotes) && attribution.quotes.length > 0 && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">
                                    Zitate aus deinem Text
                                  </summary>
                                  <ul className="mt-2 space-y-1 text-[11px] text-slate-700">
                                    {attribution.quotes.map((quote, idx) => (
                                      <li
                                        key={`${s.id}-quote-${idx}`}
                                        className="rounded-lg border border-slate-100 bg-white px-2 py-1"
                                      >
                                        {quote}
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <VogVoteButtons
                              value={s.vote ?? null}
                              size="sm"
                              onChange={(next) =>
                                setStatements((prev) =>
                                  prev.map((entry) => (entry.id === s.id ? { ...entry, vote: next } : entry)),
                                )
                              }
                            />
                            <label className="inline-flex items-center gap-2 text-[11px] text-slate-600">
                              <input
                                type="checkbox"
                                checked={selectedClaimIds.includes(s.id)}
                                onChange={() => toggleSelected(s.id)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600"
                              />
                              In Vorschlag uebernehmen
                            </label>
                          </div>
                        </div>
                      </StatementCard>
                    );
                  })}

                  {!totalStatements && !info && (
                    <p className="text-sm text-slate-500">
                      Noch keine Statements vorhanden. Sie erscheinen nur, wenn die Analyse erfolgreich war.
                    </p>
                  )}
                </div>
              </div>
            )}

            {viewLevel === 3 && (
              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Moegliche Folgen</h3>
                      {impactAndResponsibility.impacts?.length ? (
                        <span className="text-[11px] text-slate-500">{impactAndResponsibility.impacts.length} Vorschlaege</span>
                      ) : null}
                    </div>
                    <ImpactSection
                      impacts={impactAndResponsibility.impacts ?? []}
                      onChange={(next) => setImpactAndResponsibility((prev) => ({ ...prev, impacts: next }))}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Wer waere zustaendig?</h3>
                      {impactAndResponsibility.responsibleActors?.length ? (
                        <span className="text-[11px] text-slate-500">
                          {impactAndResponsibility.responsibleActors.length} Vorschlaege
                        </span>
                      ) : null}
                    </div>
                    <ResponsibilitySection
                      actors={impactAndResponsibility.responsibleActors ?? []}
                      onChange={(next) =>
                        setImpactAndResponsibility((prev) => ({ ...prev, responsibleActors: next }))
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
                <details
                  open={openPanels.notes}
                  onToggle={(event) => togglePanel("notes", (event.target as HTMLDetailsElement).open)}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Kontext (Notizen)</summary>
                  {notes.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Noch keine Notizen vorhanden.</p>
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

                <details
                  open={openPanels.questions}
                  onToggle={(event) => togglePanel("questions", (event.target as HTMLDetailsElement).open)}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Fragen zum Weiterdenken</summary>
                  {questions.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Noch keine Fragen vorhanden.</p>
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

                <details
                  open={openPanels.knots}
                  onToggle={(event) => togglePanel("knots", (event.target as HTMLDetailsElement).open)}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Knoten (Themenschwerpunkte)</summary>
                  {knots.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Noch keine Knoten vorhanden.</p>
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

                <details
                  open={openPanels.eventualities}
                  onToggle={(event) => togglePanel("eventualities", (event.target as HTMLDetailsElement).open)}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                    Eventualitaeten &amp; Entscheidungsbaeume
                  </summary>
                  {eventualities.length === 0 && decisionTrees.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Noch keine Eventualitaeten oder Decision Trees vorhanden.</p>
                  ) : (
                    <div className="mt-2 space-y-3 text-sm text-slate-700">
                      {eventualities.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Eventualitaeten</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {eventualities.map((e, idx) => (
                              <li key={e.id ?? `ev-${idx}`}>{e.narrative || e.label}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {decisionTrees.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Decision Trees</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {decisionTrees.map((d, idx) => (
                              <li key={d.id ?? `dt-${idx}`}>Decision Tree fuer Statement {d.rootStatementId}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </details>

                <details
                  open={openPanels.consequences}
                  onToggle={(event) => togglePanel("consequences", (event.target as HTMLDetailsElement).open)}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Folgen &amp; Zustaendigkeiten</summary>
                  <div className="mt-3 space-y-3">
                    <ConsequencesPreviewCard consequences={consequences} responsibilities={responsibilities} />
                    <ResponsibilityPreviewCard
                      responsibilities={responsibilities}
                      paths={responsibilityPaths}
                      showPathOverlay
                    />
                  </div>
                </details>

                <details
                  open={openPanels.report}
                  onToggle={(event) => togglePanel("report", (event.target as HTMLDetailsElement).open)}
                  className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Bericht</summary>
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
                    <p className="mt-2 text-sm text-slate-500">Noch kein Bericht vorhanden.</p>
                  )}
                </details>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={ctaRef} className="fixed bottom-3 left-0 right-0 z-30 px-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-3 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
          <div className="min-w-[180px]">
            <p className="text-xs font-semibold text-slate-900">
              {selectedClaimIds.length} von {totalStatements} ausgewählt
            </p>
            <p className="text-[11px] text-slate-500">Wähle, welche Statements eingereicht werden.</p>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={saveDraftSnapshot}
              disabled={isSaving || !preparedText.trim()}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={!draftId || isFinalizing}
              className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Einreichen
            </button>
          </div>
        </div>
        {finalizeInfo && (
          <div className="mx-auto mt-2 max-w-3xl rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-100">
            {finalizeInfo}
          </div>
        )}
      </div>
    </div>
  );
}
