import { createHash } from "node:crypto";
import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import type { MaterialStructuredDraftResult } from "@/features/material/materialStructuredDrafts";

const COLLECTION = "edebatte_material_knowledge_assets";

export type MaterialKnowledgeIdentity = {
  title: string;
  publisher: string | null;
  documentType: string;
  publishedAt: string | null;
  versionLabel: string | null;
  sourceRef: string | null;
  sourceFormat: string | null;
  reviewState: "needs_review" | "approved_internal" | "approved_public_reference";
  ingestedAt: string;
};

export type MaterialKnowledgeProjection = {
  provider: MaterialStructuredDraftResult["provider"];
  themes: string[];
  decisionPoints: string[];
  claimsOrSourceHints: Array<{ text: string; sourceAnchors: string[] }>;
  uncertainties: string[];
  provenance: string[];
  analysisUsage: MaterialStructuredDraftResult["analysisUsage"];
};

export type MaterialKnowledgeAsset = {
  id: string;
  materialId: string;
  contentFingerprint: string;
  characterCount: number;
  identity: MaterialKnowledgeIdentity;
  knowledge: MaterialKnowledgeProjection;
  privateOnly: true;
  reviewRequired: true;
  noAutoPublish: true;
  noAutoGraphWrite: true;
  noAutoMerge: true;
  createdAt: string;
  updatedAt: string;
};

const memory = new Map<string, MaterialKnowledgeAsset>();

export function fingerprintMaterialText(text: string) {
  return createHash("sha256").update(String(text ?? "").trim(), "utf8").digest("hex");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assetIdFor(fingerprint: string) {
  return `material-knowledge:${fingerprint}`;
}

function normalizeIdentity(
  identity: Partial<MaterialKnowledgeIdentity> | null | undefined,
  fallback: { materialId: string; sourceFormat?: string | null },
): MaterialKnowledgeIdentity {
  const now = new Date().toISOString();
  return {
    title: String(identity?.title ?? fallback.materialId).trim() || fallback.materialId,
    publisher: String(identity?.publisher ?? "").trim() || null,
    documentType: String(identity?.documentType ?? "document").trim() || "document",
    publishedAt: String(identity?.publishedAt ?? "").trim() || null,
    versionLabel: String(identity?.versionLabel ?? "").trim() || null,
    sourceRef: String(identity?.sourceRef ?? fallback.materialId).trim() || null,
    sourceFormat: String(identity?.sourceFormat ?? fallback.sourceFormat ?? "").trim() || null,
    reviewState: identity?.reviewState ?? "needs_review",
    ingestedAt: String(identity?.ingestedAt ?? now).trim() || now,
  };
}

function knowledgeProjection(drafts: MaterialStructuredDraftResult): MaterialKnowledgeProjection {
  return {
    provider: drafts.provider,
    themes: clone(drafts.themes),
    decisionPoints: clone(drafts.decisionPoints),
    claimsOrSourceHints: clone(drafts.claimsOrSourceHints),
    uncertainties: clone(drafts.uncertainties),
    provenance: clone(drafts.provenance),
    analysisUsage: clone(drafts.analysisUsage),
  };
}

function legacyKnowledge(doc: any): MaterialKnowledgeProjection | null {
  if (doc?.knowledge) return clone(doc.knowledge) as MaterialKnowledgeProjection;
  if (doc?.structuredDrafts?.status === "generated") {
    return knowledgeProjection(doc.structuredDrafts as MaterialStructuredDraftResult);
  }
  return null;
}

function fromDoc(doc: any, normalizedLength: number): MaterialKnowledgeAsset | null {
  if (!doc || typeof doc.contentFingerprint !== "string") return null;
  const knowledge = legacyKnowledge(doc);
  if (!knowledge) return null;
  const materialId = String(doc.materialId ?? "");
  return {
    id: String(doc._id ?? assetIdFor(doc.contentFingerprint)),
    materialId,
    contentFingerprint: doc.contentFingerprint,
    characterCount: typeof doc.characterCount === "number" ? doc.characterCount : normalizedLength,
    identity: normalizeIdentity(doc.identity, {
      materialId,
      sourceFormat: typeof doc.identity?.sourceFormat === "string" ? doc.identity.sourceFormat : null,
    }),
    knowledge,
    privateOnly: true,
    reviewRequired: true,
    noAutoPublish: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? ""),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? ""),
  };
}

