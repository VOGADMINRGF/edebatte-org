"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HighlightedTextarea } from "@/app/(components)/HighlightedTextarea";
import { normalizeClaim, type NormalizedClaim } from "@/app/(components)/normalizeClaim";
import { labelDomain } from "@features/analyze/domainLabels";
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
  EditorialAudit,
  EvidenceGraph,
  RunReceipt,
} from "@features/analyze/schemas";
import { useLocale } from "@/context/LocaleContext";
import { selectE150Questions } from "@features/e150/questions/catalog";
import { VERIFICATION_REQUIREMENTS, meetsVerificationLevel } from "@features/auth/verificationRules";
import type { VerificationLevel } from "@core/auth/verificationTypes";
import VogVoteButtons, { type VoteValue } from "@features/vote/components/VogVoteButtons";
import SerpResultsList from "@/features/research/SerpResultsList";
import EditorialAuditPanel from "@/components/analyze/EditorialAuditPanel";
import EvidenceGraphPanel from "@/components/analyze/EvidenceGraphPanel";
import RunReceiptPanel from "@/components/analyze/RunReceiptPanel";
import ContentLanguageSelect from "@/components/ContentLanguageSelect";
import { useContentLang } from "@/lib/i18n/contentLanguage";
import { DEFAULT_BASE_LANG, LANGUAGE_CODES, type LanguageCode } from "@features/i18n/languages";

const MAX_LEVEL1_STATEMENTS = 3;

const TRACE_MODE_STYLE: Record<
  TraceAttribution["mode"],
  { label: string; chipClass: string; markClass: string }
> = {
  verbatim: {
    label: "Wörtlich",
    chipClass: "bg-sky-50 text-sky-700 ring-sky-100",
    markClass: "bg-sky-100 text-slate-900 ring-sky-200/60",
  },
  paraphrase: {
    label: "Paraphrase",
    chipClass: "bg-amber-50 text-amber-700 ring-amber-100",
    markClass: "bg-amber-100 text-slate-900 ring-amber-200/60",
  },
  inference: {
    label: "Ableitung",
    chipClass: "bg-rose-50 text-rose-700 ring-rose-100",
    markClass: "bg-rose-100 text-slate-900 ring-rose-200/60",
  },
};

