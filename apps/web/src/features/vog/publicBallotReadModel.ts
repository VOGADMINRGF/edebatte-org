import "server-only";

import { coreCol } from "@core/db/triMongo";
import {
  resolveVogPublicBallotLifecycle,
  resolveVogPublicBallotLocales,
  validateVogPublicBallotQuestion,
  type VogOriginMetadata,
  type VogPublicBallotLifecycle,
  type VogPublicBallotLocaleResolution,
  type VogPublicBallotRelease,
} from "@features/vog/publicBallotContract";
import { VoteModel } from "@/models/votes/Vote";

type QrQuestionSetRecord = {
  code?: unknown;
  title?: unknown;
  status?: unknown;
  questions?: unknown;
};

export type VogPublicBallotRecord = {
  code: string;
  setStatus: unknown;
  questionId: string;
  canonicalOptions: string[];
  release: VogPublicBallotRelease;
  lifecycle: VogPublicBallotLifecycle;
};

export type VogPublicBallotResultPass = {
  totalVotes: number;
  openGuestVotes: number;
  verifiedMemberVotes: number;
  optionCounts: Array<{ optionId: string; label: string; count: number }>;
  distributionChannels: Array<{
    source: VogOriginMetadata["source"];
    count: number;
  }>;
  startsAt: string | null;
  closesAt: string | null;
  resultStatus: "public_consultation";
};

export type VogPublicBallotReadModel = {
  code: string;
  questionId: string;
  originId: string;
  originalLocale: string;
  readingLocale: string;
  uiLocale: VogPublicBallotLocaleResolution["uiLocale"];
  outputLocale: string;
  requestedReadingLocale: string | null;
  requestedOutputLocale: string | null;
  readingTranslationStatus: VogPublicBallotLocaleResolution["readingTranslationStatus"];
  outputTranslationStatus: VogPublicBallotLocaleResolution["outputTranslationStatus"];
  availableLocales: string[];
  direction: "ltr" | "rtl";
  lifecycle: VogPublicBallotLifecycle;
  title: string;
  context: string;
  options: Array<{ optionId: string; label: string }>;
  sources: Array<{ id: string; label: string; href: string }>;
  counterPositions: Array<{ id: string; label: string; href: string | null }>;
  accessMode: "public_guest";
  attributionMode: "hidden";
  legitimacyClass: "open_public_consultation";
  ownSelection: string | null;
  ownSelectionLabel: string | null;
  results: VogPublicBallotResultPass | null;
};

export async function loadVogPublicBallotRecord(input: {
  code: string;
  questionId: string;
  now?: Date;
}): Promise<VogPublicBallotRecord | null> {
  const code = input.code.trim();
  const questionId = input.questionId.trim();
  if (!code || !questionId || code.length > 120 || questionId.length > 120) {
    return null;
  }

  const sets = await coreCol<QrQuestionSetRecord>("qr_question_sets");
  const set = await sets.findOne({ code });
  const questions = set && Array.isArray(set.questions) ? set.questions : [];
  const question = questions.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      String((candidate as Record<string, unknown>).id ?? "") === questionId,
  );
  if (!set || !question || typeof question !== "object") return null;

  const validated = validateVogPublicBallotQuestion(question);
  if (!validated) return null;

  return {
    code,
    setStatus: set.status,
    questionId: validated.id,
    canonicalOptions: validated.canonicalOptions,
    release: validated.release,
    lifecycle: resolveVogPublicBallotLifecycle({
      setStatus: set.status,
      release: validated.release,
      now: input.now,
    }),
  };
}

function shouldExposeResults(input: {
  lifecycle: VogPublicBallotLifecycle;
  visibility: VogPublicBallotRelease["resultsVisibility"];
  hasOwnVote: boolean;
}) {
  if (input.visibility === "always") return true;
  return input.hasOwnVote;
}

type ResultRow = {
  _id?: { participationClass?: unknown; choice?: unknown; source?: unknown };
  count?: unknown;
};

