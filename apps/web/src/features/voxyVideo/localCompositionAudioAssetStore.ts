import "server-only";

import { resolve, sep } from "node:path";
import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import type {
  VoxyLocalCompositionAudioAsset,
  VoxyLocalCompositionCaptionCue,
} from "./localCompositionRuntime";
import { isVoxyVideoOutputLocale } from "./voiceLocaleMatrix";

export const VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION =
  "voxy-local-composition-audio-input-v1" as const;

export type VoxyLocalCompositionAudioChapterTiming = {
  chapterId: string;
  durationMs: number;
};

export type VoxyLocalCompositionAudioInputRecord = {
  version: typeof VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION;
  assetId: string;
  artifactId: string;
  briefingId: string;
  scriptVersion: string;
  storyPlanId: string;
  storyPlanRevision: number;
  locale: string;
  voiceProfileId: string;
  voiceUsageApproved: true;
  fallbackLocale: null;
  storageKey: string;
  sha256: string;
  durationMs: number;
  timelineVersion: string;
  chapterTimings: VoxyLocalCompositionAudioChapterTiming[];
  captionCues: VoxyLocalCompositionCaptionCue[];
  approvalRef: string;
  approvedByUserId: string;
  approvedAt: string;
  createdAt: string;
  reviewRequired: true;
  externalProviderUsed: false;
  autoRender: false;
  autoPublish: false;
};

export type VoxyLocalCompositionAudioInputPersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
};

export type VoxyLocalCompositionAudioInputRepository = {
  registerOrGet(
    record: VoxyLocalCompositionAudioInputRecord,
  ): Promise<VoxyLocalCompositionAudioInputRecord>;
  getByAssetId(assetId: string): Promise<VoxyLocalCompositionAudioInputRecord | null>;
  listForBinding(input: {
    artifactId: string;
    briefingId: string;
    scriptVersion: string;
    locale: string;
    limit?: number;
  }): Promise<VoxyLocalCompositionAudioInputRecord[]>;
  getPersistenceState(): VoxyLocalCompositionAudioInputPersistenceState;
};

const COLLECTION = "voxy_local_composition_audio_inputs";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;
const SAFE_STORAGE_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/;
const MIN_AUDIO_DURATION_MS = 1_500;
const MAX_AUDIO_DURATION_MS = 1_800_000;

let repoSingleton: VoxyLocalCompositionAudioInputRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function validId(value: unknown): boolean {
  const id = normalized(value);
  return SAFE_ID.test(id) && !id.includes("..") && !id.includes("/") && !id.includes("\\");
}

function validStorageKey(value: unknown): boolean {
  const key = String(value ?? "").trim();
  if (!SAFE_STORAGE_KEY.test(key) || key.startsWith("/") || key.includes("\\")) return false;
  return key.split("/").every((segment) => Boolean(segment) && segment !== "." && segment !== "..");
}

function stableComparable(record: VoxyLocalCompositionAudioInputRecord) {
  return JSON.stringify({
    ...record,
    createdAt: undefined,
  });
}

