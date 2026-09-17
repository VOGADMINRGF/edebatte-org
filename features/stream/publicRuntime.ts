import { ObjectId } from "@core/db/triMongo";
import { anlassraumCol } from "@features/anlassraum/db";
import { findDossierByAnyId } from "@features/dossier/lookup";
import { buildDossierUpdateReadModel } from "@features/dossier/updateReadModel";
import { loadSocialDistributionQueueReadModel } from "@features/outputEngine/socialDistributionQueueReadModel";
import { streamPublicInputsCol, streamSessionsCol } from "./db";
import {
  getStreamPublicStatusMeta,
  resolveStreamPublicRuntimeStatus,
  type StreamPublicRuntimeStatus,
} from "./statusContract";
import type {
  StreamFollowUpUpdate,
  StreamPublicInputDoc,
  StreamSessionDoc,
  StreamSessionStatus,
} from "./types";
import { resolveSessionStatus } from "./types";

type StreamContextRoom = {
  id: string;
  title: string;
  summary: string | null;
  dossierId: string | null;
  status: string | null;
  isPublic: boolean;
};

type StreamMediaStatus = "none" | "livestream" | "replay" | "video_available";

export type StreamPublicInputEntry = {
  id: string;
  kind: StreamPublicInputDoc["kind"];
  kindLabel: string;
  text: string;
  sourceUrl: string | null;
  reviewState: string;
  visibilityState: string;
  publicVisibilityLabel: string;
  createdAt: string;
  riskHint: string;
};

export type StreamPublicRuntime = {
  session: StreamSessionDoc & {
    id: string;
    slugOrId: string;
    eventStatus: StreamSessionStatus;
    eventStatusLabel: string;
    mediaStatus: StreamMediaStatus;
    mediaStatusLabel: string;
    resolvedStatus: StreamPublicRuntimeStatus;
    statusLabel: string;
    statusDescription: string;
    nextAction: string;
    statusTone: "neutral" | "info" | "warning" | "success" | "danger";
  };
  context: {
    anlassraumId: string | null;
    anlassraumTitle: string | null;
    anlassraumHref: string | null;
    dossierId: string | null;
    dossierTitle: string | null;
    dossierHref: string | null;
    swipesHref: string | null;
    shareEnabled: boolean;
    qrEnabled: boolean;
  };
  participation: {
    openForInput: boolean;
    pendingCount: number;
    visibleCount: number;
    questionCount: number;
    sourceHintCount: number;
    latestAt: string | null;
    items: StreamPublicInputEntry[];
  };
  recap: {
    reviewHint: string;
    dossierUpdateHint: string | null;
    anlassraumUpdateHint: string | null;
    socialDraftHint: string | null;
    latestFollowUp: StreamFollowUpUpdate | null;
  };
  guardrails: {
    noAutoPublish: true;
    noAutoSocial: true;
    noAutoMerge: true;
    reviewFirstInput: true;
  };
};

export type PublicStreamLinkSummary = {
  id: string;
  slugOrId: string;
  href: string;
  title: string;
  status: StreamPublicRuntimeStatus;
  statusLabel: string;
  startsAt: string | null;
};

