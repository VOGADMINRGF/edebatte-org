import { z } from "zod";
import {
  extractCreateStructuredTopicLabels,
  resolveCreateIntakeIssueMode,
  type CreateIntakeIssueMode,
} from "@/features/create/createIntakeClassification";

export const CREATE_PROGRESS_PHASES = [
  "save",
  "intake",
  "structure",
  "topics",
  "scope",
  "quality",
  "result",
  "recovery",
] as const;

export const CREATE_PROGRESS_TYPES = [
  "draft.saved",
  "intake.classified",
  "structure.detected",
  "topic.detected",
  "structure.consolidating",
  "structure.corrected",
  "scope.validating",
  "scope.confirmed",
  "scope.open",
  "quality.checking",
  "quality.passed",
  "quality.needs_confirmation",
  "result.ready",
  "result.partial",
  "result.failed",
] as const;

export const CREATE_PROGRESS_STATUSES = [
  "started",
  "progress",
  "completed",
  "corrected",
  "failed",
] as const;

export const CREATE_PROGRESS_VISIBILITIES = [
  "recognized",
  "verified",
  "open",
  "provisional",
  "corrected",
] as const;

const CreateProgressSegmentRefSchema = z
  .object({
    segmentId: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(120),
    sourceLine: z.number().int().positive().optional(),
  })
  .strict();

const CreateProgressTopicRefSchema = z
  .object({
    topicId: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(120),
    confidence: z.enum([
      "clear",
      "likely",
      "open",
      "confirmation_recommended",
    ]),
    segmentRefs: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  })
  .strict();

export const CreateProgressEventSchema = z
  .object({
    eventId: z.string().trim().min(1).max(240),
    operationId: z.string().trim().min(8).max(160),
    correlationId: z.string().trim().min(8).max(160),
    phase: z.enum(CREATE_PROGRESS_PHASES),
    type: z.enum(CREATE_PROGRESS_TYPES),
    status: z.enum(CREATE_PROGRESS_STATUSES),
    visibility: z.enum(CREATE_PROGRESS_VISIBILITIES),
    label: z.string().trim().min(1).max(320),
    provisional: z.boolean(),
    createdAt: z.string().datetime(),
    segmentRefs: z.array(CreateProgressSegmentRefSchema).max(20).optional(),
    topicRefs: z.array(CreateProgressTopicRefSchema).max(14).optional(),
  })
  .strict();

export type CreateProgressEvent = z.infer<typeof CreateProgressEventSchema>;
export type CreateProgressSegmentRef = z.infer<typeof CreateProgressSegmentRefSchema>;
export type CreateProgressTopicRef = z.infer<typeof CreateProgressTopicRefSchema>;

export type CreateDeterministicStructure = {
  issueMode: CreateIntakeIssueMode;
  segmentCount: number;
  segmentRefs: CreateProgressSegmentRef[];
};

function normalizePublicId(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 160);
}

function eventId(operationId: string, sequence: number, type: CreateProgressEvent["type"]) {
  return `create-progress:${normalizePublicId(operationId)}:${String(sequence).padStart(3, "0")}:${type}`;
}