export function validateVoxyLocalCompositionAudioInputRecord(
  record: VoxyLocalCompositionAudioInputRecord,
): string[] {
  const errors: string[] = [];
  if (record.version !== VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION) {
    errors.push("audio_input_version_invalid");
  }
  for (const [name, value] of [
    ["asset", record.assetId],
    ["artifact", record.artifactId],
    ["briefing", record.briefingId],
    ["script_version", record.scriptVersion],
    ["story_plan", record.storyPlanId],
    ["voice_profile", record.voiceProfileId],
    ["timeline_version", record.timelineVersion],
    ["approval_ref", record.approvalRef],
    ["approved_by", record.approvedByUserId],
  ] as const) {
    if (!validId(value)) errors.push(`${name}_id_invalid`);
  }
  if (!Number.isInteger(record.storyPlanRevision) || record.storyPlanRevision < 1) {
    errors.push("story_plan_revision_invalid");
  }
  const locale = normalized(record.locale).toLowerCase();
  if (!isVoxyVideoOutputLocale(locale)) errors.push("audio_input_locale_invalid");
  if (record.voiceUsageApproved !== true || record.fallbackLocale !== null) {
    errors.push("audio_input_voice_approval_invalid");
  }
  if (!validStorageKey(record.storageKey)) errors.push("audio_input_storage_key_invalid");
  if (!SHA256.test(normalized(record.sha256).toLowerCase())) errors.push("audio_input_sha256_invalid");
  if (
    !Number.isInteger(record.durationMs) ||
    record.durationMs < MIN_AUDIO_DURATION_MS ||
    record.durationMs > MAX_AUDIO_DURATION_MS
  ) {
    errors.push("audio_input_duration_invalid");
  }
  if (!ISO_DATE.test(record.approvedAt) || !ISO_DATE.test(record.createdAt)) {
    errors.push("audio_input_timestamp_invalid");
  }
  if (
    record.reviewRequired !== true ||
    record.externalProviderUsed !== false ||
    record.autoRender !== false ||
    record.autoPublish !== false
  ) {
    errors.push("audio_input_guardrails_broken");
  }

  const chapterIds = new Set<string>();
  let chapterDuration = 0;
  for (const timing of record.chapterTimings) {
    if (!validId(timing.chapterId) || chapterIds.has(timing.chapterId)) {
      errors.push(`audio_input_chapter_id_invalid_or_duplicate:${timing.chapterId}`);
    }
    chapterIds.add(timing.chapterId);
    if (!Number.isInteger(timing.durationMs) || timing.durationMs < MIN_AUDIO_DURATION_MS) {
      errors.push(`audio_input_chapter_duration_invalid:${timing.chapterId}`);
    }
    chapterDuration += Number.isFinite(timing.durationMs) ? timing.durationMs : 0;
  }
  if (record.chapterTimings.length === 0) errors.push("audio_input_chapter_timings_missing");
  if (chapterDuration !== record.durationMs) errors.push("audio_input_chapter_duration_mismatch");

  const cueIds = new Set<string>();
  let cursor = 0;
  for (const cue of record.captionCues) {
    if (!validId(cue.id) || cueIds.has(cue.id)) {
      errors.push(`audio_input_caption_id_invalid_or_duplicate:${cue.id}`);
    }
    cueIds.add(cue.id);
    if (!normalized(cue.text)) errors.push(`audio_input_caption_text_missing:${cue.id}`);
    if (
      !Number.isInteger(cue.startMs) ||
      !Number.isInteger(cue.endMs) ||
      cue.startMs !== cursor ||
      cue.endMs <= cue.startMs
    ) {
      errors.push(`audio_input_caption_timeline_invalid:${cue.id}`);
    }
    cursor = cue.endMs;
  }
  if (record.captionCues.length === 0) errors.push("audio_input_caption_cues_missing");
  if (cursor !== record.durationMs) errors.push("audio_input_caption_duration_mismatch");

  return Array.from(new Set(errors));
}

export function assertVoxyLocalCompositionAudioInputRecord(
  record: VoxyLocalCompositionAudioInputRecord,
): VoxyLocalCompositionAudioInputRecord {
  const errors = validateVoxyLocalCompositionAudioInputRecord(record);
  if (errors.length) {
    throw new Error(`voxy_local_composition_audio_input_invalid:${errors.join(",")}`);
  }
  return record;
}

export function resolveVoxyLocalCompositionAudioAssetFromRecord(input: {
  record: VoxyLocalCompositionAudioInputRecord;
  trustedAudioRoot: string;
}): VoxyLocalCompositionAudioAsset {
  assertVoxyLocalCompositionAudioInputRecord(input.record);
  const allowedRoot = resolve(input.trustedAudioRoot);
  const absolutePath = resolve(allowedRoot, input.record.storageKey);
  if (absolutePath !== allowedRoot && !absolutePath.startsWith(`${allowedRoot}${sep}`)) {
    throw new Error("voxy_local_composition_audio_input_outside_trusted_root");
  }
  return {
    assetId: input.record.assetId,
    absolutePath,
    allowedRoot,
    sha256: input.record.sha256.toLowerCase(),
    durationMs: input.record.durationMs,
  };
}

