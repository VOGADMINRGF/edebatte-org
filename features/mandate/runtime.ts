import {
  coreCol,
  shouldUseInMemoryMongoFallback,
} from "@core/db/triMongo";
import {
  MandateSchema,
  isBindingVoiceOpenGovRepresentationMandate,
  isPublicReadOnlyMandate,
  type Mandate,
} from "./contract";

const DECISION_MANDATES_COLLECTION = "decision_mandates";

export const VOG_PROGRAMME_FEED_CONTRACT_VERSION = "vog-programme-mandate-v1" as const;

export type PublicVoiceOpenGovMandate = Readonly<{
  id: string;
  title: string;
  subject: string;
  publicSummary: string;
  status: Mandate["status"];
  visibility: "public_readonly";
  decision: Mandate["decision"];
  provenance: Mandate["provenance"];
  sourceDossierId: string | null;
  sourceRoundId: string | null;
  sourceAnlassraumId: string | null;
  validFrom: string;
  validUntil: string | null;
  lastUpdatedAt: string;
  isReadOnlyPublic: true;
}>;

export type MandateRuntimeRepo = {
  save(mandate: Mandate): Promise<void>;
  get(id: string): Promise<Mandate | null>;
  listPublicBinding(): Promise<Mandate[]>;
};

let repoSingleton: MandateRuntimeRepo | null = null;
let indexesEnsured = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseStoredMandate(value: unknown): Mandate | null {
  const parsed = MandateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function projectable(mandate: Mandate): boolean {
  return (
    isPublicReadOnlyMandate(mandate) &&
    isBindingVoiceOpenGovRepresentationMandate(mandate)
  );
}

async function mandateCollection() {
  const col = await coreCol<Mandate>(DECISION_MANDATES_COLLECTION);
  if (!indexesEnsured) {
    await Promise.all([
      col.createIndex({ id: 1 }, { unique: true }),
      col.createIndex({ "decision.snapshotId": 1 }, { unique: true }),
      col.createIndex({
        visibility: 1,
        "decision.status": 1,
        "provenance.origin": 1,
        "decision.legitimacy.quorumMet": 1,
        "decision.legitimacy.integrityStatus": 1,
      }),
      col.createIndex({ lastUpdatedAt: -1 }),
    ]);
    indexesEnsured = true;
  }
  return col;
}

function createMongoMandateRuntimeRepo(): MandateRuntimeRepo {
  return {
    async save(input) {
      const mandate = MandateSchema.parse(input);
      const col = await mandateCollection();
      await col.updateOne(
        { id: mandate.id },
        { $set: clone(mandate) as any },
        { upsert: true },
      );
    },

    async get(id) {
      const col = await mandateCollection();
      const doc = await col.findOne({ id });
      return doc ? parseStoredMandate(doc) : null;
    },

    async listPublicBinding() {
      const col = await mandateCollection();
      const docs = await col
        .find({
          visibility: "public_readonly",
          isReadOnlyPublic: true,
          "decision.status": "valid",
          "provenance.origin": "dossier_round_outcome",
          "decision.legitimacy.quorumMet": true,
          "decision.legitimacy.integrityStatus": "verified",
        } as any)
        .sort({ "decision.decidedAt": -1, lastUpdatedAt: -1 })
        .toArray();

      return docs
        .map(parseStoredMandate)
        .filter((mandate): mandate is Mandate => Boolean(mandate))
        .filter(projectable);
    },
  };
}

export function createInMemoryMandateRuntimeRepo(
  seed: readonly Mandate[] = [],
): MandateRuntimeRepo {
  const records = new Map<string, Mandate>();
  for (const item of seed) {
    const mandate = MandateSchema.parse(item);
    records.set(mandate.id, clone(mandate));
  }

  return {
    async save(input) {
      const mandate = MandateSchema.parse(input);
      records.set(mandate.id, clone(mandate));
    },

    async get(id) {
      const item = records.get(id);
      return item ? clone(item) : null;
    },

    async listPublicBinding() {
      return Array.from(records.values())
        .filter(projectable)
        .map(clone)
        .sort((left, right) =>
          String(right.decision.decidedAt ?? "").localeCompare(
            String(left.decision.decidedAt ?? ""),
          ),
        );
    },
  };
}

export function getMandateRuntimeRepo(): MandateRuntimeRepo {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryMandateRuntimeRepo()
    : createMongoMandateRuntimeRepo();
  return repoSingleton;
}

export function setMandateRuntimeRepoForTests(
  repo: MandateRuntimeRepo | null,
): void {
  repoSingleton = repo;
  indexesEnsured = false;
}

export function toPublicVoiceOpenGovMandate(
  mandate: Mandate,
): PublicVoiceOpenGovMandate {
  if (!projectable(mandate)) {
    throw new Error("mandate_not_public_binding");
  }

  return {
    id: mandate.id,
    title: mandate.title,
    subject: mandate.subject,
    publicSummary: mandate.publicSummary,
    status: mandate.status,
    visibility: "public_readonly",
    decision: clone(mandate.decision),
    provenance: clone(mandate.provenance),
    sourceDossierId: mandate.sourceDossierId,
    sourceRoundId: mandate.sourceRoundId,
    sourceAnlassraumId: mandate.sourceAnlassraumId,
    validFrom: mandate.validFrom,
    validUntil: mandate.validUntil,
    lastUpdatedAt: mandate.lastUpdatedAt,
    isReadOnlyPublic: true,
  };
}

export const mandateRuntimeCollectionName = DECISION_MANDATES_COLLECTION;
