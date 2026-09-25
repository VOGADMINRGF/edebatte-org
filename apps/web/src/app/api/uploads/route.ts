// apps/web/src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildMaterialIntakeContract, type MaterialIntakeInputItem } from "@/features/material/materialIntakeContract";
import { createMaterialIntakeRecords } from "@/features/material/materialIntakeRepository";
import {
  extractUploadedFileText,
  type UploadedFileTextExtraction,
} from "@/features/material/materialUploadedFileText";
import { persistMaterialFullText } from "@/features/material/materialFullTextStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function materialItemFromFile(file: File, index: number): Promise<{
  item: MaterialIntakeInputItem;
  extraction: UploadedFileTextExtraction;
}> {
  const extraction = await extractUploadedFileText(file);
  return {
    item: {
      id: `upload-${index + 1}`,
      kind: "upload_document",
      label: file.name || `Upload ${index + 1}`,
      url: null,
      uploadId: `upload-${index + 1}`,
      mimeType: file.type || null,
      fileName: file.name || null,
      text: extraction.text,
      pageRef: extraction.pageCount ? `Seiten: ${extraction.pageCount}` : null,
      timestampRef: null,
      extractedBy: extraction.extractedBy,
      extractionStatus: extraction.status,
    },
    extraction,
  };
}