export function buildMaterialKnowledgeReuseText(asset: MaterialKnowledgeAsset) {
  const blocks = [
    `Titel: ${asset.identity.title}`,
    asset.identity.publisher ? `Herausgeber: ${asset.identity.publisher}` : "",
    asset.identity.versionLabel ? `Version/Stand: ${asset.identity.versionLabel}` : "",
    asset.identity.publishedAt ? `Veröffentlicht: ${asset.identity.publishedAt}` : "",
    asset.knowledge.themes.length > 0 ? `Themen:\n${asset.knowledge.themes.map((value) => `- ${value}`).join("\n")}` : "",
    asset.knowledge.decisionPoints.length > 0
      ? `Entscheidungs-/Prüfpunkte:\n${asset.knowledge.decisionPoints.map((value) => `- ${value}`).join("\n")}`
      : "",
    asset.knowledge.claimsOrSourceHints.length > 0
      ? `Quellengebundene Hinweise:\n${asset.knowledge.claimsOrSourceHints
          .map((hint) => `- ${hint.text}\n  Anker: ${hint.sourceAnchors.join(" | ")}`)
          .join("\n")}`
      : "",
    asset.knowledge.uncertainties.length > 0
      ? `Offene/unsichere Punkte:\n${asset.knowledge.uncertainties.map((value) => `- ${value}`).join("\n")}`
      : "",
  ].filter(Boolean);
  return blocks.join("\n\n").trim();
}

export async function getReusableMaterialKnowledgeAsset(text: string): Promise<MaterialKnowledgeAsset | null> {
  const normalized = String(text ?? "").trim();
  if (!normalized) return null;
  const fingerprint = fingerprintMaterialText(normalized);

  if (shouldUseInMemoryMongoFallback()) {
    return clone(memory.get(fingerprint) ?? null);
  }

  const col = await coreCol<any>(COLLECTION);
  const doc = await col.findOne({ contentFingerprint: fingerprint });
  return fromDoc(doc, normalized.length);
}

export async function persistMaterialKnowledgeAsset(input: {
  materialId: string;
  text: string;
  structuredDrafts: MaterialStructuredDraftResult;
  identity?: Partial<MaterialKnowledgeIdentity> | null;
}) {
  if (input.structuredDrafts.status !== "generated") return null;
  const text = String(input.text ?? "").trim();
  const materialId = String(input.materialId ?? "").trim();
  if (!text || !materialId) return null;
  const fingerprint = fingerprintMaterialText(text);
  const now = new Date().toISOString();
  const identity = normalizeIdentity(input.identity, { materialId });
  const knowledge = knowledgeProjection(input.structuredDrafts);
  const record: MaterialKnowledgeAsset = {
    id: assetIdFor(fingerprint),
    materialId,
    contentFingerprint: fingerprint,
    characterCount: text.length,
    identity,
    knowledge,
    privateOnly: true,
    reviewRequired: true,
    noAutoPublish: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    createdAt: now,
    updatedAt: now,
  };

  if (shouldUseInMemoryMongoFallback()) {
    const existing = memory.get(fingerprint);
    if (existing) record.createdAt = existing.createdAt;
    memory.set(fingerprint, clone(record));
    return clone(record);
  }

  const col = await coreCol<any>(COLLECTION);
  await col.createIndex({ contentFingerprint: 1 }, { unique: true }).catch(() => undefined);
  await col.createIndex({ "identity.documentType": 1, "identity.publishedAt": 1 }).catch(() => undefined);
  await col.updateOne(
    { contentFingerprint: fingerprint },
    {
      $set: {
        materialId,
        contentFingerprint: fingerprint,
        characterCount: text.length,
        identity: clone(identity),
        knowledge: clone(knowledge),
        privateOnly: true,
        reviewRequired: true,
        noAutoPublish: true,
        noAutoGraphWrite: true,
        noAutoMerge: true,
        updatedAt: new Date(now),
      },
      $unset: { structuredDrafts: "" },
      $setOnInsert: {
        _id: assetIdFor(fingerprint),
        createdAt: new Date(now),
      },
    },
    { upsert: true },
  );
  return record;
}
