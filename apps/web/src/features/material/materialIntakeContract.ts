export const MATERIAL_INTAKE_TYPES = [
  "text",
  "pdf",
  "upload",
  "document_url",
  "youtube_video",
  "video",
  "audio",
  "image",
  "source_snapshot",
] as const;

export type MaterialIntakeType = (typeof MATERIAL_INTAKE_TYPES)[number];

export const MATERIAL_INTAKE_STATUSES = [
  "submitted",
  "scan_needed",
  "extraction_pending",
  "review_needed",
  "internal_usable",
  "public_referenceable",
  "rejected",
  "archived",
] as const;

export type MaterialIntakeStatus = (typeof MATERIAL_INTAKE_STATUSES)[number];

export const MATERIAL_INTAKE_RISK_FLAGS = [
  "pii_possible",
  "copyright_review_required",
  "malware_scan_required",
  "authenticity_review_required",
  "media_rights_review_required",
  "source_context_missing",
  "extraction_missing",
  "raw_material_private",
] as const;

export type MaterialIntakeRiskFlag = (typeof MATERIAL_INTAKE_RISK_FLAGS)[number];

export type MaterialIntakeGuardrails = {
  noAutoResearch: true;
  noAutoDeepSearch: true;
  noAutoNotebook: true;
  noAutoGemini: true;
  noAutoPublish: true;
  noAutoPublicOfficial: true;
  rawMaterialNeverPublic: true;
  reviewRequiredBeforePublicReference: true;
};

export type MaterialIntakeSourceTruth =
  | "request_metadata"
  | "persistent_material_metadata_store"
  | "persistent_material_store"
  | "local_pending"
  | "external_extraction_pending";

export type MaterialIntakeInputItem = {
  id: string;
  kind: string;
  label: string;
  url: string | null;
  uploadId: string | null;
  mimeType: string | null;
  fileName: string | null;
  text: string | null;
  pageRef: string | null;
  timestampRef: string | null;
  extractedBy: string | null;
  extractionStatus: "full" | "partial" | "none";
};

export type MaterialIntakeItem = {
  id: string;
  type: MaterialIntakeType;
  label: string;
  status: MaterialIntakeStatus;
  sourceTruth: MaterialIntakeSourceTruth;
  url: string | null;
  uploadId: string | null;
  mimeType: string | null;
  fileName: string | null;
  extractedBy: string | null;
  extractionStatus: "full" | "partial" | "none";
  riskFlags: MaterialIntakeRiskFlag[];
  reviewRequired: true;
  publicReferenceAllowed: boolean;
  guardrails: MaterialIntakeGuardrails;
};

export type MaterialIntakeContract = {
  items: MaterialIntakeItem[];
  statusCounts: Record<MaterialIntakeStatus, number>;
  riskFlags: MaterialIntakeRiskFlag[];
  reviewRequired: boolean;
  productionTruth: boolean;
  storageMode:
    | "persistent_material_store"
    | "persistent_metadata_store"
    | "request_metadata_only"
    | "local_pending";
  extractionMode:
    | "none"
    | "submitted_text_only"
    | "local_document_extraction"
    | "external_extraction_pending";
  guardrails: MaterialIntakeGuardrails;
};

export type MaterialIntakeDashboardState =
  | "verification_required"
  | "limited_intake"
  | "ready_for_review"
  | "material_pending_review";

export type MaterialIntakeDashboardSummary = {
  currentState: MaterialIntakeDashboardState;
  statusLabel: string;
  nextStepTitle: string;
  nextStepBody: string;
  storeLabel: string;
  productionTruth: boolean;
  entitlementRequired: boolean;
  entitlementScope: "dossier_studio";
  productiveWorkflowEnabled: boolean;
  items: MaterialIntakeItem[];
  riskFlags: MaterialIntakeRiskFlag[];
  guardrails: MaterialIntakeGuardrails;
};

export type MaterialIntakeAnalyzeManifest = {
  summary: string;
  evidenceItems: Array<Record<string, unknown>>;
  intake: MaterialIntakeContract;
};

