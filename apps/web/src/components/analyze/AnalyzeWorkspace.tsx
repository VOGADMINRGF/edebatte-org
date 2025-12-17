"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HighlightedTextarea } from "@/app/(components)/HighlightedTextarea";
import { normalizeClaim, type NormalizedClaim } from "@/app/(components)/normalizeClaim";
import StatementCard, { type StatementVote } from "@/components/statements/StatementCard";
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
import VogVoteButtons from "@features/vote/components/VogVoteButtons";

const LEVEL_OPTIONS = [
  { id: 1 as 1 | 2 | 3 | 4, label: "Schnellblick" },
  { id: 2 as 1 | 2 | 3 | 4, label: "Kernaussagen" },
  { id: 3 as 1 | 2 | 3 | 4, label: "Wirkung & Zuständigkeit" },
  { id: 4 as 1 | 2 | 3 | 4, label: "Deep Dive" },
];
const MAX_LEVEL1_STATEMENTS = 3;

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

type StatementEntry = NormalizedClaim & {
  stance?: "pro" | "contra" | "neutral" | string | null;
  importance?: number | null;
  quality?: {
    precision: number;
    testability: number;
    readability: number;
    balance: number;
  };
  vote?: StatementVote | null;
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
  account?: {
    tierName?: string;
    coins?: number | null;
    costs?: {
      analyze?: number;
      save?: number;
      finalize?: number;
    };
  } | null;
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

function prepareText(raw: string) {
  const original = raw ?? "";
  let prepared = original.replace(/\r\n/g, "\n").trim();
  prepared = prepared.replace(/[ \t]+/g, " ");
  prepared = prepared.replace(/\n{3,}/g, "\n\n");
  prepared = prepared
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  const ratio =
    original.length > 0 ? Math.max(0, Math.round((1 - prepared.length / original.length) * 100)) : 0;
  return { original, prepared, ratio };
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
  account,
}: AnalyzeWorkspaceProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [viewLevel, setViewLevel] = React.useState<1 | 2 | 3 | 4>(defaultLevel);
  const [text, setText] = React.useState("");
  const [textMode, setTextMode] = React.useState<"original" | "prepared" | "preview">("original");
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
  const [accountInfo, setAccountInfo] = React.useState<AnalyzeWorkspaceProps["account"]>(account ?? null);
  const ctaRef = React.useRef<HTMLDivElement | null>(null);
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);

  const preparedState = React.useMemo(() => prepareText(text), [text]);
  const preparedText = preparedState.prepared;

  const levelStatements = viewLevel === 1 ? statements.slice(0, MAX_LEVEL1_STATEMENTS) : statements;
  const totalStatements = statements.length;

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
    if (account) {
      setAccountInfo(account);
      return;
    }
    let ignore = false;
    async function loadAccount() {
      try {
        const res = await fetch("/api/account/overview", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.overview) return;
        if (ignore) return;
        const overview = body.overview;
        setAccountInfo({
          tierName: overview?.pricingTier ?? overview?.accessTier ?? overview?.planSlug ?? null,
          coins: typeof overview?.stats?.contributionCredits === "number" ? overview.stats.contributionCredits : null,
          costs: { analyze: 1, save: 0, finalize: 1 },
        });
      } catch {
        // ignore
      }
    }
    loadAccount();
    return () => {
      ignore = true;
    };
  }, [account]);

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
    analysisStatus === "running" || !preparedText.trim() || (verificationStatus === "loading") || !meetsLevel;

  const gatingMessage =
    verificationStatus === "login_required"
      ? "Bitte melde dich an, um Beiträge zu analysieren."
      : verificationStatus === "error"
      ? "Level konnte nicht geladen werden – bitte später erneut versuchen."
      : !meetsLevel && requiredLevel
      ? `Für diese Ansicht benötigst du mindestens Verifizierungs-Level "${requiredLevel}".`
      : null;

  const saveDraftSnapshot = React.useCallback(async () => {
    if (!text.trim()) {
      setSaveInfo("Bitte zuerst einen Text eingeben.");
      return;
    }

    setIsSaving(true);
    setSaveInfo(null);
    try {
      const payload = {
        draftId,
        text,
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
    questions,
    report,
    responsibilities,
    responsibilityPaths,
    saveEndpoint,
    statements,
    text,
    preparedText,
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
    setAnalysisStatus("running");
    setSteps(BASE_STEPS.map((s) => ({ ...s, state: "running" })));

    try {
      const detailPreset = LEVEL_OPTIONS.find((lvl) => lvl.id === viewLevel)?.label ?? "Schnellblick";
      const res = await fetch(analyzeEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, preparedText, locale, detailPreset }),
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

      const metaFromResponse = data?.meta ?? (resultPayload as any)?._meta ?? {};
      const matrixFromResponse: ProviderMatrixEntry[] = Array.isArray(metaFromResponse?.providerMatrix)
        ? metaFromResponse.providerMatrix
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
  }, [analyzeDisabled, analyzeEndpoint, locale, text, preparedText, viewLevel]);

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

  const activePresetLabel = LEVEL_OPTIONS.find((lvl) => lvl.id === viewLevel)?.label ?? "Schnellblick";
  const costLabels = [
    typeof accountInfo?.costs?.analyze === "number" ? `Analyse: -${accountInfo.costs.analyze} Coins` : null,
    typeof accountInfo?.costs?.save === "number" ? `Speichern: -${accountInfo.costs.save} Coins` : null,
    typeof accountInfo?.costs?.finalize === "number" ? `Einreichen: -${accountInfo.costs.finalize} Coins` : null,
  ].filter(Boolean) as string[];

  return (
    <div ref={workspaceRef} className="min-h-[calc(100vh-64px)] bg-[linear-gradient(180deg,#e9f6ff_0%,#c0f8ff_45%,#a4fcec_100%)]">
      <div className="container-vog max-w-7xl space-y-4 pb-28 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="vog-head text-3xl sm:text-4xl">
              {mode === "statement" ? (
                <>
                  <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">Statement</span>{" "}
                  analysieren
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">Beitrag</span>{" "}
                  analysieren
                </>
              )}
            </h1>
            <p className="text-xs text-slate-600">
              Du bestimmst den Detailgrad – passend zu deinem Paket.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            {accountInfo?.tierName ? (
              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 font-semibold">
                Paket: {accountInfo.tierName}
              </span>
            ) : null}
            {typeof accountInfo?.coins === "number" ? (
              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 font-semibold">
                Coins: {accountInfo.coins}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-4 lg:sticky lg:top-4 self-start">
            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm">
              Entwurf: <span className="font-semibold text-slate-900">{buildDraftLabel(draftId, localDraftId)}</span> · zuletzt gespeichert:{" "}
              <span className="font-semibold text-slate-900">{formatDateLabel(savedAt)}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Dein Text</h2>
                  <p className="text-[11px] text-slate-500">
                    Schreibe frei heraus. Die Analyse nutzt deinen Text als Basis fuer Statements, Fragen und Folgen.
                  </p>
                </div>
                <div className="text-[11px] text-slate-500">
                  Sprache: <span className="font-medium uppercase">{locale}</span>
                </div>
              </div>

              <div className="mb-3 inline-flex rounded-full bg-slate-100 p-1 text-[11px]">
                {(["original", "prepared", "preview"] as const).map((modeKey) => (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => setTextMode(modeKey)}
                    className={[
                      "rounded-full px-3 py-1 transition",
                      textMode === modeKey ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                    ].join(" ")}
                  >
                    {modeKey === "original" ? "Original" : modeKey === "prepared" ? "Aufbereitet" : "Vorschau"}
                  </button>
                ))}
              </div>

              {textMode === "original" ? (
                <HighlightedTextarea value={text} onChange={setText} analyzing={analysisStatus === "running"} rows={12} />
              ) : textMode === "prepared" ? (
                <textarea
                  readOnly
                  value={preparedText}
                  rows={12}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-3">
                  {preparedText
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((para, idx) => (
                      <p key={`${para.slice(0, 20)}-${idx}`} className="leading-relaxed">
                        {para}
                      </p>
                    ))}
                </div>
              )}

              <div className="mt-3 flex flex-col items-center gap-2 text-[11px] text-slate-500">
                <span>
                  {preparedText.length} Zeichen · Aufbereitet: ~{preparedState.ratio}% kuerzer
                </span>
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
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Detailgrad</p>
                  <p className="text-sm font-semibold text-slate-800">{activePresetLabel}</p>
                </div>
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
                  {LEVEL_OPTIONS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setViewLevel(lvl.id)}
                      className={[
                        "rounded-full px-3 py-1 transition",
                        viewLevel === lvl.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Du bestimmst den Detailgrad – passend zu deinem Paket.</p>
            </div>

            <AnalyzeProgress steps={steps} providerMatrix={providerMatrix} />

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
                      : "Noch keine Kernaussagen – starte zuerst die Analyse."}
                  </div>
                </div>

                <div className="space-y-3">
                  {levelStatements.map((s) => {
                const stanceLabel =
                  s.stance === "pro" ? "pro" : s.stance === "contra" ? "contra" : s.stance === "neutral" ? "neutral" : null;
                const tags: string[] = [];
                if (stanceLabel) tags.push(`Haltung: ${stanceLabel}`);
                if (typeof s.importance === "number") tags.push(`Wichtigkeit: ${s.importance}/5`);
                const voteValue =
                  s.vote === "approve" ? "pro" : s.vote === "reject" ? "contra" : s.vote === "neutral" ? "neutral" : null;
                const isSelected = selectedClaimIds.includes(s.id);

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
                      <InlineEditableText value={s.text} onChange={(val) =>
                        setStatements((prev) => prev.map((entry) => (entry.id === s.id ? { ...entry, text: val } : entry)))
                      } />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <VogVoteButtons
                          value={voteValue}
                          onChange={(next) => {
                            const mapped =
                              next === "pro" ? "approve" : next === "contra" ? "reject" : next === "neutral" ? "neutral" : null;
                            setStatements((prev) =>
                              prev.map((entry) => (entry.id === s.id ? { ...entry, vote: mapped } : entry)),
                            );
                          }}
                          size="sm"
                        />
                        <label
                          className={[
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                            isSelected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(s.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
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
                      Noch keine Kernaussagen vorhanden. Sie erscheinen nur, wenn die Analyse erfolgreich war.
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
                      <h3 className="text-sm font-semibold text-slate-800">Wirkung</h3>
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
                      <h3 className="text-sm font-semibold text-slate-800">Zustaendigkeit</h3>
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
                <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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

                <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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

                <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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

                <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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

                <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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

                <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
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

      <div ref={ctaRef} className="fixed bottom-4 left-0 right-0 z-30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ring-1 ring-slate-200">
          <div>
            <p className="text-sm font-semibold text-slate-900">{selectedClaimIds.length} von {totalStatements} ausgewaehlt</p>
            <p className="text-xs text-slate-500">Waehle, welche Statements als Vorschlaege uebernommen werden.</p>
            {costLabels.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                {costLabels.map((label) => (
                  <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveDraftSnapshot}
              disabled={isSaving}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
            >
              Entwurf speichern
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={!draftId || isFinalizing}
              className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-5 py-2 text-xs font-semibold text-white shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Als Vorschlag einreichen
            </button>
            {finalizeRedirectTo && (
              <button
                type="button"
                onClick={handleRedirect}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Zu Swipes
              </button>
            )}
            <button
              type="button"
              onClick={scrollToNextLevel}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Weiter
            </button>
          </div>
        </div>
        {finalizeInfo && (
          <div className="mx-auto mt-2 max-w-5xl rounded-2xl bg-emerald-50 px-4 py-2 text-xs text-emerald-700 ring-1 ring-emerald-100">
            {finalizeInfo}
          </div>
        )}
      </div>
    </div>
  );
}
