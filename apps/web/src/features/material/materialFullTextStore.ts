import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";

const COLLECTION = "edebatte_material_full_text";
export const MATERIAL_FULL_TEXT_MAX_CHARS = 2_000_000;

type MaterialFullTextRecord = {
  materialId: string;
  text: string;
  characterCount: number;
  extractedBy: string | null;
  sourceFormat: string | null;
  privateOnly: true;
  reviewRequired: true;
  noAutoPublish: true;
};

const memory = new Map<string, MaterialFullTextRecord>();

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > MATERIAL_FULL_TEXT_MAX_CHARS) {
    throw new Error("material_full_text_too_large");
  }
  return text;
}

export async function persistMaterialFullText(input: {
  materialId: string;
  text: string | null | undefined;
  extractedBy?: string | null;
  sourceFormat?: string | null;
}) {
  const materialId = String(input.materialId ?? "").trim();
  const text = normalizeText(input.text);
  if (!materialId || !text) return { stored: false, mode: "none" as const };

  const record: MaterialFullTextRecord = {
    materialId,
    text,
    characterCount: text.length,
    extractedBy: String(input.extractedBy ?? "").trim() || null,
    sourceFormat: String(input.sourceFormat ?? "").trim() || null,
    privateOnly: true,
    reviewRequired: true,
    noAutoPublish: true,
  };

  if (shouldUseInMemoryMongoFallback()) {
    memory.set(materialId, record);
    return { stored: true, mode: "in_memory" as const, characterCount: text.length };
  }

  const col = await coreCol<any>(COLLECTION);
  await col.updateOne(
    { _id: materialId },
    {
      $set: {
        ...record,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return { stored: true, mode: "persistent" as const, characterCount: text.length };
}

export async function getMaterialFullText(materialId: string) {
  const id = String(materialId ?? "").trim();
  if (!id) return null;

  if (shouldUseInMemoryMongoFallback()) {
    return memory.get(id)?.text ?? null;
  }

  const col = await coreCol<any>(COLLECTION);
  const doc = await col.findOne({ _id: id });
  return typeof doc?.text === "string" ? doc.text : null;
}

export async function getMaterialFullTextRecord(materialId: string): Promise<MaterialFullTextRecord | null> {
  const id = String(materialId ?? "").trim();
  if (!id) return null;
  if (shouldUseInMemoryMongoFallback()) return memory.get(id) ?? null;
  const col = await coreCol<any>(COLLECTION);
  const doc = await col.findOne({ _id: id });
  if (typeof doc?.text !== "string") return null;
  return {
    materialId: id,
    text: doc.text,
    characterCount: typeof doc.characterCount === "number" ? doc.characterCount : doc.text.length,
    extractedBy: typeof doc.extractedBy === "string" ? doc.extractedBy : null,
    sourceFormat: typeof doc.sourceFormat === "string" ? doc.sourceFormat : null,
    privateOnly: true,
    reviewRequired: true,
    noAutoPublish: true,
  };
}