const MATERIAL_INTAKE_GUARDRAILS: MaterialIntakeGuardrails = {
  noAutoResearch: true,
  noAutoDeepSearch: true,
  noAutoNotebook: true,
  noAutoGemini: true,
  noAutoPublish: true,
  noAutoPublicOfficial: true,
  rawMaterialNeverPublic: true,
  reviewRequiredBeforePublicReference: true,
};

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function hasPossiblePii(value: string | null): boolean {
  if (!value) return false;
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /\+?\d[\d\s()./-]{7,}\d/.test(value)
  );
}

function materialTypeForItem(item: MaterialIntakeInputItem): MaterialIntakeType {
  const haystack = `${item.kind} ${item.mimeType ?? ""} ${item.fileName ?? ""} ${item.url ?? ""}`.toLowerCase();
  if (haystack.includes("youtube.com") || haystack.includes("youtu.be") || item.kind === "youtube_url") {
    return "youtube_video";
  }
  if (haystack.includes("pdf") || item.kind === "pdf_document") return "pdf";
  if (haystack.includes("image/")) return "image";
  if (haystack.includes("audio/")) return "audio";
  if (haystack.includes("video/")) return "video";
  if (item.kind === "web_document" || item.url) return "document_url";
  if (item.kind.includes("snapshot")) return "source_snapshot";
  return item.uploadId || item.fileName || item.mimeType ? "upload" : "text";
}

function statusForItem(item: MaterialIntakeInputItem, type: MaterialIntakeType): MaterialIntakeStatus {
  if (type === "upload" || type === "pdf" || type === "video" || type === "audio" || type === "image") {
    if (item.extractionStatus === "full") return "internal_usable";
    if (item.text?.trim()) return "review_needed";
    return "scan_needed";
  }
  if (type === "youtube_video" || type === "document_url" || type === "source_snapshot") {
    if (item.extractionStatus === "full") return "internal_usable";
    if (item.text?.trim()) return "review_needed";
    return "extraction_pending";
  }
  if (item.text?.trim()) return "review_needed";
  return "submitted";
}

function riskFlagsForItem(item: MaterialIntakeInputItem, type: MaterialIntakeType): MaterialIntakeRiskFlag[] {
  const risks: MaterialIntakeRiskFlag[] = [
    "copyright_review_required",
    "authenticity_review_required",
    "raw_material_private",
  ];
  if (hasPossiblePii([item.text, item.label, item.fileName].filter(Boolean).join(" "))) {
    risks.push("pii_possible");
  }
  if (type === "upload" || type === "pdf" || type === "video" || type === "audio" || type === "image") {
    risks.push("malware_scan_required");
  }
  if (type === "youtube_video" || type === "video" || type === "audio" || type === "image") {
    risks.push("media_rights_review_required");
  }
  if (!item.text?.trim()) risks.push("extraction_missing");
  if (!item.url && !item.uploadId && !item.fileName) risks.push("source_context_missing");
  return unique(risks);
}

function emptyStatusCounts(): Record<MaterialIntakeStatus, number> {
  return {
    submitted: 0,
    scan_needed: 0,
    extraction_pending: 0,
    review_needed: 0,
    internal_usable: 0,
    public_referenceable: 0,
    rejected: 0,
    archived: 0,
  };
}

function evidenceKindForItem(item: MaterialIntakeInputItem, type: MaterialIntakeType): string {
  if (item.text?.trim()) {
    if (type === "youtube_video") return "youtube_transcript";
    if (type === "pdf") return "pdf_document";
    if (type === "document_url") return "web_reference";
    if (type === "upload" || type === "audio" || type === "video" || type === "image") return "upload_document";
    return "free_note";
  }
  if (type === "pdf") return "pdf_document";
  if (type === "upload" || type === "audio" || type === "video" || type === "image") return "upload_document";
  return "web_reference";
}

