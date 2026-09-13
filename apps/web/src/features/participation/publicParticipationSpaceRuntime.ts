import {
  getParticipationSpacePublishBlockers,
  getParticipationSpacePublishStatusLabel,
  getParticipationSpacePublicVisibilityLabel,
  type ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";
import { listParticipationSpacePublishRecords } from "@/features/create/participationSpaceRuntimeServer";
import {
  getPublicParticipationSpaceFixtureBySlug,
  listPublicParticipationSpaceFixtures,
  type PublicParticipationSpaceFixture,
} from "@/features/participation/fixtures/publicParticipationSpace";
import {
  canShowParticipationPlacePublicly,
  getParticipationPlaceDisplayModeLabel,
} from "@/features/participation/placeFuture";
import { isParticipationSpaceFeedbackPublic, summarizeParticipationSpaceReadiness } from "@/features/participation/spaceContainer";

export type PublicParticipationSpaceRuntimeSource =
  | "runtime"
  | "fixture_fallback"
  | "empty"
  | "blocked_unwired"
  | "error";

export type PublicParticipationSpaceRuntimeStatus = {
  source: PublicParticipationSpaceRuntimeSource;
  totalVisible: number;
  totalRuntimePublished: number;
  fallbackActive: boolean;
  message: string;
};

export type PublicParticipationSpaceRuntimeItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publicHeadline: string;
  publicSummary: string;
  statusLabel: string;
  visibilityLabel: string;
  publicStatusLabel: string;
  feedbackAvailable: boolean;
  openQuestionCount: number;
  minorityPositionCount: number;
  nextStepCount: number;
  updatedAt: string;
  source: Extract<PublicParticipationSpaceRuntimeSource, "runtime" | "fixture_fallback">;
};

type PublicParticipationSpaceRuntimePlace = {
  label: string;
  description: string;
  displayModeLabel: string;
};

type PublicParticipationSpaceRuntimeFeedbackSummary = {
  id: string;
  title: string;
  summary: string;
};

type PublicParticipationSpaceRuntimeMinorityPosition = {
  id: string;
  title: string;
  summary: string;
};

type PublicParticipationSpaceRuntimeNextStep = {
  id: string;
  label: string;
  description: string;
};

export type PublicParticipationSpaceRuntimeDetail =
  PublicParticipationSpaceRuntimeItem & {
    participationQuestion: string | null;
    feedbackTitle: string | null;
    feedbackSummary: string | null;
    topicSummaries: PublicParticipationSpaceRuntimeFeedbackSummary[];
    openQuestions: string[];
    minorityPositions: PublicParticipationSpaceRuntimeMinorityPosition[];
    nextSteps: PublicParticipationSpaceRuntimeNextStep[];
    place: PublicParticipationSpaceRuntimePlace | null;
    releaseNotice: string;
    feedbackNotice: string | null;
    contextNotice: string;
    sourceNotice: string;
    sourceBadgeLabel: string;
    publicLabel: string;
  };

function buildStatus(input: {
  source: PublicParticipationSpaceRuntimeSource;
  totalVisible: number;
  totalRuntimePublished: number;
  message: string;
}): PublicParticipationSpaceRuntimeStatus {
  return {
    ...input,
    fallbackActive: input.source === "fixture_fallback",
  };
}

export function summarizePublicParticipationSpaceRuntimeState(input: {
  source: PublicParticipationSpaceRuntimeSource;
  totalVisible: number;
  totalRuntimePublished: number;
  message?: string | null;
}): PublicParticipationSpaceRuntimeStatus {
  const defaultMessage =
    input.source === "runtime"
      ? "Die öffentliche Route zeigt nur ausdrücklich veröffentlichte Beteiligungsräume."
      : input.source === "fixture_fallback"
        ? "Noch liegt keine veröffentlichte Fassung vor. Deshalb bleibt eine klar gekennzeichnete Vorschau sichtbar."
        : input.source === "empty"
          ? "Weitere Räume erscheinen erst nach Prüfung und Freigabe."
          : input.source === "blocked_unwired"
            ? "Die öffentliche Fassung wird noch vorbereitet."
            : "Die öffentliche Fassung konnte gerade nicht sicher geladen werden.";

  return buildStatus({
    source: input.source,
    totalVisible: input.totalVisible,
    totalRuntimePublished: input.totalRuntimePublished,
    message: String(input.message ?? defaultMessage),
  });
}