function normalizeString(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeHttpsPlayerUrl(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function toHexMaybe(value: unknown): string | null {
  if (!value) return null;
  if (typeof (value as { toHexString?: unknown }).toHexString === "function") {
    return String((value as { toHexString: () => string }).toHexString());
  }
  const normalized = normalizeString(value);
  return normalized || null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function derivedSlugOrId(session: StreamSessionDoc) {
  const slug = normalizeString(session.slug);
  if (slug) return slug;
  const derived = slugify(session.title);
  if (derived) return derived;
  return session._id?.toHexString?.() ?? "stream";
}

function inputKindLabel(kind: StreamPublicInputDoc["kind"]) {
  switch (kind) {
    case "question":
      return "Frage";
    case "source_hint":
      return "Quelle";
    case "perspective":
      return "Perspektive";
    case "option":
      return "Option";
    case "concern":
      return "Bedenken";
    case "correction":
      return "Korrektur";
    case "support":
      return "Unterstützung";
  }
}

function visibilityLabel(value: StreamPublicInputDoc["visibilityState"]) {
  if (value === "public_unverified") return "sichtbar, aber nicht geprüft";
  if (value === "public_reviewed") return "geprüft sichtbar";
  if (value === "public_official") return "amtlich freigegeben";
  if (value === "blocked") return "blockiert";
  if (value === "archived") return "archiviert";
  return "reviewpflichtig";
}

function isPublicInput(doc: StreamPublicInputDoc) {
  return (
    doc.visibilityState === "public_unverified" ||
    doc.visibilityState === "public_reviewed" ||
    doc.visibilityState === "public_official"
  );
}

function eventStatusLabel(status: StreamSessionStatus) {
  switch (status) {
    case "scheduled":
      return "Geplant";
    case "live":
      return "Läuft gerade";
    case "ended":
      return "Abgeschlossen";
    case "cancelled":
      return "Abgesagt";
    case "draft":
    default:
      return "Entwurf";
  }
}

function resolveMediaStatus(status: StreamSessionStatus, playerUrl: string | null): StreamMediaStatus {
  if (!playerUrl) return "none";
  if (status === "live") return "livestream";
  if (status === "ended") return "replay";
  return "video_available";
}

function mediaStatusLabel(status: StreamMediaStatus) {
  switch (status) {
    case "livestream":
      return "Livestream verfügbar";
    case "replay":
      return "Replay verfügbar";
    case "video_available":
      return "Video verfügbar";
    case "none":
    default:
      return "Kein Video verfügbar";
  }
}

async function fetchSessionBySlugOrId(slugOrId: string): Promise<StreamSessionDoc | null> {
  const sessions = await streamSessionsCol();
  const baseQuery: Record<string, unknown> = {
    visibility: { $in: ["public", "unlisted"] },
  };

  if (/^[0-9a-fA-F]{24}$/.test(slugOrId)) {
    const byId = (await sessions.findOne({
      ...baseQuery,
      _id: new ObjectId(slugOrId),
    })) as StreamSessionDoc | null;
    if (byId) return byId;
  }

  const bySlug = (await sessions.findOne({
    ...baseQuery,
    slug: slugOrId,
  })) as StreamSessionDoc | null;
  if (bySlug) return bySlug;

  const fallback = await sessions
    .find(baseQuery, {
      projection: {
        title: 1,
        slug: 1,
        creatorId: 1,
        description: 1,
        regionCode: 1,
        topicKey: 1,
        startsAt: 1,
        playerUrl: 1,
        visibility: 1,
        status: 1,
        isLive: 1,
        deliberation: 1,
        liveBoard: 1,
        followUp: 1,
        supportEnabled: 1,
        supportBlind: 1,
        recordingAllowed: 1,
        requireVerifiedParticipants: 1,
        hideViewerCount: 1,
        createdAt: 1,
        updatedAt: 1,
        startedAt: 1,
        endedAt: 1,
      },
    })
    .sort({ updatedAt: -1 })
    .limit(120)
    .toArray();
  return fallback.find((session) => derivedSlugOrId(session as StreamSessionDoc) === slugOrId) as StreamSessionDoc | null;
}

async function findRelatedRoom(session: StreamSessionDoc): Promise<StreamContextRoom | null> {
  const topicKey = normalizeString(session.topicKey);
  if (!topicKey) return null;

  const room = (await (await anlassraumCol())
    .find({
      topicKey,
      isPublic: true,
      status: { $nin: ["archived"] },
    } as Record<string, unknown>)
    .sort({ updatedAt: -1 })
    .limit(1)
    .next()) as Record<string, unknown> | null;

  if (!room) return null;

  return {
    id: toHexMaybe(room._id) ?? "",
    title: normalizeString(room.title) ?? "Anlassraum",
    summary:
      normalizeString(room.summary) ??
      normalizeString(room.description) ??
      null,
    dossierId: toHexMaybe(room.dossierId),
    status: normalizeString(room.status),
    isPublic: room.isPublic === true,
  };
}

function participationOpenForStatus(status: StreamPublicRuntimeStatus) {
  return (
    status === "open_for_questions" ||
    status === "live" ||
    status === "collecting_input" ||
    status === "review_required" ||
    status === "recap_in_progress" ||
    status === "dossier_update_suggested"
  );
}

function shareEnabledForStatus(status: StreamPublicRuntimeStatus) {
  return !["archived", "cancelled", "error"].includes(status);
}

function buildRecapReviewHint(status: StreamPublicRuntimeStatus, pendingCount: number) {
  if (status === "collecting_input") {
    return "Fragen und Hinweise laufen reviewpflichtig ein und erscheinen nicht automatisch als Chat oder amtlicher Stand.";
  }
  if (status === "review_required") {
    return pendingCount > 0
      ? `${pendingCount} neue Hinweise warten auf Prüfung, bevor sie in Anlassraum oder Dossier weiterlaufen.`
      : "Hinweise aus dem Event bleiben im Review-Pfad, bevor weitere Sichtbarkeit entsteht.";
  }
  if (status === "recap_in_progress" || status === "dossier_update_suggested") {
    return "Nachbereitung, offene Fragen und Folgepfade bleiben review-first statt automatisch veröffentlicht.";
  }
  return "Beteiligungssignale bleiben reviewpflichtig und führen nie automatisch zu Publish oder Merge.";
}

export async function buildStreamPublicRuntime(slugOrId: string): Promise<StreamPublicRuntime | null> {
  const session = await fetchSessionBySlugOrId(slugOrId);
  if (!session) return null;

  const eventStatus = resolveSessionStatus(session);
  const playerUrl = normalizeHttpsPlayerUrl(session.playerUrl);
  const mediaStatus = resolveMediaStatus(eventStatus, playerUrl);
  const releasedForPublic = session.visibility === "public" && eventStatus !== "draft";

  const relatedRoom = await findRelatedRoom(session);
  const dossierId = relatedRoom?.dossierId ?? null;
  const [inputDocs, dossier, dossierUpdates, socialQueue] = await Promise.all([
    (await streamPublicInputsCol())
      .find({ streamSessionId: session._id } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray(),
    dossierId ? findDossierByAnyId(dossierId) : Promise.resolve(null),
    dossierId ? buildDossierUpdateReadModel({ dossierId }).catch(() => null) : Promise.resolve(null),
    loadSocialDistributionQueueReadModel({ limit: 60 }).catch(() => null),
  ]);

  const publicInputDocs = inputDocs.filter(isPublicInput);
  const pendingCount = inputDocs.filter(
    (doc) => doc.reviewState === "needs_review" || doc.reviewState === "needs_region_review",
  ).length;
  const hasFollowUpUpdates = Array.isArray(session.followUp?.updates) && session.followUp.updates.length > 0;
  const hasDossierUpdateSuggestion = Boolean(dossierUpdates?.summary.reviewRequired);
  const resolvedStatus = resolveStreamPublicRuntimeStatus({
    session: {
      status: eventStatus,
      isLive: session.isLive,
      endedAt: session.endedAt,
      startsAt: session.startsAt,
      updatedAt: session.updatedAt,
    },
    hasPublicInputPath: releasedForPublic,
    pendingInputCount: pendingCount,
    hasFollowUpUpdates,
    hasDossierUpdateSuggestion,
  });
  const statusMeta = getStreamPublicStatusMeta(resolvedStatus);

  const socialItems = socialQueue?.items.filter((item) => {
    if (dossierId && item.dossierId === dossierId) return true;
    if (relatedRoom?.id && item.anlassraumHref?.includes(relatedRoom.id)) return true;
    return false;
  }) ?? [];
  const latestSocial = socialItems[0] ?? null;
  const latestFollowUp = session.followUp?.updates?.[0] ?? null;
  const slug = derivedSlugOrId(session);
  const sharingAllowed = releasedForPublic && shareEnabledForStatus(resolvedStatus);

  return {
    session: {
      ...session,
      playerUrl,
      id: session._id?.toHexString?.() ?? "",
      slugOrId: slug,
      eventStatus,
      eventStatusLabel: eventStatusLabel(eventStatus),
      mediaStatus,
      mediaStatusLabel: mediaStatusLabel(mediaStatus),
      resolvedStatus,
      statusLabel: statusMeta.label,
      statusDescription: statusMeta.description,
      nextAction: statusMeta.nextAction,
      statusTone: statusMeta.tone,
    },
    context: {
      anlassraumId: relatedRoom?.id ?? null,
      anlassraumTitle: relatedRoom?.title ?? null,
      anlassraumHref: relatedRoom?.id ? `/runden?anlassraumId=${encodeURIComponent(relatedRoom.id)}` : null,
      dossierId,
      dossierTitle: normalizeString(dossier?.meta?.title) ?? normalizeString(dossier?.title) ?? null,
      dossierHref: dossierId ? `/dossier/${encodeURIComponent(dossierId)}` : null,
      swipesHref: session.topicKey
        ? `/swipes?topic=${encodeURIComponent(session.topicKey)}&fromStream=1&stream=${encodeURIComponent(slug)}`
        : "/swipes?fromStream=1",
      shareEnabled: sharingAllowed,
      qrEnabled: sharingAllowed,
    },
    participation: {
      openForInput: releasedForPublic && participationOpenForStatus(resolvedStatus),
      pendingCount,
      visibleCount: publicInputDocs.length,
      questionCount: publicInputDocs.filter((doc) => doc.kind === "question").length,
      sourceHintCount: publicInputDocs.filter(
        (doc) => doc.kind === "source_hint" || doc.kind === "correction",
      ).length,
      latestAt: toIso(publicInputDocs[0]?.createdAt),
      items: publicInputDocs.map((doc) => ({
        id: doc.inputId,
        kind: doc.kind,
        kindLabel: inputKindLabel(doc.kind),
        text: doc.text,
        sourceUrl: normalizeString(doc.sourceUrl),
        reviewState: doc.reviewState,
        visibilityState: doc.visibilityState,
        publicVisibilityLabel: visibilityLabel(doc.visibilityState),
        createdAt: toIso(doc.createdAt) ?? new Date().toISOString(),
        riskHint: doc.riskHint,
      })),
    },
    recap: {
      reviewHint: buildRecapReviewHint(resolvedStatus, pendingCount),
      dossierUpdateHint:
        dossierUpdates?.summary.reviewRequired
          ? `${dossierUpdates.summary.reviewRequired} Dossier-Hinweise sind in Prüfung.`
          : dossierUpdates?.summary.published
            ? `${dossierUpdates.summary.published} Updates sind bereits im Dossier-Kontext sichtbar.`
            : null,
      anlassraumUpdateHint: relatedRoom?.id
        ? "Der zugehörige Anlassraum bleibt die öffentliche Folgefläche für Ergebnisse und weitere Beteiligung."
        : null,
      socialDraftHint: latestSocial
        ? `${latestSocial.originLabel}: ${latestSocial.statusLabel}. Keine externe Veröffentlichung im Stream-Pfad.`
        : null,
      latestFollowUp,
    },
    guardrails: {
      noAutoPublish: true,
      noAutoSocial: true,
      noAutoMerge: true,
      reviewFirstInput: true,
    },
  };
}

export async function listPublicStreamLinksByTopicKeys(topicKeys: string[]): Promise<Map<string, PublicStreamLinkSummary>> {
  const normalized = Array.from(new Set(topicKeys.map((value) => normalizeString(value)).filter(Boolean))) as string[];
  if (normalized.length === 0) return new Map();

  const sessions = await (await streamSessionsCol())
    .find({
      visibility: "public",
      topicKey: { $in: normalized },
      status: { $ne: "cancelled" },
    } as Record<string, unknown>)
    .sort({ isLive: -1, startsAt: 1, updatedAt: -1 })
    .toArray();

  const map = new Map<string, PublicStreamLinkSummary>();
  for (const session of sessions) {
    const topicKey = normalizeString(session.topicKey);
    const eventStatus = resolveSessionStatus(session);
    if (!topicKey || map.has(topicKey) || eventStatus === "draft") continue;

    const resolvedStatus = resolveStreamPublicRuntimeStatus({
      session: {
        status: eventStatus,
        isLive: session.isLive,
        endedAt: session.endedAt,
        startsAt: session.startsAt,
        updatedAt: session.updatedAt,
      },
      hasPublicInputPath: true,
      pendingInputCount: 0,
      hasFollowUpUpdates: Boolean(session.followUp?.updates?.length),
      hasDossierUpdateSuggestion: false,
    });
    map.set(topicKey, {
      id: session._id?.toHexString?.() ?? "",
      slugOrId: derivedSlugOrId(session),
      href: `/stream/${encodeURIComponent(derivedSlugOrId(session))}`,
      title: session.title,
      status: resolvedStatus,
      statusLabel: getStreamPublicStatusMeta(resolvedStatus).label,
      startsAt: toIso(session.startsAt),
    });
  }
  return map;
}

export function buildStreamShareContext(runtime: StreamPublicRuntime) {
  if (!runtime.context.shareEnabled) return null;
  const path = `/stream/${encodeURIComponent(runtime.session.slugOrId)}`;
  return {
    contextKind: "event" as const,
    primaryTargetKind: "companion_public_target" as const,
    canonicalTarget: path,
    qrTarget: path,
    shareTitle: runtime.session.title,
    sharePrompt:
      runtime.participation.openForInput
        ? "Öffne den Event-Kontext per Link oder QR und reiche Fragen, Quellen oder Optionen reviewpflichtig ein."
        : "Öffne den Event-Kontext mit Anlassraum-, Dossier- und Ergebnisanschluss.",
    shareSummary:
      "Link und QR führen in denselben mobilen Beteiligungspfad. Keine automatische Veröffentlichung, kein Live-Chat und keine ungeprüfte Ergebnisbehauptung.",
    socialCandidate: runtime.session.resolvedStatus !== "closed",
    needsReviewBeforeOfficialSocial: true,
    existingContextHint: runtime.recap.reviewHint,
  };
}