export function buildMaterialIntakeContract(input: {
  items: MaterialIntakeInputItem[];
  productionTruth?: boolean;
  storageMode?: MaterialIntakeContract["storageMode"];
}): MaterialIntakeContract {
  const productionTruth = input.productionTruth === true;
  const storageMode = input.storageMode ?? (productionTruth ? "persistent_material_store" : "request_metadata_only");
  const items = input.items.map((item): MaterialIntakeItem => {
    const type = materialTypeForItem(item);
    const status = statusForItem(item, type);
    const sourceTruth: MaterialIntakeSourceTruth =
      storageMode === "persistent_metadata_store"
        ? "persistent_material_metadata_store"
        : productionTruth
          ? "persistent_material_store"
          : item.text?.trim()
            ? "request_metadata"
            : "external_extraction_pending";
    return {
      id: item.id,
      type,
      label: item.label || item.fileName || item.url || item.uploadId || "Material",
      status,
      sourceTruth,
      url: item.url,
      uploadId: item.uploadId,
      mimeType: item.mimeType,
      fileName: item.fileName,
      extractedBy: item.extractedBy,
      extractionStatus: item.extractionStatus,
      riskFlags: riskFlagsForItem(item, type),
      reviewRequired: true,
      publicReferenceAllowed: status === "public_referenceable",
      guardrails: MATERIAL_INTAKE_GUARDRAILS,
    };
  });
  const statusCounts = emptyStatusCounts();
  items.forEach((item) => {
    statusCounts[item.status] += 1;
  });
  const riskFlags = unique(items.flatMap((item) => item.riskFlags));
  const hasSubmittedText = input.items.some((item) => item.text?.trim());
  const hasLocallyExtractedDocument = input.items.some(
    (item) => item.extractedBy === "pdf-parse@2" || item.extractedBy === "mammoth@1",
  );

  return {
    items,
    statusCounts,
    riskFlags,
    reviewRequired: items.length > 0,
    productionTruth,
    storageMode,
    extractionMode: hasLocallyExtractedDocument
      ? "local_document_extraction"
      : hasSubmittedText
        ? "submitted_text_only"
      : items.length > 0
        ? "external_extraction_pending"
        : "none",
    guardrails: MATERIAL_INTAKE_GUARDRAILS,
  };
}

export function buildMaterialIntakeAnalyzeManifest(input: {
  items: MaterialIntakeInputItem[];
  userText?: string | null;
  productionTruth?: boolean;
}): MaterialIntakeAnalyzeManifest {
  const intake = buildMaterialIntakeContract({
    items: input.items,
    productionTruth: input.productionTruth,
  });
  const labels = intake.items.map((item) => item.label).slice(0, 4);
  const localDocumentExtraction = intake.extractionMode === "local_document_extraction";
  const summary =
    labels.length > 0
      ? localDocumentExtraction
        ? `Material eingereicht: ${labels.join(", ")}. Lokale Textextraktion wurde ausgeführt; es wurde keine KI-Recherche, DeepSearch-Auswertung oder Veröffentlichung gestartet.`
        : `Material eingereicht: ${labels.join(", ")}. Es wurde keine automatische Extraktion, KI-Recherche, DeepSearch-Auswertung oder Veröffentlichung gestartet.`
      : "Material-Intake ist leer. Es wurde keine KI-Recherche oder Veröffentlichung gestartet.";
  const userText = input.userText?.trim();
  const evidenceItems = input.items.map((item) => {
    const type = materialTypeForItem(item);
    return {
      id: `material-intake-${item.id}`,
      kind: evidenceKindForItem(item, type),
      label: item.label || item.fileName || item.url || item.uploadId || "Material",
      text: item.text?.trim() || null,
      documentText: item.text?.trim() || null,
      url: item.url,
      uploadId: item.uploadId,
      fileName: item.fileName,
      mimeType: item.mimeType,
      pageRef: item.pageRef,
      timestampRef: item.timestampRef,
      extractedBy: item.text?.trim() ? (item.extractedBy ?? "user_submitted_extract") : null,
      extractionStatus: item.extractionStatus,
      reviewRequired: true,
      noAutoResearch: true,
      noAutoPublish: true,
      noPublicOfficial: true,
    };
  });

  return {
    summary: userText ? `${summary} Nutzerkontext: ${userText}` : summary,
    evidenceItems,
    intake,
  };
}