export function getPublicParticipationSourceLabel(source: PublicParticipationSpaceRuntimeSource) {
  switch (source) {
    case "runtime":
      return "Veröffentlicht";
    case "fixture_fallback":
      return "Vorschau gekennzeichnet";
    case "blocked_unwired":
      return "Vorbereitung läuft";
    case "error":
      return "Vorübergehend eingeschränkt";
    default:
      return "Noch keine öffentliche Freigabe";
  }
}

function runtimeSourceBadgeLabel(source: PublicParticipationSpaceRuntimeItem["source"]) {
  return getPublicParticipationSourceLabel(source);
}

function buildRuntimeSourceNotice(source: PublicParticipationSpaceRuntimeItem["source"]) {
  return source === "runtime"
    ? "Die öffentliche Route bleibt read-only und zeigt nur ausdrücklich freigegebene Beteiligungsräume. Review-, Audit-, Abuse- und Trust-Details bleiben verborgen."
    : "Dieser Eintrag bleibt als klar gekennzeichnete Vorschau sichtbar, bis eine veröffentlichte Fassung vorliegt.";
}

function buildPublicLabel(source: PublicParticipationSpaceRuntimeItem["source"]) {
  return source === "runtime"
    ? "Dieser Raum wurde redaktionell öffentlich freigegeben."
    : "Dieser Vorschau-Raum bleibt als Beispiel sichtbar, bis eine veröffentlichte Fassung vorliegt.";
}

export function isPublicParticipationSpace(
  record: ParticipationSpacePublishRecord,
): boolean {
  return (
    record.status === "published" &&
    record.visibility === "public" &&
    record.spaceVisibility === "public_read_only" &&
    record.questionGuard?.releaseState === "draft_allowed" &&
    Boolean(record.approvedForActivationAt) &&
    Boolean(record.approvedForActivationBy) &&
    Boolean(record.approvedForPublicationAt) &&
    Boolean(record.approvedForPublicationBy) &&
    getParticipationSpacePublishBlockers(record, "publication").length === 0 &&
    Boolean(record.participationSpaceId) &&
    Boolean(record.participationSpaceSlug)
  );
}

export function stripInternalParticipationSpaceFields(
  record: ParticipationSpacePublishRecord,
): Omit<PublicParticipationSpaceRuntimeDetail, "source" | "place" | "topicSummaries" | "openQuestions" | "minorityPositions" | "nextSteps"> {
  return {
    id: String(record.participationSpaceId ?? record.id),
    slug: String(record.participationSpaceSlug ?? record.id),
    title: record.title,
    summary: record.description,
    publicHeadline: record.publicHeadline,
    publicSummary: record.publicSummary,
    statusLabel: getParticipationSpacePublishStatusLabel(record.status),
    visibilityLabel: getParticipationSpacePublicVisibilityLabel(record.visibility),
    publicStatusLabel: record.publicFeedbackAvailable
      ? "Öffentliche Rückmeldung sichtbar"
      : "Öffentlich freigegeben",
    feedbackAvailable: record.publicFeedbackAvailable,
    openQuestionCount: record.openQuestions.length,
    minorityPositionCount: record.recognizedStandpoints.length,
    nextStepCount: record.argumentLines.length,
    updatedAt: record.updatedAt,
    participationQuestion: record.participationQuestion || null,
    feedbackTitle: record.publicFeedbackAvailable ? record.publicHeadline : null,
    feedbackSummary: record.publicFeedbackAvailable ? record.publicSummary : null,
    releaseNotice: "Dieser Raum wurde redaktionell freigegeben.",
    feedbackNotice: record.publicFeedbackAvailable
      ? null
      : "Weitere öffentliche Detailbausteine erscheinen erst nach Prüfung und Freigabe.",
    contextNotice:
      "Quellen- und Kontextangaben dienen der Einordnung, nicht als automatische Wahrheitsbestätigung.",
    sourceNotice: buildRuntimeSourceNotice("runtime"),
    sourceBadgeLabel: runtimeSourceBadgeLabel("runtime"),
    publicLabel: buildPublicLabel("runtime"),
  };
}