async function resolveMaterialUploadWorkflow(req: NextRequest) {
  const requestScopeModule = await import("@/lib/server/auth/requestScope").catch(() => null);
  const regionModule = await import("@features/region").catch(() => null);
  if (!requestScopeModule || !regionModule) {
    return {
      actorId: "anonymous",
      organizationId: null,
      regionId: null,
      scopeSummary: null,
      workflowState: "verification_required",
    } as const;
  }
  const { resolveRequestScopeContext, summarizeRequestScopeContext } = requestScopeModule;
  const {
    buildOrganizationEntitlementSummary,
    getRegionEntitlementRuntimeRepo,
    organizationEntitlementAllowsScope,
  } = regionModule;

  const scope = await resolveRequestScopeContext(req).catch(() => null);
  const scopeSummary = summarizeRequestScopeContext(scope);
  const actorId = scope?.actorId ?? "anonymous";
  const organizationId = scope?.membershipStatus === "verified" ? scope.organizationId : null;
  const regionId = scope?.regionIds[0] ?? null;
  const hasVerifiedMembership = Boolean(organizationId);
  let hasDossierStudioEntitlement = Boolean(scope?.isOperatorMode);

  if (scope && organizationId && !hasDossierStudioEntitlement) {
    const entitlementRepo = getRegionEntitlementRuntimeRepo();
    const [entitlements, auditEvents] = await Promise.all([
      entitlementRepo.getEntitlementsForOrganization(organizationId).catch(() => []),
      entitlementRepo.listEntitlementAuditEventsForOrganization(organizationId).catch(() => []),
    ]);
    const organization = scope.organizationMembership.organizations.find((entry) => entry.id === organizationId) ?? null;
    const verifiedMemberships = scope.organizationMembership.memberships.filter(
      (membership) => membership.organizationId === organizationId,
    );
    const entitlementSummary = buildOrganizationEntitlementSummary({
      organization,
      claims: [],
      verifiedMemberships,
      entitlements,
      auditEvents,
      productionTruth: true,
    });
    hasDossierStudioEntitlement = organizationEntitlementAllowsScope(entitlementSummary, "dossier_studio");
  }

  return {
    actorId,
    organizationId,
    regionId,
    scopeSummary,
    workflowState: !hasVerifiedMembership
      ? "verification_required"
      : hasDossierStudioEntitlement
        ? "review_queue_ready"
        : "limited_intake",
  } as const;
}

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const files = fd.getAll("files").filter((entry): entry is File => entry instanceof File);
  const extractedFiles = await Promise.all(files.map(materialItemFromFile));
  const materialItems = extractedFiles.map((entry) => entry.item);
  const extractions = extractedFiles.map((entry) => entry.extraction);
  const workflow = await resolveMaterialUploadWorkflow(req);
  const registry = await createMaterialIntakeRecords({
    items: materialItems.map((item, index) => ({
      ...item,
      sizeBytes: files[index]?.size ?? null,
    })),
    actorId: workflow.actorId,
    organizationId: workflow.organizationId,
    regionId: workflow.regionId,
    workflowState: workflow.workflowState,
  });

  const fullTextPersistence = await Promise.all(
    registry.records.map((record, index) =>
      persistMaterialFullText({
        materialId: record.id,
        text: materialItems[index]?.text ?? null,
        extractedBy: materialItems[index]?.extractedBy ?? null,
        sourceFormat: extractions[index]?.sourceFormat ?? null,
      }),
    ),
  );

  const materialIntake = buildMaterialIntakeContract({
    items: materialItems,
    productionTruth: registry.persistence.productionTruth,
    storageMode: registry.persistence.productionTruth ? "persistent_metadata_store" : "local_pending",
  });
  const localExtractionCount = extractions.filter((entry) => entry.outcome === "extracted_locally").length;
  const documentExtractionCount = extractions.filter(
    (entry) => entry.outcome === "extracted_locally" && (entry.sourceFormat === "pdf" || entry.sourceFormat === "docx"),
  ).length;
  const externalConversionCount = extractions.filter(
    (entry) => entry.outcome === "external_conversion_required",
  ).length;
  const failedExtractionCount = extractions.filter((entry) => entry.outcome === "failed").length;

  return NextResponse.json({
    ok: true,
    storageMode: registry.persistence.productionTruth ? "persistent_metadata_store" : "local_pending",
    productionTruth: registry.persistence.productionTruth,
    rawObjectStorageProductionTruth: false,
    scanProviderConfigured: false,
    extractionProviderConfigured: false,
    localExtractionConfigured: true,
    extractionCapabilities: {
      extractedLocally: localExtractionCount,
      documentsExtractedLocally: documentExtractionCount,
      externalConversionRequired: externalConversionCount,
      failed: failedExtractionCount,
      supportedDirectly: ["txt", "md", "csv", "tsv", "json", "xml", "html", "pdf", "docx"],
      requiresExternalConversion: ["doc"],
      ocrConfigured: false,
    },
    fullTextPersistence: {
      stored: fullTextPersistence.filter((entry) => entry.stored).length,
      privateOnly: true,
      reviewRequired: true,
    },
    message:
      externalConversionCount > 0
        ? "Unterstützte Dateien wurden serverseitig verarbeitet. Alte DOC-Dateien benötigen eine externe Konvertierung; es wurden keine KI-Recherche und keine Veröffentlichung automatisch gestartet."
        : localExtractionCount > 0
          ? "Unterstützte Uploads wurden serverseitig extrahiert, intern als privater Volltext gespeichert und reviewpflichtig registriert. Es wurden keine KI-Recherche und keine Veröffentlichung automatisch gestartet."
          : failedExtractionCount > 0
            ? "Der Upload wurde reviewpflichtig registriert, konnte aber nicht sicher extrahiert werden; keine KI-Recherche, OCR oder Veröffentlichung wurde automatisch gestartet."
          : "Upload-Metadaten wurden angenommen und reviewpflichtig registriert. Für dieses Dateiformat wurden keine automatische Extraktion, KI-Recherche oder Veröffentlichung gestartet.",
    files: files.map((f, index) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      extractionStatus: materialItems[index]?.extractionStatus ?? "none",
      extractedBy: materialItems[index]?.extractedBy ?? null,
      extractionOutcome: extractions[index]?.outcome ?? "unsupported",
      extractionReason: extractions[index]?.reason ?? null,
      extractionWarnings: extractions[index]?.warnings ?? [],
      sourceFormat: extractions[index]?.sourceFormat ?? "other",
      pageCount: extractions[index]?.pageCount ?? null,
    })),
    requestScope: workflow.scopeSummary,
    materialIntake,
    materialRegistry: {
      workflowState: workflow.workflowState,
      persistence: registry.persistence,
      records: registry.records,
      auditEvents: registry.auditEvents,
    },
  });
}