async function projectResults(input: {
  record: VogPublicBallotRecord;
  outputLocale: string;
}): Promise<VogPublicBallotResultPass> {
  const votes = await VoteModel();
  const rows = (await votes
    .aggregate<ResultRow>([
      {
        $match: {
          qrSetId: input.record.code,
          qrQuestionId: input.record.questionId,
          participationClass: {
            $in: ["open_guest", "verified_vog_member"],
          },
        },
      },
      {
        $group: {
          _id: {
            participationClass: "$participationClass",
            choice: "$choice",
            source: "$originMetadata.source",
          },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray()) as ResultRow[];

  const optionCounts = new Map<string, number>();
  const distributionChannels = new Map<VogOriginMetadata["source"], number>();
  let openGuestVotes = 0;
  let verifiedMemberVotes = 0;

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    if (!Number.isFinite(count) || count <= 0) continue;
    const participationClass = String(row._id?.participationClass ?? "");
    const choice = String(row._id?.choice ?? "");
    const source = String(row._id?.source ?? "");
    if (
      participationClass !== "open_guest" &&
      participationClass !== "verified_vog_member"
    ) {
      continue;
    }
    if (participationClass === "open_guest") openGuestVotes += count;
    if (participationClass === "verified_vog_member") {
      verifiedMemberVotes += count;
    }
    if (input.record.canonicalOptions.includes(choice)) {
      optionCounts.set(choice, (optionCounts.get(choice) ?? 0) + count);
    }
    if (
      source === "vote4gov" ||
      source === "voiceopengov" ||
      source === "direct"
    ) {
      distributionChannels.set(
        source,
        (distributionChannels.get(source) ?? 0) + count,
      );
    }
  }

  const copy = input.record.release.translations[input.outputLocale];
  return {
    totalVotes: openGuestVotes + verifiedMemberVotes,
    openGuestVotes,
    verifiedMemberVotes,
    optionCounts: input.record.canonicalOptions.map((optionId) => ({
      optionId,
      label: copy.options[optionId],
      count: optionCounts.get(optionId) ?? 0,
    })),
    distributionChannels: [...distributionChannels.entries()].map(
      ([source, count]) => ({ source, count }),
    ),
    startsAt: input.record.release.startsAt?.toISOString() ?? null,
    closesAt: input.record.release.closesAt?.toISOString() ?? null,
    resultStatus: "public_consultation",
  };
}

export async function getVogPublicBallotReadModel(input: {
  code: string;
  questionId: string;
  locale?: unknown;
  readingLocale?: unknown;
  uiLocale?: unknown;
  outputLocale?: unknown;
  guestTokenHash?: string | null;
  now?: Date;
}): Promise<VogPublicBallotReadModel | null> {
  const record = await loadVogPublicBallotRecord(input);
  if (!record) return null;

  const locales = resolveVogPublicBallotLocales({
    release: record.release,
    locale: input.locale,
    readingLocale: input.readingLocale,
    uiLocale: input.uiLocale,
    outputLocale: input.outputLocale,
  });
  const copy = record.release.translations[locales.readingLocale];
  const votes = await VoteModel();
  const ownVote = input.guestTokenHash
    ? await votes.findOne({
        qrSetId: record.code,
        qrQuestionId: record.questionId,
        participationClass: "open_guest",
        sessionId: input.guestTokenHash,
      })
    : null;
  const ownSelection =
    ownVote?.choice && record.canonicalOptions.includes(String(ownVote.choice))
      ? String(ownVote.choice)
      : null;
  const ownSelectionIndex = ownSelection
    ? record.canonicalOptions.indexOf(ownSelection)
    : -1;
  const exposeResults = shouldExposeResults({
    lifecycle: record.lifecycle,
    visibility: record.release.resultsVisibility,
    hasOwnVote: Boolean(ownSelection),
  });

  return {
    code: record.code,
    questionId: record.questionId,
    originId: record.release.originId,
    originalLocale: locales.originalLocale,
    readingLocale: locales.readingLocale,
    uiLocale: locales.uiLocale,
    outputLocale: locales.outputLocale,
    requestedReadingLocale: locales.requestedReadingLocale,
    requestedOutputLocale: locales.requestedOutputLocale,
    readingTranslationStatus: locales.readingTranslationStatus,
    outputTranslationStatus: locales.outputTranslationStatus,
    availableLocales: locales.availableLocales,
    direction: locales.direction,
    lifecycle: record.lifecycle,
    title: copy.title,
    context: copy.context,
    options: record.canonicalOptions.map((optionId) => ({
      optionId,
      label: copy.options[optionId],
    })),
    sources: record.release.sources.map((source) => ({
      id: source.id,
      label: source.labels[locales.readingLocale],
      href: source.href,
    })),
    counterPositions: record.release.counterPositions.map((position) => ({
      id: position.id,
      label: position.labels[locales.readingLocale],
      href: position.href ?? null,
    })),
    accessMode: "public_guest",
    attributionMode: "hidden",
    legitimacyClass: "open_public_consultation",
    ownSelection,
    ownSelectionLabel:
      ownSelectionIndex >= 0
        ? copy.options[record.canonicalOptions[ownSelectionIndex]]
        : null,
    results: exposeResults
      ? await projectResults({ record, outputLocale: locales.outputLocale })
      : null,
  };
}