function structuredSourceLines(text: string) {
  const lines = text.split(/\r?\n/);
  return lines.flatMap((line, index) => {
    const numbered = line.match(/^\s*\d{1,2}\s*[.)]\s+(.+)$/u);
    const markdownHeading = line.match(/^\s*#{1,6}\s+(.+)$/u);
    const standaloneHeading = line.match(/^\s*([\p{L}][\p{L}\d /&-]{2,60}):\s*$/u);
    const subtopics = line.match(/^\s*Unterthemen\s*:\s*(.*)$/iu);
    const label = (
      numbered?.[1] ??
      markdownHeading?.[1] ??
      standaloneHeading?.[1] ??
      subtopics?.[1] ??
      "Unterthemen"
    )
      .replace(/^#{1,6}\s+/, "")
      .split(/\s*[:–—-]\s+/, 1)[0]
      .replace(/[.:;,]+$/, "")
      .trim();
    if (!numbered && !markdownHeading && !standaloneHeading && !subtopics) return [];
    if (label.length < 2 || label.length > 120) return [];
    return [{ label, sourceLine: index + 1 }];
  });
}

export function inspectCreateDeterministicStructure(
  text: string,
): CreateDeterministicStructure {
  const normalizedText = text.trim();
  const canonicalLabels = extractCreateStructuredTopicLabels(normalizedText);
  const sourceLines = structuredSourceLines(normalizedText);
  const labels = canonicalLabels.length > 0 ? canonicalLabels : sourceLines.map((entry) => entry.label);
  const seen = new Set<string>();
  const segmentRefs = labels.flatMap((label, index) => {
    const key = label.toLocaleLowerCase("de-DE");
    if (seen.has(key)) return [];
    seen.add(key);
    const sourceLine = sourceLines.find(
      (entry) => entry.label.toLocaleLowerCase("de-DE") === key,
    )?.sourceLine;
    return [
      {
        segmentId: `segment-${index + 1}`,
        label,
        ...(sourceLine ? { sourceLine } : {}),
      },
    ];
  });

  return {
    issueMode: resolveCreateIntakeIssueMode({ text: normalizedText }),
    segmentCount: segmentRefs.length,
    segmentRefs,
  };
}

type EventFactoryInput = {
  operationId: string;
  correlationId: string;
  createdAt: string;
};

function createEvent(
  input: EventFactoryInput &
    Omit<CreateProgressEvent, "eventId" | "operationId" | "correlationId" | "createdAt"> & {
      sequence: number;
    },
): CreateProgressEvent {
  return CreateProgressEventSchema.parse({
    eventId: eventId(input.operationId, input.sequence, input.type),
    operationId: input.operationId,
    correlationId: input.correlationId,
    phase: input.phase,
    type: input.type,
    status: input.status,
    visibility: input.visibility,
    label: input.label,
    provisional: input.provisional,
    createdAt: input.createdAt,
    ...(input.segmentRefs ? { segmentRefs: input.segmentRefs } : {}),
    ...(input.topicRefs ? { topicRefs: input.topicRefs } : {}),
  });
}

export function buildCreateInitialProgressEvents(input: {
  text: string;
  operationId: string;
  correlationId: string;
  locale: string;
  persistence?: "account_draft" | "browser";
  draftSaved?: boolean;
  createdAt?: string;
}): { structure: CreateDeterministicStructure; events: CreateProgressEvent[] } {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const isEnglish = input.locale.trim().toLowerCase().startsWith("en");
  const structure = inspectCreateDeterministicStructure(input.text);
  const events: CreateProgressEvent[] = [];
  if (input.draftSaved !== false) {
    events.push(createEvent({
      ...input,
      createdAt,
      sequence: 0,
      phase: "save",
      type: "draft.saved",
      status: "completed",
      visibility: "verified",
      label:
        input.persistence === "browser"
          ? isEnglish
            ? "Draft saved in this browser."
            : "Entwurf in diesem Browser gespeichert."
          : isEnglish
            ? "Draft saved."
            : "Entwurf gespeichert.",
      provisional: false,
    }));
  }
  events.push(
    createEvent({
      ...input,
      createdAt,
      sequence: 1,
      phase: "intake",
      type: "intake.classified",
      status: "completed",
      visibility: "recognized",
      label:
        structure.issueMode === "multi_issue"
          ? isEnglish
            ? "Several distinct areas recognized in the text."
            : "Mehrere getrennte Bereiche im Text erkannt."
          : isEnglish
            ? "One coherent concern recognized."
            : "Ein zusammenhängendes Anliegen erkannt.",
      provisional: true,
    }),
  );

  if (structure.segmentCount >= 3) {
    events.push(
      createEvent({
        ...input,
        createdAt,
        sequence: 2,
        phase: "structure",
        type: "structure.detected",
        status: "completed",
        visibility: "recognized",
        label: isEnglish
          ? `Structure recognized: ${structure.segmentCount} separate sections.`
          : `Struktur erkannt: ${structure.segmentCount} getrennte Abschnitte.`,
        provisional: true,
        segmentRefs: structure.segmentRefs,
      }),
    );
  }

  return { structure, events };
}

export function buildCreateValidatedProgressEvents(input: {
  operationId: string;
  correlationId: string;
  locale: string;
  structure: CreateDeterministicStructure;
  topics: Array<{ id: string; label: string; confidence?: "high" | "medium" | "low" }>;
  scopes: string[];
  qualityPassed: boolean;
  partial: boolean;
  createdAt?: string;
}): CreateProgressEvent[] {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const isEnglish = input.locale.trim().toLowerCase().startsWith("en");
  const topics = input.qualityPassed ? input.topics.slice(0, 14) : [];
  const events: CreateProgressEvent[] = [];

  topics.forEach((topic, index) => {
    const matchingSegment = input.structure.segmentRefs.find(
      (segment) =>
        segment.label.trim().toLocaleLowerCase("de-DE") ===
        topic.label.trim().toLocaleLowerCase("de-DE"),
    );
    events.push(
      createEvent({
        ...input,
        createdAt,
        sequence: 100 + index,
        phase: "topics",
        type: "topic.detected",
        status: "completed",
        visibility: "verified",
        label: isEnglish ? `Topic verified: ${topic.label}` : `Thema geprüft: ${topic.label}`,
        provisional: false,
        topicRefs: [
          {
            topicId: topic.id,
            label: topic.label,
            confidence:
              topic.confidence === "high"
                ? "clear"
                : topic.confidence === "medium"
                  ? "likely"
                  : "confirmation_recommended",
            ...(matchingSegment
              ? { segmentRefs: [matchingSegment.segmentId] }
              : {}),
          },
        ],
      }),
    );
  });

  if (
    input.qualityPassed &&
    input.structure.segmentCount >= 3 &&
    topics.length > 0 &&
    input.structure.segmentCount !== topics.length
  ) {
    events.push(
      createEvent({
        ...input,
        createdAt,
        sequence: 120,
        phase: "structure",
        type: "structure.corrected",
        status: "corrected",
        visibility: "corrected",
        label: isEnglish
          ? `Initially ${input.structure.segmentCount} sections were recognized. After consolidation, ${topics.length} distinct topics remain.`
          : `Zunächst wurden ${input.structure.segmentCount} Abschnitte erkannt. Nach der Zusammenführung bleiben ${topics.length} eigenständige Themen.`,
        provisional: false,
        segmentRefs: input.structure.segmentRefs,
      }),
    );
  }

  const confirmedScopes = input.scopes.filter((scope) => scope !== "unclear");
  events.push(
    createEvent({
      ...input,
      createdAt,
      sequence: 130,
      phase: "scope",
      type: confirmedScopes.length > 0 && input.qualityPassed ? "scope.confirmed" : "scope.open",
      status: "completed",
      visibility: confirmedScopes.length > 0 && input.qualityPassed ? "verified" : "open",
      label:
        confirmedScopes.length > 0 && input.qualityPassed
          ? isEnglish
            ? "Scope checked against the text."
            : "Zuständigkeit anhand des Textes geprüft."
          : isEnglish
            ? "The scope remains open; confirmation is useful."
            : "Die Zuständigkeit bleibt offen; eine Bestätigung ist sinnvoll.",
      provisional: false,
    }),
  );

  events.push(
    createEvent({
      ...input,
      createdAt,
      sequence: 140,
      phase: "quality",
      type: input.qualityPassed ? "quality.passed" : "quality.needs_confirmation",
      status: input.qualityPassed ? "completed" : "failed",
      visibility: input.qualityPassed ? "verified" : "open",
      label: input.qualityPassed
        ? isEnglish
          ? "Classification quality checked."
          : "Qualität der Einordnung geprüft."
        : isEnglish
          ? "The final classification still needs confirmation."
          : "Die abschließende Einordnung braucht noch eine Bestätigung.",
      provisional: false,
    }),
  );

  events.push(
    createEvent({
      ...input,
      createdAt,
      sequence: 150,
      phase: input.partial ? "recovery" : "result",
      type: input.partial ? "result.partial" : "result.ready",
      status: input.partial ? "failed" : "completed",
      visibility: input.partial ? "open" : "verified",
      label: input.partial
        ? isEnglish
          ? "The recognized intermediate results remain visible; the final classification could not be completed."
          : "Die erkannten Zwischenstände bleiben sichtbar; die abschließende Einordnung konnte nicht beendet werden."
        : isEnglish
          ? "Classification ready."
          : "Einordnung fertig.",
      provisional: false,
    }),
  );

  return events;
}

export function buildCreateStructureConsolidatingEvent(input: {
  operationId: string;
  correlationId: string;
  locale: string;
  structure: CreateDeterministicStructure;
  createdAt?: string;
}): CreateProgressEvent | null {
  if (input.structure.segmentCount < 3) return null;
  const isEnglish = input.locale.trim().toLowerCase().startsWith("en");
  return createEvent({
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
    sequence: 3,
    phase: "structure",
    type: "structure.consolidating",
    status: "started",
    visibility: "provisional",
    label: isEnglish
      ? "Overlaps between the recognized sections are being compared."
      : "Überschneidungen zwischen den erkannten Abschnitten werden abgeglichen.",
    provisional: true,
    segmentRefs: input.structure.segmentRefs,
  });
}

export function parseCreateProgressEvent(value: unknown): CreateProgressEvent | null {
  const parsed = CreateProgressEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function dedupeCreateProgressEvents(
  events: CreateProgressEvent[],
): CreateProgressEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.eventId)) return false;
    seen.add(event.eventId);
    return true;
  });
}
