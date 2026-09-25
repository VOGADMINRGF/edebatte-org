import { MATERIAL_ANALYSIS_UNIT_CHARS } from "@/features/material/materialStructuredDrafts";

export type MaterialCommercialOperation =
  | "ingest_new_material"
  | "reuse_existing_material"
  | "extend_existing_topic";

export type MaterialEconomicsEstimate = {
  operation: MaterialCommercialOperation;
  characterCount: number;
  internalAnalysisUnits: number;
  commercialCredits: number;
  requiresExplicitApproval: boolean;
  pricingPublished: false;
  checkoutAvailable: false;
  explanation: string;
};

export function estimateMaterialEconomics(input: {
  operation: MaterialCommercialOperation;
  characterCount: number;
}): MaterialEconomicsEstimate {
  const characterCount = Math.max(0, Math.floor(input.characterCount));
  const rawUnits = characterCount === 0 ? 0 : Math.max(1, Math.ceil(characterCount / MATERIAL_ANALYSIS_UNIT_CHARS));

  if (input.operation === "reuse_existing_material") {
    return {
      operation: input.operation,
      characterCount,
      internalAnalysisUnits: 1,
      commercialCredits: 1,
      requiresExplicitApproval: false,
      pricingPublished: false,
      checkoutAvailable: false,
      explanation:
        "Vorhandenes Materialwissen ersetzt die erneute Vollanalyse. Für die konkrete neue Voxy-Ausarbeitung wird nur ein kompakter Retrieval-/Arbeitslauf kalkuliert; die Professional-Layer-Leistung bleibt eigenständig abrechenbar.",
    };
  }

  if (input.operation === "extend_existing_topic") {
    return {
      operation: input.operation,
      characterCount,
      internalAnalysisUnits: rawUnits,
      commercialCredits: Math.max(1, rawUnits),
      requiresExplicitApproval: rawUnits > 1,
      pricingPublished: false,
      checkoutAvailable: false,
      explanation:
        "Neue Quellen oder Perspektiven werden auf bestehendes eDebatte-Wissen aufgesetzt. Retrieval spart Kosten, die neue Analyse und Ausarbeitung bleibt abrechenbar.",
    };
  }

  return {
    operation: input.operation,
    characterCount,
    internalAnalysisUnits: rawUnits,
    commercialCredits: Math.max(1, rawUnits),
    requiresExplicitApproval: rawUnits > 1,
    pricingPublished: false,
    checkoutAvailable: false,
    explanation:
      "Das Material wird erstmals vollständig erschlossen. Interne Analyse-Einheiten steuern Providerkosten; kommerzielle Credits bilden den Produktwert ab und sind bewusst davon getrennt.",
  };
}