export function mapRuntimeSpaceToPublicItem(
  record: ParticipationSpacePublishRecord,
): PublicParticipationSpaceRuntimeItem {
  const safe = stripInternalParticipationSpaceFields(record);
  return {
    id: safe.id,
    slug: safe.slug,
    title: safe.title,
    summary: safe.summary,
    publicHeadline: safe.publicHeadline,
    publicSummary: safe.publicSummary,
    statusLabel: safe.statusLabel,
    visibilityLabel: safe.visibilityLabel,
    publicStatusLabel: safe.publicStatusLabel,
    feedbackAvailable: safe.feedbackAvailable,
    openQuestionCount: safe.openQuestionCount,
    minorityPositionCount: safe.minorityPositionCount,
    nextStepCount: safe.nextStepCount,
    updatedAt: safe.updatedAt,
    source: "runtime",
  };
}

export function mapRuntimeSpaceToPublicDetail(
  record: ParticipationSpacePublishRecord,
): PublicParticipationSpaceRuntimeDetail {
  return {
    ...mapRuntimeSpaceToPublicItem(record),
    ...stripInternalParticipationSpaceFields(record),
    source: "runtime",
    place: null,
    topicSummaries: [],
    openQuestions: [],
    minorityPositions: [],
    nextSteps: [],
  };
}

function mapFixtureToPublicItem(
  fixture: PublicParticipationSpaceFixture,
): PublicParticipationSpaceRuntimeItem {
  const readiness = summarizeParticipationSpaceReadiness(fixture.space);
  return {
    id: fixture.space.id,
    slug: fixture.space.slug,
    title: fixture.space.title,
    summary: fixture.space.summary,
    publicHeadline: fixture.space.publicSummary.headline,
    publicSummary: fixture.space.publicSummary.shortSummary,
    statusLabel: readiness.statusLabel,
    visibilityLabel: readiness.visibilityLabel,
    publicStatusLabel: fixture.space.publicSummary.statusLabel,
    feedbackAvailable: fixture.space.publicSummary.feedbackAvailable,
    openQuestionCount: fixture.space.publicSummary.openQuestionCount,
    minorityPositionCount: fixture.space.publicSummary.minorityPositionCount,
    nextStepCount: fixture.space.publicSummary.nextStepCount,
    updatedAt: fixture.space.publicSummary.lastUpdatedAt,
    source: "fixture_fallback",
  };
}

function mapFixtureToPublicDetail(
  fixture: PublicParticipationSpaceFixture,
): PublicParticipationSpaceRuntimeDetail {
  const item = mapFixtureToPublicItem(fixture);
  const canShowFeedback = isParticipationSpaceFeedbackPublic(fixture.space);
  const publicPlace =
    fixture.place && canShowParticipationPlacePublicly(fixture.place)
      ? {
          label: fixture.place.label,
          description: fixture.place.description,
          displayModeLabel: getParticipationPlaceDisplayModeLabel(
            fixture.place.displayMode,
          ),
        }
      : null;

  return {
    ...item,
    participationQuestion: fixture.space.publicSummary.headline,
    feedbackTitle: canShowFeedback ? fixture.feedback.title : null,
    feedbackSummary: canShowFeedback ? fixture.feedback.summary : null,
    topicSummaries: canShowFeedback
      ? fixture.feedback.topicSummaries.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
        }))
      : [],
    openQuestions: canShowFeedback
      ? fixture.feedback.openQuestions.map((item) => item.question)
      : [],
    minorityPositions: canShowFeedback
      ? fixture.feedback.minorityPositions.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
        }))
      : [],
    nextSteps: canShowFeedback
      ? fixture.feedback.nextSteps.map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
        }))
      : [],
    place: publicPlace,
    releaseNotice: buildPublicLabel("fixture_fallback"),
    feedbackNotice: canShowFeedback
      ? null
      : fixture.space.status === "feedback_prepared"
        ? "Eine öffentliche Rückmeldung ist vorbereitet, aber noch nicht als öffentliche Einordnung sichtbar."
        : "Für diesen Beteiligungsraum ist aktuell noch keine öffentliche Rückmeldung sichtbar.",
    contextNotice:
      "Quellen- und Kontextangaben dienen der Einordnung, nicht als automatische Wahrheitsbestätigung.",
    sourceNotice: buildRuntimeSourceNotice("fixture_fallback"),
    sourceBadgeLabel: runtimeSourceBadgeLabel("fixture_fallback"),
    publicLabel: buildPublicLabel("fixture_fallback"),
  };
}