export function buildMaterialIntakeDashboardSummary(input: {
  hasVerifiedMembership: boolean;
  hasProductiveEntitlement: boolean;
  productionTruth: boolean;
  items?: MaterialIntakeInputItem[];
  materialItems?: MaterialIntakeItem[];
}): MaterialIntakeDashboardSummary {
  const intake = input.materialItems
    ? null
    : buildMaterialIntakeContract({
        items: input.items ?? [],
        productionTruth: input.productionTruth,
      });
  const materialItems = input.materialItems ?? intake?.items ?? [];
  const riskFlags = unique(materialItems.flatMap((item) => item.riskFlags));
  const storeLabel = input.productionTruth
    ? "Persistenter Material-Store"
    : "Request-/lokaler Pending-Status";

  if (!input.hasVerifiedMembership) {
    return {
      currentState: "verification_required",
      statusLabel: "Organisation noch nicht verifiziert",
      nextStepTitle: "Prüfung erforderlich",
      nextStepBody:
        "Material kann als sicherer Hinweis vorbereitet werden, aber produktive Material-Workflows, Review-Handoffs und Veröffentlichungsbezüge bleiben bis zur verifizierten Organisation gesperrt.",
      storeLabel,
      productionTruth: input.productionTruth,
      entitlementRequired: true,
      entitlementScope: "dossier_studio",
      productiveWorkflowEnabled: false,
      items: materialItems,
      riskFlags,
      guardrails: MATERIAL_INTAKE_GUARDRAILS,
    };
  }

  if (!input.hasProductiveEntitlement) {
    return {
      currentState: "limited_intake",
      statusLabel: "Eingeschränkter Material-Intake",
      nextStepTitle: "Nur sicherer Intake, kein produktiver Workflow",
      nextStepBody:
        "Ohne passenden Arbeitszugang bleibt Material bei Einreichung, Scan-/Extraktionshinweis und Review-Erklärung. Es gibt keine automatische Auswertung, keine Dossier-Mutation und keine Veröffentlichung.",
      storeLabel,
      productionTruth: input.productionTruth,
      entitlementRequired: true,
      entitlementScope: "dossier_studio",
      productiveWorkflowEnabled: false,
      items: materialItems,
      riskFlags,
      guardrails: MATERIAL_INTAKE_GUARDRAILS,
    };
  }

  if (materialItems.length > 0) {
    return {
      currentState: "material_pending_review",
      statusLabel: "Material reviewpflichtig",
      nextStepTitle: "Material prüfen und anhängen",
      nextStepBody:
        "Material kann im eigenen Scope als reviewpflichtiger Arbeitsstand an Claims oder Dossiers vorbereitet werden. Rohmaterial wird nie direkt öffentlich; öffentliche Referenzen brauchen Review.",
      storeLabel,
      productionTruth: input.productionTruth,
      entitlementRequired: false,
      entitlementScope: "dossier_studio",
      productiveWorkflowEnabled: true,
      items: materialItems,
      riskFlags,
      guardrails: MATERIAL_INTAKE_GUARDRAILS,
    };
  }

  return {
    currentState: "ready_for_review",
    statusLabel: "Material-Intake bereit",
    nextStepTitle: "Material bewusst einreichen",
    nextStepBody:
      "Reiche Text, PDF, Dokument-URL, YouTube-/Video-, Audio-, Bildmaterial oder Snapshot bewusst ein. Scan, Extraktion und Review bleiben getrennte Schritte; nichts startet automatisch DeepSearch oder Veröffentlichung.",
    storeLabel,
    productionTruth: input.productionTruth,
    entitlementRequired: false,
    entitlementScope: "dossier_studio",
    productiveWorkflowEnabled: true,
    items: materialItems,
    riskFlags,
    guardrails: MATERIAL_INTAKE_GUARDRAILS,
  };
}

export function materialIntakeStatusLabel(status: MaterialIntakeStatus): string {
  switch (status) {
    case "scan_needed":
      return "Scan nötig";
    case "extraction_pending":
      return "Extraktion ausstehend";
    case "review_needed":
      return "Review nötig";
    case "internal_usable":
      return "Intern nutzbar";
    case "public_referenceable":
      return "Öffentlich referenzierbar";
    case "rejected":
      return "Abgelehnt";
    case "archived":
      return "Archiviert";
    case "submitted":
    default:
      return "Eingereicht";
  }
}

export function materialIntakeTypeLabel(type: MaterialIntakeType): string {
  switch (type) {
    case "pdf":
      return "PDF";
    case "document_url":
      return "Dokument-URL";
    case "youtube_video":
      return "YouTube/Video";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "image":
      return "Bild";
    case "source_snapshot":
      return "Snapshot";
    case "upload":
      return "Upload";
    case "text":
    default:
      return "Text";
  }
}
