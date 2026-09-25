import crypto from "node:crypto";
import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import type { MaterialCommercialOperation, MaterialEconomicsEstimate } from "./materialKnowledgeEconomics";
import type { MaterialStructuredDraftResult } from "./materialStructuredDrafts";

const COLLECTION = "edebatte_material_economics_ledger";

export type MaterialEconomicsLedgerEntry = {
  id: string;
  materialId: string;
  actorId: string;
  organizationId: string | null;
  operation: MaterialCommercialOperation;
  provider: MaterialStructuredDraftResult["provider"];
  status: MaterialStructuredDraftResult["status"];
  characterCount: number;
  internalAnalysisUnits: number;
  commercialCreditsQuoted: number;
  commercialCreditsCharged: 0;
  chargeState: "not_charged";
  reusedExistingKnowledge: boolean;
  reuseSourceAssetId: string | null;
  estimatedProviderCostEur: number | null;
  actualProviderCostEur: number | null;
  pricingPolicySource: "go_to_market_packaging";
  checkoutAvailable: false;
  pricingPublished: false;
  noTruthPricing: true;
  noSignalPricing: true;
  noPriorityPricing: true;
  createdAt: string;
};

const memory: MaterialEconomicsLedgerEntry[] = [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function appendMaterialEconomicsLedger(input: {
  materialId: string;
  actorId: string;
  organizationId?: string | null;
  economics: MaterialEconomicsEstimate;
  drafts: MaterialStructuredDraftResult;
  reusedExistingKnowledge: boolean;
  reuseSourceAssetId?: string | null;
  estimatedProviderCostEur?: number | null;
  actualProviderCostEur?: number | null;
}) {
  const materialId = String(input.materialId ?? "").trim();
  const actorId = String(input.actorId ?? "").trim();
  if (!materialId || !actorId) return null;

  const entry: MaterialEconomicsLedgerEntry = {
    id: `material-economics-${crypto.randomUUID()}`,
    materialId,
    actorId,
    organizationId: String(input.organizationId ?? "").trim() || null,
    operation: input.economics.operation,
    provider: input.drafts.provider,
    status: input.drafts.status,
    characterCount: input.economics.characterCount,
    internalAnalysisUnits: input.economics.internalAnalysisUnits,
    commercialCreditsQuoted: input.economics.commercialCredits,
    commercialCreditsCharged: 0,
    chargeState: "not_charged",
    reusedExistingKnowledge: input.reusedExistingKnowledge,
    reuseSourceAssetId: String(input.reuseSourceAssetId ?? "").trim() || null,
    estimatedProviderCostEur:
      typeof input.estimatedProviderCostEur === "number" ? input.estimatedProviderCostEur : null,
    actualProviderCostEur:
      typeof input.actualProviderCostEur === "number" ? input.actualProviderCostEur : null,
    pricingPolicySource: "go_to_market_packaging",
    checkoutAvailable: false,
    pricingPublished: false,
    noTruthPricing: true,
    noSignalPricing: true,
    noPriorityPricing: true,
    createdAt: new Date().toISOString(),
  };

  if (shouldUseInMemoryMongoFallback()) {
    memory.push(clone(entry));
    return clone(entry);
  }

  const col = await coreCol<any>(COLLECTION);
  await col.insertOne({
    _id: entry.id,
    ...clone(entry),
    createdAt: new Date(entry.createdAt),
  });
  return entry;
}

export async function listMaterialEconomicsLedgerForTests() {
  return clone(memory);
}

export function resetMaterialEconomicsLedgerForTests() {
  memory.splice(0, memory.length);
}