async function ensureIndexes() {
  if (indexesReady || shouldUseInMemoryMongoFallback()) return;
  const col = await coreCol<any>(COLLECTION);
  await Promise.all([
    col.createIndex({ assetId: 1 }, { unique: true }),
    col.createIndex(
      { artifactId: 1, briefingId: 1, scriptVersion: 1, locale: 1, createdAt: -1 },
    ),
    col.createIndex({ storyPlanId: 1, storyPlanRevision: 1, locale: 1 }),
    col.createIndex({ sha256: 1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}

function persistentState(): VoxyLocalCompositionAudioInputPersistenceState {
  return {
    mode: "persistent_primary",
    productionTruth: true,
    restartReconstructable: true,
    deploymentReconstructable: true,
  };
}

function fallbackState(): VoxyLocalCompositionAudioInputPersistenceState {
  return {
    mode: "in_memory_fallback",
    productionTruth: false,
    restartReconstructable: false,
    deploymentReconstructable: false,
  };
}

function createMongoRepository(): VoxyLocalCompositionAudioInputRepository {
  return {
    async registerOrGet(record) {
      assertVoxyLocalCompositionAudioInputRecord(record);
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      await col.updateOne(
        { _id: record.assetId },
        {
          $setOnInsert: {
            _id: record.assetId,
            assetId: record.assetId,
            artifactId: record.artifactId,
            briefingId: record.briefingId,
            scriptVersion: record.scriptVersion,
            storyPlanId: record.storyPlanId,
            storyPlanRevision: record.storyPlanRevision,
            locale: record.locale.toLowerCase(),
            sha256: record.sha256.toLowerCase(),
            createdAt: record.createdAt,
            record: clone({
              ...record,
              locale: record.locale.toLowerCase(),
              sha256: record.sha256.toLowerCase(),
            }),
          } as any,
        },
        { upsert: true },
      );
      const doc = await col.findOne({ _id: record.assetId });
      const persisted = clone((doc?.record ?? record) as VoxyLocalCompositionAudioInputRecord);
      if (stableComparable(persisted) !== stableComparable(record)) {
        throw new Error("voxy_local_composition_audio_input_immutable_conflict");
      }
      return persisted;
    },
    async getByAssetId(assetId) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      const doc = await col.findOne({ _id: normalized(assetId) });
      return doc?.record
        ? clone(doc.record as VoxyLocalCompositionAudioInputRecord)
        : null;
    },
    async listForBinding(input) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      const docs = await col
        .find({
          artifactId: normalized(input.artifactId),
          briefingId: normalized(input.briefingId),
          scriptVersion: normalized(input.scriptVersion),
          locale: normalized(input.locale).toLowerCase(),
        })
        .sort({ createdAt: -1, _id: 1 })
        .limit(Math.max(1, Math.min(50, Math.trunc(input.limit ?? 20))))
        .toArray();
      return docs.flatMap((doc) =>
        doc?.record ? [clone(doc.record as VoxyLocalCompositionAudioInputRecord)] : [],
      );
    },
    getPersistenceState: persistentState,
  };
}

export function createInMemoryVoxyLocalCompositionAudioInputRepository(
  seed: VoxyLocalCompositionAudioInputRecord[] = [],
): VoxyLocalCompositionAudioInputRepository {
  const records = new Map<string, VoxyLocalCompositionAudioInputRecord>();
  for (const record of seed) {
    assertVoxyLocalCompositionAudioInputRecord(record);
    records.set(record.assetId, clone(record));
  }
  return {
    async registerOrGet(record) {
      assertVoxyLocalCompositionAudioInputRecord(record);
      const existing = records.get(record.assetId);
      if (existing) {
        if (stableComparable(existing) !== stableComparable(record)) {
          throw new Error("voxy_local_composition_audio_input_immutable_conflict");
        }
        return clone(existing);
      }
      records.set(record.assetId, clone(record));
      return clone(record);
    },
    async getByAssetId(assetId) {
      const record = records.get(normalized(assetId));
      return record ? clone(record) : null;
    },
    async listForBinding(input) {
      return Array.from(records.values())
        .filter(
          (record) =>
            record.artifactId === normalized(input.artifactId) &&
            record.briefingId === normalized(input.briefingId) &&
            record.scriptVersion === normalized(input.scriptVersion) &&
            record.locale.toLowerCase() === normalized(input.locale).toLowerCase(),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Math.max(1, Math.min(50, Math.trunc(input.limit ?? 20))))
        .map(clone);
    },
    getPersistenceState: fallbackState,
  };
}

function getRepository() {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryVoxyLocalCompositionAudioInputRepository()
    : createMongoRepository();
  return repoSingleton;
}

export function getVoxyLocalCompositionAudioInputRepository() {
  return getRepository();
}

export function setVoxyLocalCompositionAudioInputRepositoryForTests(
  repository: VoxyLocalCompositionAudioInputRepository,
) {
  repoSingleton = repository;
}