export async function listPublishedParticipationSpaces(input?: {
  limit?: number;
  allowFixtureFallback?: boolean;
}): Promise<{
  items: PublicParticipationSpaceRuntimeItem[];
  status: PublicParticipationSpaceRuntimeStatus;
}> {
  const limit = input?.limit ?? 40;
  const allowFixtureFallback = input?.allowFixtureFallback !== false;

  try {
    const records = await listParticipationSpacePublishRecords(limit);
    const published = records.filter(isPublicParticipationSpace);

    if (published.length > 0) {
      return {
        items: published.map(mapRuntimeSpaceToPublicItem),
        status: summarizePublicParticipationSpaceRuntimeState({
          source: "runtime",
          totalVisible: published.length,
          totalRuntimePublished: published.length,
        }),
      };
    }
  } catch {
    if (!allowFixtureFallback) {
      return {
        items: [],
        status: summarizePublicParticipationSpaceRuntimeState({
          source: "error",
          totalVisible: 0,
          totalRuntimePublished: 0,
        }),
      };
    }
  }

  const fixtures = allowFixtureFallback
    ? listPublicParticipationSpaceFixtures().slice(0, limit)
    : [];

  if (fixtures.length > 0) {
    return {
      items: fixtures.map(mapFixtureToPublicItem),
      status: summarizePublicParticipationSpaceRuntimeState({
        source: "fixture_fallback",
        totalVisible: fixtures.length,
        totalRuntimePublished: 0,
      }),
    };
  }

  return {
    items: [],
    status: summarizePublicParticipationSpaceRuntimeState({
      source: "empty",
      totalVisible: 0,
      totalRuntimePublished: 0,
    }),
  };
}

export async function getPublishedParticipationSpaceBySlugOrId(
  slugOrId: string,
  input?: { allowFixtureFallback?: boolean },
): Promise<{
  detail: PublicParticipationSpaceRuntimeDetail | null;
  status: PublicParticipationSpaceRuntimeStatus;
}> {
  const allowFixtureFallback = input?.allowFixtureFallback !== false;

  try {
    const records = await listParticipationSpacePublishRecords(80);
    const published = records.filter(isPublicParticipationSpace);
    const match = published.find(
      (record) =>
        record.participationSpaceSlug === slugOrId ||
        record.participationSpaceId === slugOrId,
    );

    if (match) {
      return {
        detail: mapRuntimeSpaceToPublicDetail(match),
        status: summarizePublicParticipationSpaceRuntimeState({
          source: "runtime",
          totalVisible: published.length,
          totalRuntimePublished: published.length,
        }),
      };
    }

    if (published.length > 0 || !allowFixtureFallback) {
      return {
        detail: null,
        status: summarizePublicParticipationSpaceRuntimeState({
          source: published.length > 0 ? "runtime" : "empty",
          totalVisible: published.length,
          totalRuntimePublished: published.length,
        }),
      };
    }
  } catch {
    if (!allowFixtureFallback) {
      return {
        detail: null,
        status: summarizePublicParticipationSpaceRuntimeState({
          source: "error",
          totalVisible: 0,
          totalRuntimePublished: 0,
        }),
      };
    }
  }

  const fixture = getPublicParticipationSpaceFixtureBySlug(slugOrId);
  if (fixture) {
    return {
      detail: mapFixtureToPublicDetail(fixture),
      status: summarizePublicParticipationSpaceRuntimeState({
        source: "fixture_fallback",
        totalVisible: 1,
        totalRuntimePublished: 0,
      }),
    };
  }

  return {
    detail: null,
    status: summarizePublicParticipationSpaceRuntimeState({
      source: "empty",
      totalVisible: 0,
      totalRuntimePublished: 0,
    }),
  };
}
