import type { StreamSessionDoc } from "./types";

export const STREAM_PUBLIC_RUNTIME_STATUSES = [
  "planned",
  "open_for_questions",
  "live",
  "collecting_input",
  "review_required",
  "recap_in_progress",
  "dossier_update_suggested",
  "closed",
  "archived",
  "cancelled",
  "error",
] as const;

export type StreamPublicRuntimeStatus =
  (typeof STREAM_PUBLIC_RUNTIME_STATUSES)[number];

export type StreamPublicStatusMeta = {
  label: string;
  description: string;
  nextAction: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
};

const STATUS_META: Record<StreamPublicRuntimeStatus, StreamPublicStatusMeta> = {
  planned: {
    label: "Geplant",
    description: "Der Event ist angekündigt. Beteiligung und Kontext werden vorbereitet.",
    nextAction: "Anlass, Dossier oder Fragen vorab ansehen.",
    tone: "neutral",
  },
  open_for_questions: {
    label: "Fragen möglich",
    description: "Vor dem Event können bereits Fragen und Hinweise reviewpflichtig eingehen.",
    nextAction: "Frage, Quelle oder Perspektive einreichen.",
    tone: "info",
  },
  live: {
    label: "Event läuft",
    description: "Der Event läuft gerade. Ob ein Livestream verfügbar ist, zeigt der Medienbereich dieses Events.",
    nextAction: "Event verfolgen oder die verfügbaren Beteiligungsfunktionen nutzen.",
    tone: "success",
  },
  collecting_input: {
    label: "Hinweise werden gesammelt",
    description: "Fragen, Quellen und Perspektiven gehen reviewpflichtig in die Nachbereitung ein.",
    nextAction: "Beteiligung einreichen oder Kontext im Dossier prüfen.",
    tone: "info",
  },
  review_required: {
    label: "In Prüfung",
    description: "Neue Hinweise oder Fragen werden geprüft, bevor ihr Inhalt öffentlich sichtbar werden kann.",
    nextAction: "Review abwarten oder ergänzende Quelle nachreichen.",
    tone: "warning",
  },
  recap_in_progress: {
    label: "Nachbereitung läuft",
    description: "Zusammenfassung, offene Fragen und Folgepfade werden gerade reviewpflichtig vorbereitet.",
    nextAction: "Späteren Ergebnisstand im Anlassraum oder Dossier prüfen.",
    tone: "warning",
  },
  dossier_update_suggested: {
    label: "Dossier-Update vorgeschlagen",
    description: "Aus dem Event liegt ein Dossier-Hinweis vor, aber noch keine automatische Veröffentlichung.",
    nextAction: "Dossier-Kontext öffnen und Update-Status prüfen.",
    tone: "info",
  },
  closed: {
    label: "Abgeschlossen",
    description: "Die öffentliche Beteiligungsphase ist beendet. Ergebnisse bleiben nachvollziehbar anschließbar.",
    nextAction: "Ergebnisstand, Anlassraum oder Dossier ansehen.",
    tone: "neutral",
  },
  archived: {
    label: "Archiviert",
    description: "Der Event bleibt referenzierbar, ist aber nicht mehr als offene Beteiligung aktiv.",
    nextAction: "Nur noch als Kontext oder Verlauf nutzen.",
    tone: "neutral",
  },
  cancelled: {
    label: "Abgesagt",
    description: "Der Event ist nicht aktiv. Öffentliche Beteiligung und QR-/Share-Pfade bleiben deaktiviert.",
    nextAction: "Auf Anlassraum oder Dossier ausweichen.",
    tone: "danger",
  },
  error: {
    label: "Fehler",
    description: "Der Event- oder Beteiligungskontext konnte gerade nicht vollständig geladen werden.",
    nextAction: "Später erneut laden oder auf Anlassraum/Dossier ausweichen.",
    tone: "danger",
  },
};

export function getStreamPublicStatusMeta(
  status: StreamPublicRuntimeStatus,
): StreamPublicStatusMeta {
  return STATUS_META[status];
}

export function streamPublicStatusLabel(status: StreamPublicRuntimeStatus): string {
  return getStreamPublicStatusMeta(status).label;
}

export function resolveStreamPublicRuntimeStatus(input: {
  session: Pick<StreamSessionDoc, "status" | "isLive" | "endedAt" | "startsAt" | "updatedAt">;
  hasPublicInputPath: boolean;
  pendingInputCount: number;
  hasFollowUpUpdates: boolean;
  hasDossierUpdateSuggestion: boolean;
  archived?: boolean;
  error?: boolean;
}): StreamPublicRuntimeStatus {
  if (input.error) return "error";
  if (input.archived) return "archived";
  if (input.session.status === "cancelled") return "cancelled";

  const ended =
    input.session.status === "ended" ||
    (!input.session.isLive && Boolean(input.session.endedAt));

  if (ended) {
    if (input.hasDossierUpdateSuggestion) return "dossier_update_suggested";
    if (input.hasFollowUpUpdates) return "recap_in_progress";
    if (input.pendingInputCount > 0) return "review_required";
    return "closed";
  }

  // Event lifecycle and participation are separate truths. A running event remains
  // "live" even when the participation lane is open; the UI exposes participation separately.
  if (input.session.isLive || input.session.status === "live") {
    return "live";
  }

  if (input.hasPublicInputPath) return "open_for_questions";
  return "planned";
}