function TinyPill({
  children,
  className = "ring-slate-200 text-slate-700",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

const FLOW_OPTIONS = [
  {
    id: "express",
    label: "Express",
    description: "Schnell zu Kernaussagen und einer klaren Grundstruktur.",
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
    allowTrace: false,
    allowResearch: false,
  },
  {
    id: "guided",
    label: "Guided",
    description: "Kontext, Fragen und ein Pruefplan als klare Leitplanke.",
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
    allowTrace: true,
    allowResearch: true,
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Tiefe Einordnung, Wirkung, Knoten und fertige Redaktion.",
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
    allowTrace: true,
    allowResearch: true,
  },
] as const;

const ACTION_VERBS = [
  "soll",
  "sollte",
  "muss",
  "fordern",
  "abschaffen",
  "einfuehren",
  "erhoehen",
  "senken",
  "foerdern",
  "verbieten",
  "erlauben",
  "regeln",
  "investieren",
  "ausbauen",
  "reformieren",
  "reduzieren",
  "starken",
  "stutzen",
  "kuerzen",
];

const ACTOR_HINTS = [
  "regierung",
  "bund",
  "land",
  "kommune",
  "stadt",
  "gemeinde",
  "parlament",
  "bundestag",
  "eu",
  "ministerium",
  "behoerde",
  "agentur",
  "unternehmen",
  "verband",
  "buerger",
  "buergerinnen",
];

const TIME_HINTS = [
  "bis",
  "ab",
  "seit",
  "jahr",
  "monat",
  "woche",
  "tag",
  "frist",
  "sofort",
  "heute",
  "morgen",
  "naechst",
  "quartal",
  "halbjahr",
  "202",
  "203",
];

const EVIDENCE_HINTS = [
  "laut",
  "studie",
  "bericht",
  "statistik",
  "daten",
  "quelle",
  "beleg",
  "analyse",
  "umfrage",
  "fakten",
];

const TOPIC_HINTS = [
  { label: "Klima & Energie", keywords: ["klima", "co2", "energie", "strom", "gas", "erneuerbar", "emission"] },
  { label: "Gesundheit & Pflege", keywords: ["gesund", "krankenhaus", "pflege", "medizin", "patient"] },
  { label: "Bildung", keywords: ["schule", "bildung", "uni", "hochschule", "kita", "lehr"] },
  { label: "Wirtschaft", keywords: ["wirtschaft", "unternehmen", "arbeit", "lohn", "steuer", "inflation", "preise", "markt"] },
  { label: "Soziales & Wohnen", keywords: ["rente", "sozial", "wohnung", "miete", "familie", "kind"] },
  { label: "Demokratie & Medien", keywords: ["demokr", "parlament", "wahl", "medien", "presse", "lobby", "transparenz"] },
  { label: "Sicherheit", keywords: ["polizei", "sicherheit", "kriminal", "terror", "verteidigung", "bundeswehr"] },
  { label: "Migration", keywords: ["migration", "flucht", "asyl", "integration", "grenze"] },
  { label: "Digitales", keywords: ["digital", "daten", "ki", "algorithmus", "plattform", "cyber", "it", "online"] },
] as const;

type FlowId = (typeof FLOW_OPTIONS)[number]["id"];
type PanelKey = keyof (typeof FLOW_OPTIONS)[number]["openPanels"];

const analyzeButtonTexts = {
  running: "Analyse läuft …",
  retry: "Erneut versuchen",
  start: "Analyse starten",
};

const SOURCE_HINTS: Record<string, string> = {
  "Amtliche Veröffentlichungen":
    "Gesetze, Verordnungen, Ministerien/Behörden, Amtsblätter, offizielle Mitteilungen.",
  Parlamentsdokumente: "Drucksachen, Protokolle, Ausschussberichte, Anfragen/Antworten.",
  Fachverbände: "Positionspapiere, Stellungnahmen, Studien/Reports von Verbänden.",
  Qualitätspresse: "Einordnung/Chronologie; mehrere Quellen vergleichen; keine 1:1-Übernahme.",
  "Wissenschaftliche Datenbanken": "Peer-reviewed Papers, Preprints, Metastudien; Methodik prüfen.",
};

type NoteSection = { id: string; title: string; body: string };

type QuestionCard = {
  id: string;
  label: string;
  category: string;
  body: string;
};

type KnotCard = { id: string; title: string; category: string; body: string };

type TranslationItem = { key: string; text: string };

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

type ResearchGuidance = {
  focus: string[];
  stakeholders: string[];
  sources: string[];
  queries: string[];
  feeds: string[];
  risks: string[];
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
  tags?: string[];
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
  initialText?: string;
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
  evidenceInput?: string | null;
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
  const tags = buildStatementTags(normalized);

  return {
    ...normalized,
    stance: typeof raw?.stance === "string" ? raw.stance : null,
    importance: typeof raw?.importance === "number" ? raw.importance : null,
    quality,
    tags,
    vote: null,
    locallyEdited: false,
    flagged: false,
  };
}

function buildStatementTags(claim: NormalizedClaim): string[] {
  const tags = new Set<string>();
  if (claim.topic) tags.add(claim.topic);
  if (claim.responsibility) tags.add(claim.responsibility);
  if (Array.isArray(claim.domains)) {
    claim.domains.forEach((d) => {
      if (typeof d === "string" && d.trim()) {
        const lbl = labelDomain(d.trim());
        tags.add(lbl || d.trim());
      }
    });
  } else if (claim.domain && claim.domain.trim()) {
    const lbl = labelDomain(claim.domain.trim());
    tags.add(lbl || claim.domain.trim());
  }
  return Array.from(tags);
}

function deriveTagsFromAnalysis(statements: StatementEntry[], knots: KnotCard[]): string[] {
  const tags = new Set<string>();
  statements.forEach((s) => {
    if (s.topic) tags.add(s.topic.toLowerCase());
    if (s.responsibility) tags.add(s.responsibility.toLowerCase());
    if (Array.isArray(s.domains)) {
      s.domains.forEach((d) => {
        if (typeof d === "string" && d.trim()) tags.add(labelDomain(d.trim()).toLowerCase());
      });
    } else if (s.domain && s.domain.trim()) {
      tags.add(labelDomain(s.domain.trim()).toLowerCase());
    }
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
    return BASE_STEPS.map((s, i) => ({ ...s, state: "failed", reason: i === 0 ? degradedReason : null }));
  }
  if (failedReason) {
    return BASE_STEPS.map((s, i) => ({ ...s, state: "failed", reason: i === 0 ? failedReason : null }));
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

function prepareText(raw: string): { original: string; prepared: string; ratio: number } {
  const original = raw ?? "";
  let prepared = original.replace(/\r\n/g, "\n");
  prepared = prepared.replace(/[ \t]+/g, " ");
  prepared = prepared.replace(/\n{3,}/g, "\n\n").trim();
  const ratio =
    original.length > 0 ? Math.max(0, Math.round(((original.length - prepared.length) / original.length) * 100)) : 0;
  return { original, prepared, ratio };
}

function detectTopics(text: string) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return TOPIC_HINTS.filter((topic) => topic.keywords.some((kw) => lower.includes(kw))).map((topic) => topic.label);
}

function buildCommunityPrompt(params: {
  preparedText: string;
  report: any;
  statements: StatementEntry[];
  questions: QuestionCard[];
}) {
  const questionFromAi = params.questions[0]?.body?.trim();
  if (questionFromAi) return questionFromAi;
  const primaryStatement = params.statements[0]?.text?.trim();
  if (primaryStatement) return `Wie bewertet ihr die Aussage: "${primaryStatement}"?`;
  const summary =
    params.report && typeof params.report.summary === "string" ? params.report.summary.trim() : "";
  if (summary) return `Welche Perspektive fehlt in dieser Einordnung: "${summary}"?`;
  if (params.preparedText.trim()) {
    return "Welche Perspektiven oder Fakten fehlen hier? Wer sollte gehoert werden?";
  }
  return "";
}

function buildArticleDraft(params: {
  preparedText: string;
  report: any;
  statements: StatementEntry[];
  questions: QuestionCard[];
  knots: KnotCard[];
}) {
  const hasReportSummary =
    params.report && typeof params.report.summary === "string" && params.report.summary.trim();
  if (!params.preparedText.trim() && !params.statements.length && !hasReportSummary) {
    return "";
  }
  const lines: string[] = [];
  const headlineCandidate =
    (hasReportSummary ? params.report.summary.trim() : "") ||
    params.statements[0]?.title ||
    params.statements[0]?.text ||
    "Artikel-Entwurf";
  const headline = headlineCandidate.replace(/\s+/g, " ").trim();
  const trimmedHeadline = headline.length > 110 ? `${headline.slice(0, 110).trim()}...` : headline;
  lines.push(`Titel: ${trimmedHeadline}`);
  lines.push("");

  const summary =
    params.report && typeof params.report.summary === "string" && params.report.summary.trim()
      ? params.report.summary.trim()
      : "";
  if (summary) {
    lines.push("Kurzfassung:");
    lines.push(summary);
    lines.push("");
  } else if (params.preparedText.trim()) {
    lines.push("Kurzfassung:");
    lines.push(params.preparedText.trim().slice(0, 240));
    lines.push("");
  }

  if (params.statements.length) {
    lines.push("Kernaussagen:");
    params.statements.slice(0, 5).forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.text}`);
    });
    lines.push("");
  }

  if (params.knots.length) {
    lines.push("Kontext:");
    params.knots.slice(0, 4).forEach((k) => {
      const label = k.title?.trim() || k.body?.trim();
      if (label) lines.push(`- ${label}`);
    });
    lines.push("");
  }

  if (params.questions.length) {
    lines.push("Offene Fragen:");
    params.questions.slice(0, 4).forEach((q) => {
      if (q.body?.trim()) lines.push(`- ${q.body.trim()}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}

function defaultFlowForLevel(level?: number): FlowId {
  if (!level || level <= 1) return "express";
  if (level === 2) return "guided";
  return "editorial";
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
  initialText,
}: AnalyzeWorkspaceProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const { lang: contentLang, setLang: setContentLang } = useContentLang();
  const baseLang = React.useMemo(() => {
    const short = (locale || "").slice(0, 2).toLowerCase();
    return LANGUAGE_CODES.includes(short as LanguageCode) ? (short as LanguageCode) : DEFAULT_BASE_LANG;
  }, [locale]);
  const initialFlow = defaultFlowForLevel(defaultLevel);
  const initialFlowConfig = FLOW_OPTIONS.find((opt) => opt.id === initialFlow) ?? FLOW_OPTIONS[0];
  const [flow, setFlow] = React.useState<FlowId>(initialFlowConfig.id);
  const [viewLevel, setViewLevel] = React.useState<1 | 2 | 3 | 4>(defaultLevel ?? initialFlowConfig.defaultLevel);
  const [maxClaims, setMaxClaims] = React.useState<number>(initialFlowConfig.maxClaims);
  const [openPanels, setOpenPanels] = React.useState<Record<PanelKey, boolean>>(initialFlowConfig.openPanels);
  const [text, setText] = React.useState(initialText ?? "");
  const [evidenceInput, setEvidenceInput] = React.useState("");
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
  const [editorialAudit, setEditorialAudit] = React.useState<EditorialAudit | null>(null);
  const [evidenceGraph, setEvidenceGraph] = React.useState<EvidenceGraph | null>(null);
  const [runReceipt, setRunReceipt] = React.useState<RunReceipt | null>(null);
  const [providerMatrix, setProviderMatrix] = React.useState<ProviderMatrixEntry[]>([]);
  const [steps, setSteps] = React.useState<AnalyzeStepState[]>(BASE_STEPS);
  const [analysisStatus, setAnalysisStatus] = React.useState<"idle" | "running" | "success" | "empty" | "error">("idle");
  const analyzing = analysisStatus === "running";
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
  const [researchGuidance, setResearchGuidance] = React.useState<ResearchGuidance | null>(null);
  const [researchError, setResearchError] = React.useState<string | null>(null);
  const [isResearching, setIsResearching] = React.useState(false);
  const [insightTab, setInsightTab] = React.useState<"input" | "recherche">("input");
  const [researchView, setResearchView] = React.useState<"serp" | "cards">("serp");
  const [translations, setTranslations] = React.useState<Record<string, string>>({});
  const [flowInfo, setFlowInfo] = React.useState<string | null>(null);
  const [communityDraft, setCommunityDraft] = React.useState<string>("");
  const [communityEdited, setCommunityEdited] = React.useState(false);
  const [articleDraft, setArticleDraft] = React.useState<string>("");
  const [articleDraftEdited, setArticleDraftEdited] = React.useState(false);

  const flowConfig = FLOW_OPTIONS.find((opt) => opt.id === flow) ?? FLOW_OPTIONS[0];
  const allowTrace = flowConfig.allowTrace;
  const allowResearch = flowConfig.allowResearch;
  const flowIsLite = !allowTrace && !allowResearch;

  const translationItems = React.useMemo<TranslationItem[]>(() => {
    if (contentLang === baseLang) return [];
    const items: TranslationItem[] = [];
    const seen = new Set<string>();
    const add = (key: string, text: string | null | undefined) => {
      if (items.length >= 120) return;
      if (seen.has(key)) return;
      if (typeof text !== "string") return;
      const trimmed = text.trim();
      if (!trimmed) return;
      seen.add(key);
      items.push({ key, text: trimmed });
    };

    statements.forEach((s, idx) => {
      const key = s.id ?? String(s.index ?? idx);
      add(`statement:${key}:title`, s.title ?? "");
      add(`statement:${key}:text`, s.text);
    });

    notes.forEach((note, idx) => {
      const key = note.id ?? `note-${idx}`;
      add(`note:${key}:title`, note.title);
      add(`note:${key}:body`, note.body);
    });

    questions.forEach((q, idx) => {
      const key = q.id ?? `q-${idx}`;
      add(`question:${key}:label`, q.label);
      add(`question:${key}:body`, q.body);
    });

    knots.forEach((k, idx) => {
      const key = k.id ?? `k-${idx}`;
      add(`knot:${key}:title`, k.title);
      add(`knot:${key}:body`, k.body);
    });

    eventualities.forEach((e, idx) => {
      const key = e.id ?? `ev-${idx}`;
      add(`eventuality:${key}:text`, e.narrative || e.label || "");
    });

    (impactAndResponsibility.impacts ?? []).forEach((impact, idx) => {
      add(`impact:${idx}:type`, impact.type);
      add(`impact:${idx}:desc`, impact.description);
    });

    (impactAndResponsibility.responsibleActors ?? []).forEach((actor, idx) => {
      add(`actor:${idx}:level`, actor.level);
      add(`actor:${idx}:hint`, actor.hint);
    });

    if (report) {
      add("report:summary", report.summary);
      (report.keyConflicts ?? []).forEach((c: string, idx: number) => add(`report:key:${idx}`, c));
      (report?.facts?.local ?? []).forEach((f: string, idx: number) => add(`report:fact:local:${idx}`, f));
      (report?.facts?.international ?? []).forEach((f: string, idx: number) =>
        add(`report:fact:intl:${idx}`, f),
      );
      (report.takeaways ?? []).forEach((t: string, idx: number) => add(`report:takeaway:${idx}`, t));
    }

    return items;
  }, [contentLang, baseLang, statements, notes, questions, knots, eventualities, impactAndResponsibility, report]);

  const translateQueueRef = React.useRef<TranslationItem[]>([]);
  const translatePendingKeysRef = React.useRef(new Set<string>());
  const translateInFlightRef = React.useRef(false);
  const translateAbortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setTranslations({});
    translateQueueRef.current = [];
    translatePendingKeysRef.current.clear();
    translateInFlightRef.current = false;
    translateAbortRef.current?.abort();
  }, [contentLang, baseLang]);

  React.useEffect(() => {
    if (contentLang === baseLang) return;
    if (!translationItems.length) return;

    const missing = translationItems.filter((item) => !translations[item.key]);
    if (!missing.length) return;

    for (const item of missing) {
      if (!translatePendingKeysRef.current.has(item.key)) {
        translatePendingKeysRef.current.add(item.key);
        translateQueueRef.current.push(item);
      }
    }

    if (translateInFlightRef.current) return;
    translateInFlightRef.current = true;
    let cancelled = false;

    const runQueue = async () => {
      while (translateQueueRef.current.length && !cancelled) {
        const batch = translateQueueRef.current.splice(0, 40);
        if (!batch.length) continue;
        const ctrl = new AbortController();
        translateAbortRef.current = ctrl;

        const res = await fetch("/api/i18n/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            srcLang: baseLang,
            tgtLang: contentLang,
            items: batch,
          }),
          signal: ctrl.signal,
        }).catch(() => null);

        if (cancelled) return;

        if (!res || !res.ok) {
          batch.forEach((item) => translatePendingKeysRef.current.delete(item.key));
          continue;
        }
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const mapped = data?.translations ?? null;
        if (!mapped || typeof mapped !== "object") {
          batch.forEach((item) => translatePendingKeysRef.current.delete(item.key));
          continue;
        }
        setTranslations((prev) => ({ ...prev, ...mapped }));
        batch.forEach((item) => translatePendingKeysRef.current.delete(item.key));
      }
    };

    runQueue()
      .catch(() => {
        // ignore
      })
      .finally(() => {
        translateInFlightRef.current = false;
      });

    return () => {
      cancelled = true;
      translateAbortRef.current?.abort();
    };
  }, [contentLang, baseLang, translationItems, translations]);

  const translateText = React.useCallback(
    (key: string, fallback: string | null | undefined) => {
      if (typeof fallback !== "string") return fallback ?? "";
      if (contentLang === baseLang) return fallback;
      const translated = translations[key];
      return translated && translated.trim() ? translated : fallback;
    },
    [contentLang, baseLang, translations],
  );

  const displayImpacts = React.useMemo(() => {
    const impacts = impactAndResponsibility.impacts ?? [];
    if (contentLang === baseLang) return impacts;
    return impacts.map((impact, idx) => ({
      ...impact,
      type: translateText(`impact:${idx}:type`, impact.type),
      description: translateText(`impact:${idx}:desc`, impact.description),
    }));
  }, [contentLang, baseLang, impactAndResponsibility.impacts, translateText]);

  const displayResponsibleActors = React.useMemo(() => {
    const actors = impactAndResponsibility.responsibleActors ?? [];
    if (contentLang === baseLang) return actors;
    return actors.map((actor, idx) => ({
      ...actor,
      level: translateText(`actor:${idx}:level`, actor.level),
      hint: translateText(`actor:${idx}:hint`, actor.hint),
    }));
  }, [contentLang, baseLang, impactAndResponsibility.responsibleActors, translateText]);

  // --- Patch C: single-flight + abort + dedupe + debounce ---
  const mountedRef = React.useRef(true);

  const analyzeCtrlRef = React.useRef<AbortController | null>(null);
  const analyzeKeyRef = React.useRef<string | null>(null);
  const analyzeRunRef = React.useRef(0);

  const traceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const traceCtrlRef = React.useRef<AbortController | null>(null);
  const traceKeyRef = React.useRef<string | null>(null);
  const traceRunRef = React.useRef(0);
  const researchCtrlRef = React.useRef<AbortController | null>(null);
  const researchKeyRef = React.useRef<string | null>(null);
  const researchRunRef = React.useRef(0);
  const ctaRef = React.useRef<HTMLDivElement | null>(null);
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);
  const communityRef = React.useRef<HTMLDivElement | null>(null);
  const articleRef = React.useRef<HTMLDivElement | null>(null);
  function makeKey(
    preparedTextValue: string,
    statementList: Array<{ id?: string; text?: string }>,
    extra?: Record<string, unknown>,
  ) {
    const ids = (statementList ?? []).map((s) => s.id ?? "").join(",");
    return JSON.stringify({
      t: (preparedTextValue ?? "").trim(),
      ids,
      n: statementList?.length ?? 0,
      ...extra,
    });
  }

  const levelStatements = viewLevel === 1 ? statements.slice(0, MAX_LEVEL1_STATEMENTS) : statements;
  const totalStatements = statements.length;
  const prepared = React.useMemo(() => prepareText(text), [text]);
  const preparedText = prepared.prepared;
  const preparedRatio = prepared.ratio;
  const liveFeedback = React.useMemo(() => {
    const trimmed = preparedText.trim();
    const lower = trimmed.toLowerCase();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed ? trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length : 0;
    const avgWordsPerSentence = sentences > 0 ? Math.round(words / sentences) : words;
    const actionHits = ACTION_VERBS.filter((verb) => lower.includes(verb));
    const actorHits = ACTOR_HINTS.filter((actor) => lower.includes(actor));
    const timeHits = TIME_HINTS.filter((hint) => lower.includes(hint));
    const evidenceHits = EVIDENCE_HINTS.filter((hint) => lower.includes(hint));
    const hasNumber = /\d/.test(trimmed);
    const hasQuestion = /\?/.test(trimmed);
    const topics = detectTopics(trimmed);
    let score = 35;
    if (sentences >= 2) score += 10;
    if (sentences >= 4) score += 5;
    if (actionHits.length) score += 15;
    if (actorHits.length) score += 10;
    if (hasNumber) score += 8;
    if (timeHits.length) score += 6;
    if (evidenceHits.length) score += 6;
    if (hasQuestion) score += 4;
    if (avgWordsPerSentence > 28) score -= 8;
    if (avgWordsPerSentence > 38) score -= 8;
    if (words > 280) score -= 6;
    if (words < 14) score -= 8;
    score = Math.max(20, Math.min(100, score));
    const missingSignals: string[] = [];
    if (!actionHits.length) missingSignals.push("konkrete Forderung/Verb");
    if (!actorHits.length) missingSignals.push("klarer Akteur");
    if (!hasNumber) missingSignals.push("Zahl/Bezug");
    if (!timeHits.length) missingSignals.push("Zeitbezug");
    if (!evidenceHits.length) missingSignals.push("Quelle/Beleg");
    let lengthHint = "";
    if (words > 320) lengthHint = "Sehr lang – evtl. kuerzen oder in Abschnitte teilen.";
    else if (words > 200) lengthHint = "Lang – evtl. auf das Wichtigste fokussieren.";
    else if (words < 20 && trimmed) lengthHint = "Kurz – mit 1-2 Saetzen Kontext ergaenzen.";
    return {
      trimmed,
      words,
      sentences,
      avgWordsPerSentence,
      actionHits,
      actorHits,
      timeHits,
      evidenceHits,
      hasNumber,
      hasQuestion,
      topics,
      score,
      missingSignals,
      lengthHint,
    };
  }, [preparedText]);
  const coach = React.useMemo(() => {
    if (!liveFeedback.trimmed) {
      return {
        title: "Starte mit 2-4 Saetzen.",
        body: "Sag kurz, was dich stoert oder was sich aendern soll. Dann koennen wir es sauber strukturieren.",
        tips: ["Wer soll handeln?", "Was genau soll passieren?", "Warum ist es wichtig?"],
      };
    }
    if (analysisStatus === "running") {
      return {
        title: "Analyse laeuft …",
        body: "Ich baue Kernaussagen, Fragen und Wirkung auf. Kurz warten.",
        tips: ["Wenn du Quellen hast, kannst du sie im Pruefplan speichern."],
      };
    }
    if (analysisStatus === "error") {
      return {
        title: "Analyse gestoppt.",
        body: "Dein Text bleibt erhalten. Versuche es kurz, klar, ohne lange Schachtelsaetze.",
        tips: ["Saetze kuerzen", "Eine Aussage pro Satz", "Optional auf Guided wechseln"],
      };
    }
    if (analysisStatus === "empty") {
      return {
        title: "Noch keine Kernaussagen.",
        body: "Formuliere klarere Einzel-Statements, dann klappt die Ableitung besser.",
        tips: ["Aktiv-Verb nutzen", "Akteur benennen", "Zeitrahmen ergaenzen"],
      };
    }
    if (analysisStatus === "success" && statements.length > 0) {
      const suggestion = liveFeedback.missingSignals.slice(0, 2).map((m) => `Ergaenze ${m}.`);
      const baseTips = suggestion.length
        ? suggestion
        : ["Waehle die besten Statements aus.", "Nutze den Pruefplan fuer Quellen."];
      return {
        title: "Bereit fuer den naechsten Schritt.",
        body: `Du hast ${statements.length} Statements. Entscheide: schnell einreichen oder redaktionell vertiefen.`,
        tips: baseTips.slice(0, 3),
      };
    }
    return {
      title: "Bereit fuer die Analyse.",
      body: "Starte die Analyse, um Kernaussagen und den Flow aufzubauen.",
      tips: ["Kernaussage + Kontext reichen fuer den Start."],
    };
  }, [analysisStatus, liveFeedback.missingSignals, liveFeedback.trimmed, statements.length]);

  const progressPlacement = <AnalyzeProgress steps={steps} providerMatrix={providerMatrix} compact />;

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        if (initialText) setText(initialText);
        return;
      }
      const parsed = JSON.parse(raw) as DraftStorage;
      if (parsed.text) {
        setText(parsed.text);
      } else if (initialText) {
        setText(initialText);
      }
      if (parsed.evidenceInput) setEvidenceInput(parsed.evidenceInput);
      if (parsed.draftId) setDraftId(parsed.draftId);
      if (parsed.localDraftId) setLocalDraftId(parsed.localDraftId);
      if (parsed.savedAt) setSavedAt(parsed.savedAt);
    } catch {
      // ignore
    }
  }, [storageKey, initialText]);

  React.useEffect(() => {
    try {
      const view = window.localStorage.getItem("researchView");
      if (view === "serp" || view === "cards") setResearchView(view);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      analyzeCtrlRef.current?.abort();
      traceCtrlRef.current?.abort();
      researchCtrlRef.current?.abort();
      if (traceTimerRef.current) clearTimeout(traceTimerRef.current);
    };
  }, []);

  // RunReceipt persistence happens server-side in the analyze route.

  React.useEffect(() => {
    if (!storageKey) return;
    const payload: DraftStorage = {
      text,
      draftId,
      localDraftId,
      savedAt,
      evidenceInput,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [storageKey, text, draftId, localDraftId, savedAt, evidenceInput]);

  // Persist UI prefs for research view
  React.useEffect(() => {
    try {
      window.localStorage.setItem("researchView", researchView);
    } catch {
      // ignore
    }
  }, [researchView]);

  React.useEffect(() => {
    if (!flowInfo) return;
    const timer = window.setTimeout(() => setFlowInfo(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flowInfo]);

  React.useEffect(() => {
    if (communityEdited) return;
    const next = buildCommunityPrompt({
      preparedText,
      report,
      statements,
      questions,
    });
    setCommunityDraft(next);
  }, [communityEdited, preparedText, report, statements, questions]);

  React.useEffect(() => {
    if (articleDraftEdited) return;
    const next = buildArticleDraft({
      preparedText,
      report,
      statements,
      questions,
      knots,
    });
    setArticleDraft(next);
  }, [articleDraftEdited, preparedText, report, statements, questions, knots]);

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
  const traceDisabled =
    insightTab === "input"
      ? !allowTrace || isTracing || isResearching || !preparedText.trim() || statements.length === 0
      : !allowResearch || isResearching || isTracing || !preparedText.trim();
  const traceButtonLabel =
    insightTab === "input"
      ? isTracing
        ? "Herkunft läuft …"
        : traceResult
        ? "Herkunft aktualisieren"
        : "Herkunft anzeigen"
      : isResearching
      ? "Prüfplan läuft …"
      : researchGuidance
      ? "Prüfplan aktualisieren"
      : "Prüfplan anzeigen";
  const guidance = traceResult?.guidance ?? null;
  const guidanceError = insightTab === "input" ? traceError : researchError;
  const hasGuidance = insightTab === "input" ? Boolean(guidance) : Boolean(researchGuidance);
  const hasResearchSources = Boolean(researchGuidance?.sources && researchGuidance.sources.length > 0);

  const gatingMessage =
    verificationStatus === "login_required"
      ? "Bitte melde dich an, um Beiträge zu analysieren."
      : verificationStatus === "error"
      ? "Level konnte nicht geladen werden – bitte später erneut versuchen."
      : !meetsLevel && requiredLevel
      ? `Für diese Ansicht benötigst du mindestens Verifizierungs-Level "${requiredLevel}".`
      : null;

  const handleFlowChange = (nextId: FlowId) => {
    const config = FLOW_OPTIONS.find((opt) => opt.id === nextId) ?? FLOW_OPTIONS[0];
    setFlow(config.id);
    setViewLevel(config.defaultLevel);
    setMaxClaims(config.maxClaims);
    setOpenPanels(config.openPanels);
    if (!config.allowTrace && !config.allowResearch) {
      setInsightTab("input");
      setTraceResult(null);
      setTraceError(null);
      setResearchGuidance(null);
      setResearchError(null);
      setEvidenceInput("");
    }
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
      const saveUrl = saveEndpoint || "/api/drafts/save";
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

      const res = await fetch(saveUrl, {
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
      const msg = err?.message ?? "";
      const isNetwork =
        msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("timeout");

      if (isNetwork) {
        const fallbackId = localDraftId ?? hashLocalDraft(text);
        setLocalDraftId(fallbackId);
        setSavedAt(new Date().toISOString());
        setSaveInfo("Server nicht erreichbar – Entwurf lokal gesichert.");
      } else {
        setSaveInfo(msg || "Speichern fehlgeschlagen.");
      }
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

  const fetchResearchGuidance = React.useCallback(
    async (claimsOverride?: Array<{ id?: string; text?: string; domain?: string | null; domains?: string[] | null }>) => {
      if (!allowResearch) {
        setResearchGuidance(null);
        setResearchError(null);
        return;
      }
      const claimsSource = claimsOverride ?? statements;
      const key = makeKey(preparedText, claimsSource, { mode: "research", locale });

      if (researchCtrlRef.current && researchKeyRef.current === key) return;

      researchCtrlRef.current?.abort();
      const ctrl = new AbortController();
      researchCtrlRef.current = ctrl;
      researchKeyRef.current = key;
      const myRun = ++researchRunRef.current;

      try {
        if (!preparedText.trim()) {
          setResearchGuidance(null);
          setResearchError(null);
          return;
        }

        setIsResearching(true);
        setResearchError(null);
        // Research-Fallback ist eigenständig: wir wollen hier keine Trace-Reste anzeigen.
        setTraceResult(null);
        setTraceError(null);

        const claims = (claimsSource ?? []).map((s) => ({
          id: s.id,
          text: s.text,
          domain: (s as any)?.domain ?? null,
          domains: Array.isArray((s as any)?.domains) ? (s as any).domains : null,
        }));

        const res = await fetch("/api/contributions/research", {
          method: "POST",
          signal: ctrl.signal,
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, claims }),
        });
        const body = await res.json().catch(() => ({}));

        if (!mountedRef.current || myRun !== researchRunRef.current) return;

        if (!res.ok || !body?.ok) {
          setResearchError(body?.message || body?.error || "Prüfplan konnte nicht erzeugt werden.");
          setResearchGuidance(null);
          return;
        }

        setResearchGuidance((body?.guidance ?? null) as ResearchGuidance | null);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!mountedRef.current || myRun !== researchRunRef.current) return;
        setResearchError(err?.message ?? "Prüfplan konnte nicht erzeugt werden.");
        setResearchGuidance(null);
      } finally {
        if (mountedRef.current && myRun === researchRunRef.current) {
          researchCtrlRef.current = null;
          setIsResearching(false);
        }
      }
    },
    [allowResearch, locale, preparedText, statements],
  );

  const handleAnalyze = React.useCallback(async () => {
    if (analyzeDisabled) return;
    const effectiveEvidenceInput = allowResearch ? evidenceInput.trim() : "";
    const key = makeKey(preparedText, statements, {
      maxClaims,
      detailLevel: viewLevel,
      locale,
      evidence: effectiveEvidenceInput,
    });
    if (analyzeCtrlRef.current && analyzeKeyRef.current === key) return;
    analyzeCtrlRef.current?.abort();
    const ctrl = new AbortController();
    analyzeCtrlRef.current = ctrl;
    analyzeKeyRef.current = key;
    const myRun = ++analyzeRunRef.current;
    setError(null);
    setInfo(null);
    setTraceResult(null);
    setTraceError(null);
    setResearchGuidance(null);
    setResearchError(null);
    setEditorialAudit(null);
    setEvidenceGraph(null);
    setRunReceipt(null);
    setAnalysisStatus("running");
    setSteps(BASE_STEPS.map((s) => ({ ...s, state: "running" })));

    try {
      const evidenceItems = effectiveEvidenceInput
        ? effectiveEvidenceInput
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

      const res = await fetch(analyzeEndpoint, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          textOriginal: text,
          preparedText,
          text: preparedText,
          locale,
          maxClaims,
          detailPreset: viewLevel,
          evidenceItems,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!mountedRef.current || myRun !== analyzeRunRef.current) return;
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
      setEditorialAudit((result as any)?.editorialAudit ?? null);
      setEvidenceGraph((result as any)?.evidenceGraph ?? null);
      setRunReceipt((result as any)?.runReceipt ?? null);

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

      if (degraded) {
        setInsightTab(allowResearch ? "recherche" : "input");
        setAnalysisStatus("error");
        setError("KI temporär nicht erreichbar.");
        setInfo("Dein Entwurf bleibt erhalten. Bitte später erneut versuchen oder Provider/Keys prüfen.");
        if (allowResearch) {
          void fetchResearchGuidance(mappedStatements);
        }
      } else if (mappedStatements.length === 0) {
        setInsightTab(allowResearch ? "recherche" : "input");
        setAnalysisStatus("empty");
        setInfo(
          "Die Analyse konnte aus deinem Beitrag im Moment keine klaren Einzel-Statements ableiten. Du kannst deinen Text leicht anpassen (z.B. kuerzere Saetze) und die Analyse erneut starten.",
        );
        if (allowResearch) {
          void fetchResearchGuidance(mappedStatements);
        }
      } else {
        setInsightTab("input");
        setAnalysisStatus("success");
        setInfo(null);
        setError(null);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (!mountedRef.current || myRun !== analyzeRunRef.current) return;
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
      setEditorialAudit(null);
      setEvidenceGraph(null);
      setRunReceipt(null);
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
      if (allowResearch) {
        void fetchResearchGuidance([]);
      }
    } finally {
      if (mountedRef.current && myRun === analyzeRunRef.current) {
        analyzeCtrlRef.current = null;
        analyzeKeyRef.current = null;
      }
    }
  }, [
    analyzeDisabled,
    analyzeEndpoint,
    allowResearch,
    evidenceInput,
    fetchResearchGuidance,
    locale,
    maxClaims,
    preparedText,
    statements,
    text,
    viewLevel,
  ]);

  const scheduleTrace = React.useCallback(() => {
    const key = makeKey(preparedText, statements, { mode: "trace", locale });

    if (traceTimerRef.current) clearTimeout(traceTimerRef.current);

    traceTimerRef.current = setTimeout(async () => {
      if (traceCtrlRef.current && traceKeyRef.current === key) return;

      traceCtrlRef.current?.abort();
      researchCtrlRef.current?.abort();
      const ctrl = new AbortController();
      traceCtrlRef.current = ctrl;
      traceKeyRef.current = key;
      const myRun = ++traceRunRef.current;

      try {
        if (!preparedText.trim() || statements.length === 0) {
          setTraceResult(null);
          setTraceError(null);
          return;
        }
        setIsTracing(true);
        setTraceError(null);
        setResearchGuidance(null);
        setResearchError(null);
        const res = await fetch("/api/contributions/trace", {
          method: "POST",
          signal: ctrl.signal,
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            textOriginal: text,
            preparedText: preparedText || undefined,
            locale,
            statements: statements.map((s) => ({ id: s.id, text: s.text })),
          }),
        });
        const body = await res.json().catch(() => ({}));

        if (!mountedRef.current || myRun !== traceRunRef.current) return;

        if (!res.ok || !body?.ok) {
          setTraceError(body?.error || "Herkunft konnte nicht ermittelt werden.");
          setTraceResult(null);
          return;
        }
        setTraceResult({
          attribution: body.attribution ?? {},
          guidance: body.guidance ?? null,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!mountedRef.current || myRun !== traceRunRef.current) return;
        setTraceError(err?.message ?? "Herkunft konnte nicht ermittelt werden.");
        setTraceResult(null);
      } finally {
        if (mountedRef.current && myRun === traceRunRef.current) {
          traceCtrlRef.current = null;
          setIsTracing(false);
        }
      }
    }, 250);
  }, [locale, preparedText, statements, text]);

  React.useEffect(() => {
    if (!allowTrace) {
      setTraceResult(null);
      setTraceError(null);
      return;
    }
    if (!preparedText?.trim() || statements.length === 0) {
      setTraceResult(null);
      setTraceError(null);
      setResearchGuidance(null);
      setResearchError(null);
      return;
    }
    if (insightTab !== "input") return;
    scheduleTrace();
  }, [allowTrace, insightTab, preparedText, scheduleTrace, statements]);

  const handleTrace = React.useCallback(() => {
    if (insightTab === "recherche") {
      if (!allowResearch) {
        setFlowInfo("Pruefplan ist im Express-Modus deaktiviert.");
        return;
      }
      fetchResearchGuidance();
      return;
    }
    if (!allowTrace) {
      setFlowInfo("Herkunft ist im Express-Modus deaktiviert.");
      return;
    }
    if (statements.length > 0) {
      scheduleTrace();
      return;
    }
    setInsightTab("recherche");
    fetchResearchGuidance();
  }, [allowResearch, allowTrace, fetchResearchGuidance, insightTab, scheduleTrace, statements.length]);

  const handleCopy = React.useCallback(async (value: string, label: string) => {
    if (!value.trim()) {
      setFlowInfo("Nichts zum Kopieren.");
      return;
    }
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(value);
      setFlowInfo(`${label} kopiert.`);
    } catch {
      setFlowInfo("Kopieren nicht moeglich.");
    }
  }, []);

  const handleRegenerateCommunity = React.useCallback(() => {
    const next = buildCommunityPrompt({
      preparedText,
      report,
      statements,
      questions,
    });
    setCommunityDraft(next);
    setCommunityEdited(false);
    setFlowInfo("Community-Frage aktualisiert.");
  }, [preparedText, questions, report, statements]);

  const handleRegenerateArticle = React.useCallback(() => {
    const next = buildArticleDraft({
      preparedText,
      report,
      statements,
      questions,
      knots,
    });
    setArticleDraft(next);
    setArticleDraftEdited(false);
    setFlowInfo("Artikel-Entwurf aktualisiert.");
  }, [knots, preparedText, questions, report, statements]);

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

  const scrollToCommunity = () => {
    communityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToArticle = () => {
    articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={workspaceRef} className="min-h-[calc(100vh-64px)] bg-[linear-gradient(180deg,#e9f6ff_0%,#c0f8ff_45%,#a4fcec_100%)]">
      <div className={["container-vog max-w-none px-4 space-y-4 pt-6", totalStatements > 0 ? "pb-40" : "pb-24"].join(" ")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
              {flowIsLite
                ? "Express: schnelle Kernaussagen, ohne Pruefplan oder externe Fakten."
                : `${flowConfig.label}: ${flowConfig.description} Keine externen Fakten.`}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-[11px] text-slate-500 sm:items-end">
            <span>
              UI: <span className="font-medium uppercase">{locale || "-"}</span>
            </span>
            <ContentLanguageSelect value={contentLang} onChange={setContentLang} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm ring-1 ring-white/40 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Flow</div>
              <div className="text-[11px] text-slate-600">Waehle Tempo, Tiefe und Output.</div>
            </div>

            <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
              Level {viewLevel}/4
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {FLOW_OPTIONS.map((opt) => {
              const active = flow === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleFlowChange(opt.id)}
                  className={[
                    "rounded-2xl border px-3 py-2 text-left transition",
                    active
                      ? "border-sky-200 bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10"
                      : "border-slate-200 bg-white/80 hover:border-slate-300",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    {active ? (
                      <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        aktiv
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">{opt.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">Level {opt.defaultLevel}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">max {opt.maxClaims}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {opt.allowResearch ? "Pruefplan an" : "Pruefplan aus"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span className="inline-flex rounded-full bg-white/70 px-2 py-1 ring-1 ring-inset ring-slate-200">
              {flowConfig.label}
            </span>
            <span className="inline-flex rounded-full bg-white/70 px-2 py-1 ring-1 ring-inset ring-slate-200">
              max. {maxClaims} Kernaussagen
            </span>
            <span className="inline-flex rounded-full bg-white/70 px-2 py-1 ring-1 ring-inset ring-slate-200">
              {allowResearch ? "Pruefplan aktiv" : "Pruefplan aus"}
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-5">
          {flowIsLite ? (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Express-Flow</div>
              <p className="mt-1 text-sm text-slate-700">
                Max. {maxClaims} Kernaussagen. Schnell, ohne Pruefplan oder externe Fakten.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fortschritt</span>
                <span className="text-[10px] text-slate-500">
                  Kontext · Kernaussagen · Fragen · Wirkung · Zustaendigkeit
                </span>
              </div>
              <div className="w-full">{progressPlacement}</div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Dein Text</h2>
                <p className="text-[11px] text-slate-500">
                  {flowIsLite
                    ? "Kurz und klar. Wir nutzen nur deinen Text."
                    : "Dieser Text bildet die Basis fuer Kernaussagen, Fragen und Wirkung."}
                </p>
              </div>
            </div>

            <HighlightedTextarea
              value={text}
              onChange={setText}
              analyzing={analysisStatus === "running"}
              rows={14}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Echtzeit-Feedback</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Score {liveFeedback.score}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
                    style={{ width: `${liveFeedback.score}%` }}
                  />
                </div>

                {!liveFeedback.trimmed ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Schreibe ein paar Saetze, dann analysiere ich Klarheit, Akteure und Kontext.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span>{liveFeedback.words} Woerter</span>
                      <span>{liveFeedback.sentences} Saetze</span>
                      <span>Durchschnitt {liveFeedback.avgWordsPerSentence} Woerter/Satz</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                      <TinyPill
                        className={
                          liveFeedback.actionHits.length
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }
                      >
                        Verb
                      </TinyPill>
                      <TinyPill
                        className={
                          liveFeedback.actorHits.length
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }
                      >
                        Akteur
                      </TinyPill>
                      <TinyPill
                        className={
                          liveFeedback.hasNumber
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }
                      >
                        Zahl
                      </TinyPill>
                      <TinyPill
                        className={
                          liveFeedback.timeHits.length
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }
                      >
                        Zeit
                      </TinyPill>
                      <TinyPill
                        className={
                          liveFeedback.evidenceHits.length
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }
                      >
                        Beleg
                      </TinyPill>
                      <TinyPill
                        className={
                          liveFeedback.hasQuestion
                            ? "bg-amber-50 text-amber-700 ring-amber-100"
                            : "bg-slate-100 text-slate-500 ring-slate-200"
                        }
                      >
                        Frage
                      </TinyPill>
                    </div>

                    {liveFeedback.topics.length ? (
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                        {liveFeedback.topics.map((topic) => (
                          <TinyPill key={topic} className="bg-sky-50 text-sky-700 ring-sky-100">
                            {topic}
                          </TinyPill>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-500">Noch kein klares Thema erkannt.</p>
                    )}

                    {liveFeedback.missingSignals.length ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Fehlt evtl.: {liveFeedback.missingSignals.slice(0, 3).join(", ")}.
                      </p>
                    ) : null}
                    {liveFeedback.lengthHint ? (
                      <p className="mt-2 text-[11px] text-slate-500">{liveFeedback.lengthHint}</p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                    EDB
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Flow Coach</p>
                    <p className="text-[11px] text-slate-500">Guided durch Schnellstart, Deep-Dive &amp; Redaktion.</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                  <p className="font-semibold text-slate-900">{coach.title}</p>
                  <p className="mt-1 text-slate-600">{coach.body}</p>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-600">
                  {coach.tips.map((tip) => (
                    <TinyPill key={tip} className="bg-white text-slate-600 ring-slate-200">
                      {tip}
                    </TinyPill>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {preparedText.trim() ? (
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={analyzeDisabled || analyzing}
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {analysisStatus === "running" ? "Analyse laeuft" : "Analyse starten"}
                    </button>
                  ) : null}
                  {totalStatements > 0 ? (
                    flowIsLite ? (
                      <button
                        type="button"
                        onClick={() => handleFlowChange("guided")}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Zu Guided wechseln
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={scrollToNextLevel}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Weiter im Flow
                      </button>
                    )
                  ) : null}
                  {communityDraft.trim() ? (
                    <button
                      type="button"
                      onClick={scrollToCommunity}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Community-Frage
                    </button>
                  ) : null}
                  {articleDraft.trim() ? (
                    <button
                      type="button"
                      onClick={scrollToArticle}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Artikel-Entwurf
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {allowResearch && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Recherche-Input (optional)</h3>
                  <span className="text-[11px] text-slate-500">Links oder Stichpunkte</span>
                </div>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                  rows={4}
                  value={evidenceInput}
                  onChange={(event) => setEvidenceInput(event.target.value)}
                  placeholder="Quellen oder Hinweise, die der KI als Kontext dienen (z. B. Links, Stichpunkte)."
                />
              </div>
            )}

            <div className="rounded-xl bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Entwurf: <span className="font-semibold text-slate-900">{buildDraftLabel(draftId, localDraftId)}</span>
                </span>
                <span>
                  zuletzt gespeichert: <span className="font-semibold text-slate-900">{formatDateLabel(savedAt)}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 text-[11px] text-slate-500">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                <span>{text.length} Zeichen</span>
                <span>Aufbereitet: ~{preparedRatio}% kürzer (spart Zeit & Coins)</span>
              </div>

              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzeDisabled || analyzing}
                  className="w-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {analyzeButtonLabel}
                </button>

                <button
                  type="button"
                  onClick={saveDraftSnapshot}
                  disabled={isSaving || !preparedText.trim()}
                  className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                >
                  {isSaving ? "Speichere …" : "Speichern"}
                </button>
              </div>

              {error ? (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-100">
                  Fehler
                </span>
              ) : info ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100">
                  Hinweis
                </span>
              ) : null}

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
            {flowInfo && (
              <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-700">{flowInfo}</p>
            )}
          </div>

          <div className="space-y-4">
            {viewLevel <= 2 && (
              <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                {viewLevel === 1 && (
                  <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Schnellblick</p>
                    {report?.summary ? (
                      <p className="mt-1 text-sm text-slate-800">{translateText("report:summary", report.summary)}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Noch keine Zusammenfassung vorhanden.</p>
                    )}
                  </div>
                )}

                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold leading-tight text-slate-800">
                    {viewLevel === 1 ? "Top-Kernaussagen" : "Alle Kernaussagen"}
                  </h2>

                  <div className="text-[11px] text-slate-500">
                    {totalStatements > 0
                      ? viewLevel === 1
                        ? `${totalStatements} gesamt (Top ${Math.min(MAX_LEVEL1_STATEMENTS, totalStatements)})`
                        : `${totalStatements} Statements`
                      : "Noch keine Statements – Analyse zuerst starten."}
                  </div>
                </div>

                <div className="space-y-3">
                  {levelStatements.map((s, idx) => {
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
                    const tagsAll = Array.from(new Set([...(s.tags ?? []), ...tags.filter(Boolean)]));
                    const primaryTags = tagsAll.slice(0, 2);
                    const extraTags = tagsAll.slice(2);
                    const attribution = traceResult?.attribution?.[s.id] ?? null;
                    const modeMeta = attribution ? TRACE_MODE_STYLE[attribution.mode] : null;
                    const titleBase = s.title && s.title.trim().length > 0 ? s.title : `Statement #${s.index + 1}`;
                    const translationKey = s.id ?? String(s.index ?? idx);
                    const statementTitle = s.title
                      ? translateText(`statement:${translationKey}:title`, s.title)
                      : titleBase;
                    const statementText = translateText(`statement:${translationKey}:text`, s.text);
                    const showOriginal = contentLang !== baseLang && statementText !== s.text;

                    return (
                      <StatementCard
                        key={s.id}
                        variant="analyze"
                        statementId={s.id}
                        text={statementText}
                        title={statementTitle}
                        mainCategory={statementTitle}
                        jurisdiction={s.responsibility || undefined}
                        topic={s.topic || undefined}
                        tags={tags}
                        source="ai"
                        showVoteButtons={false}
                      >
                        <div className="space-y-3">
                          {showOriginal && (
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Original ({baseLang.toUpperCase()})
                            </div>
                          )}
                          <InlineEditableText
                            value={s.text}
                            onChange={(val) =>
                              setStatements((prev) =>
                                prev.map((entry) => (entry.id === s.id ? { ...entry, text: val } : entry)),
                              )
                            }
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            {modeMeta && <TinyPill className={modeMeta.chipClass}>{modeMeta.label}</TinyPill>}
                            {primaryTags.map((t) => (
                              <TinyPill key={t}>{t}</TinyPill>
                            ))}
                            {extraTags.length > 0 && (
                              <details className="group">
                                <summary className="cursor-pointer select-none text-[10px] font-semibold text-slate-600 hover:text-slate-800">
                                  Details
                                </summary>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {extraTags.map((t) => (
                                    <TinyPill key={t}>{t}</TinyPill>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                          {attribution && (
                            <details className="mt-2 rounded-lg border border-slate-200/70 bg-white/40 p-2">
                              <summary className="cursor-pointer select-none text-xs font-semibold text-slate-700 hover:text-slate-900">
                                Herkunft & Begründung
                              </summary>

                              <div className="mt-2 space-y-2 text-xs">
                                {attribution.why && <div className="text-slate-700">{attribution.why}</div>}

                                {Array.isArray(attribution.quotes) && attribution.quotes.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-semibold text-slate-600">Zitate</div>
                                    <ul className="list-disc pl-5 text-slate-700">
                                      {attribution.quotes.map((quote, idx) => (
                                        <li key={`${s.id}-quote-${idx}`}>
                                          <span className="text-slate-800">{quote}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                          <div
                            className={`flex flex-wrap items-center ${flowIsLite ? "justify-end" : "justify-between"} gap-3`}
                          >
                            {!flowIsLite && (
                              <VogVoteButtons
                                value={s.vote ?? null}
                                size="sm"
                                onChange={(next) =>
                                  setStatements((prev) =>
                                    prev.map((entry) => (entry.id === s.id ? { ...entry, vote: next } : entry)),
                                  )
                                }
                              />
                            )}
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
                      impacts={displayImpacts}
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
                      actors={displayResponsibleActors}
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
                      {notes.map((note, idx) => {
                        const key = note.id ?? `note-${idx}`;
                        const title = note.title
                          ? translateText(`note:${key}:title`, note.title)
                          : `Notiz ${idx + 1}`;
                        const body = translateText(`note:${key}:body`, note.body);
                        return (
                          <li key={key} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
                            <p className="text-sm text-slate-800">{body}</p>
                          </li>
                        );
                      })}
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
                      {questions.map((q, idx) => {
                        const key = q.id ?? `q-${idx}`;
                        const label = q.label
                          ? translateText(`question:${key}:label`, q.label)
                          : `Frage ${idx + 1}`;
                        const body = translateText(`question:${key}:body`, q.body);
                        return (
                          <li key={key} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                            <p className="text-sm text-slate-800">{body}</p>
                          </li>
                        );
                      })}
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
                      {knots.map((k, idx) => {
                        const key = k.id ?? `k-${idx}`;
                        const title = k.title
                          ? translateText(`knot:${key}:title`, k.title)
                          : `Knoten ${idx + 1}`;
                        const body = translateText(`knot:${key}:body`, k.body);
                        return (
                          <li key={key} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
                            <p className="text-sm text-slate-800">{body}</p>
                          </li>
                        );
                      })}
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
                            {eventualities.map((e, idx) => {
                              const key = e.id ?? `ev-${idx}`;
                              const text = translateText(`eventuality:${key}:text`, e.narrative || e.label || "");
                              return <li key={key}>{text}</li>;
                            })}
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
                      {report.summary && <p>{translateText("report:summary", report.summary)}</p>}
                      {Array.isArray(report.keyConflicts) && report.keyConflicts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Konfliktlinien</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {report.keyConflicts.map((c: string, idx: number) => (
                              <li key={`${c}-${idx}`}>{translateText(`report:key:${idx}`, c)}</li>
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
                                <li key={`f-l-${idx}`}>{translateText(`report:fact:local:${idx}`, f)}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">Fakten (international)</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {(report.facts.international ?? []).map((f: string, idx: number) => (
                                <li key={`f-i-${idx}`}>{translateText(`report:fact:intl:${idx}`, f)}</li>
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
                              <li key={`t-${idx}`}>{translateText(`report:takeaway:${idx}`, c)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Noch kein Bericht vorhanden.</p>
                  )}
                </details>

                {editorialAudit && <EditorialAuditPanel audit={editorialAudit} />}
                {evidenceGraph && <EvidenceGraphPanel graph={evidenceGraph} />}
                {runReceipt && <RunReceiptPanel receipt={runReceipt} />}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div ref={communityRef} className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Community</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-800">Offene Frage an Community / Dachverbaende</h3>
                  <p className="text-[11px] text-slate-500">
                    Sammle Perspektiven oder Fakten, bevor du final einreichst.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(communityDraft, "Community-Frage")}
                  disabled={!communityDraft.trim()}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Kopieren
                </button>
              </div>

              <textarea
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                rows={5}
                value={communityDraft}
                onChange={(event) => {
                  setCommunityDraft(event.target.value);
                  setCommunityEdited(true);
                }}
                placeholder="Formuliere eine offene Frage, z.B. 'Welche Auswirkungen seht ihr auf ...?'"
              />

              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleRegenerateCommunity}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Neu generieren
                </button>
                {questions.length ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                    {Math.min(questions.length, 3)} KI-Fragen verfuegbar
                  </span>
                ) : null}
              </div>

              {questions.length ? (
                <div className="mt-3 space-y-2 text-[11px] text-slate-700">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">KI-Vorschlaege</p>
                  <ul className="space-y-1">
                    {questions.slice(0, 3).map((q, idx) => {
                      const key = q.id ?? `q-${idx}`;
                      const body = translateText(`question:${key}:body`, q.body);
                      return (
                        <li key={q.id ?? `community-q-${idx}`} className="rounded-lg bg-slate-50 px-2 py-1">
                          {body}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div ref={articleRef} className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Redaktion</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-800">Artikel-Entwurf</h3>
                  <p className="text-[11px] text-slate-500">
                    Ein vorstrukturierter Entwurf, den du nur noch abnicken oder bearbeiten kannst.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(articleDraft, "Artikel-Entwurf")}
                    disabled={!articleDraft.trim()}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Kopieren
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateArticle}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Neu generieren
                  </button>
                </div>
              </div>

              <textarea
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                rows={10}
                value={articleDraft}
                onChange={(event) => {
                  setArticleDraft(event.target.value);
                  setArticleDraftEdited(true);
                }}
                placeholder="Starte mit einer Analyse, um einen Entwurf zu generieren."
              />

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>Nutze den Entwurf fuer redaktionelle Abstimmung oder Einreichung.</span>
              </div>
            </div>
          </div>

          {(allowTrace || allowResearch) && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Einordnung & naechste Schritte</p>
                    <p className="text-[11px] text-slate-500">
                      Vorschlaege und Pruefplan basieren nur auf deinem Input.
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

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setInsightTab("input")}
                      disabled={!allowTrace}
                      className={[
                        "rounded-full px-3 py-1 transition",
                        insightTab === "input" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                        !allowTrace ? "cursor-not-allowed opacity-60" : "",
                      ].join(" ")}
                      aria-pressed={insightTab === "input"}
                    >
                      Aus Input
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsightTab("recherche")}
                      disabled={!allowResearch}
                      className={[
                        "rounded-full px-3 py-1 transition",
                        insightTab === "recherche" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                        !allowResearch ? "cursor-not-allowed opacity-60" : "",
                      ].join(" ")}
                      aria-pressed={insightTab === "recherche"}
                    >
                      Recherche
                    </button>
                  </div>

                  {insightTab === "input" && statements.length === 0 ? (
                    <span className="text-[11px] text-slate-500">Fuer "Aus Input" erst Analyse starten.</span>
                  ) : null}
                </div>

                {guidanceError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{guidanceError}</p>}

                {!hasGuidance && !guidanceError ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {insightTab === "input"
                      ? "Erzeuge Herkunftshinweise und einen Pruefplan auf Basis deiner Kernaussagen (Statements)."
                      : "Erzeuge einen Pruefplan / Recherche-Hinweise - ohne externe Fakten zu uebernehmen."}
                  </p>
                ) : null}

                {insightTab === "input" && guidance ? (
                  <div className="mt-3 space-y-3 text-[11px] text-slate-700">
                    {guidance.concern ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Anliegen</p>
                        <p className="mt-1 text-sm text-slate-800">{guidance.concern}</p>
                      </div>
                    ) : null}

                    {guidance.scopeHints?.levels?.length ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ebenen</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {guidance.scopeHints.levels.map((lvl) => (
                            <span key={lvl} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {lvl}
                            </span>
                          ))}
                        </div>
                        {guidance.scopeHints.why ? (
                          <p className="mt-1 text-[11px] text-slate-600">{guidance.scopeHints.why}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {guidance.istStandChecklist &&
                    (guidance.istStandChecklist.society?.length ||
                      guidance.istStandChecklist.media?.length ||
                      guidance.istStandChecklist.politics?.length) ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        {([
                          { key: "society", label: "Gesellschaft" },
                          { key: "media", label: "Medien" },
                          { key: "politics", label: "Politik" },
                        ] as const).map(({ key, label }) => {
                          const items = guidance.istStandChecklist[key] ?? [];
                          if (!items.length) return null;
                          return (
                            <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                              <ul className="mt-1 space-y-1">
                                {items.map((item) => (
                                  <li key={item} className="text-[11px] text-slate-700">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {(guidance.proFrames?.length || guidance.contraFrames?.length) ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {guidance.proFrames?.length ? (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pro-Frames</p>
                            <ul className="mt-1 space-y-1">
                              {guidance.proFrames.map((frame, idx) => (
                                <li key={`${frame.frame}-${idx}`}>
                                  <span className="font-semibold text-slate-700">{frame.frame}</span>
                                  {frame.stakeholders?.length ? (
                                    <span className="text-slate-500"> · {frame.stakeholders.join(", ")}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {guidance.contraFrames?.length ? (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contra-Frames</p>
                            <ul className="mt-1 space-y-1">
                              {guidance.contraFrames.map((frame, idx) => (
                                <li key={`${frame.frame}-${idx}`}>
                                  <span className="font-semibold text-slate-700">{frame.frame}</span>
                                  {frame.stakeholders?.length ? (
                                    <span className="text-slate-500"> · {frame.stakeholders.join(", ")}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

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
                ) : null}

                {insightTab === "recherche" && researchGuidance ? (
                  <div className="mt-3 space-y-3 text-[11px] text-slate-700">
                    {hasResearchSources ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="font-semibold text-slate-700">Darstellung:</span>
                          {(["serp", "cards"] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setResearchView(v)}
                              className={`rounded-full px-2.5 py-1 text-[11px] ${
                                researchView === v
                                  ? "bg-slate-800 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {v === "serp" ? "SERP" : "Cards"}
                            </button>
                          ))}
                        </div>
                        <SerpResultsList
                          results={(researchGuidance.sources ?? []).map((label) => ({
                            url: "",
                            title: label,
                            siteName: "Pruefplan",
                            breadcrumb: "Quellenbereich",
                            snippet:
                              SOURCE_HINTS[label] ||
                              "Vorschlag fuer den Pruefplan: Pruefe Informationen in diesem Quellentyp.",
                          }))}
                          view={researchView}
                        />
                      </div>
                    ) : null}

                    {researchGuidance.focus?.length ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fokus</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {researchGuidance.focus.map((item) => (
                            <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {researchGuidance.stakeholders?.length ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stakeholder</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                          {researchGuidance.stakeholders.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {researchGuidance.sources?.length ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quellen-Typen</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                          {researchGuidance.sources.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {researchGuidance.queries?.length ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suchanfragen</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                          {researchGuidance.queries.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {researchGuidance.feeds?.length || researchGuidance.risks?.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {researchGuidance.feeds?.length ? (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Feeds</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                              {researchGuidance.feeds.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {researchGuidance.risks?.length ? (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Risiken</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-700">
                              {(researchGuidance.risks ?? []).map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {totalStatements > 0 ? (
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
      ) : null}
    </div>
  );
}
