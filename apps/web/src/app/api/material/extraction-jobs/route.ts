import { NextRequest, NextResponse } from "next/server";
import {
  buildMaterialExtractionJobReadModel,
  createMaterialExtractionJob,
  type MaterialExtractionMode,
} from "@/features/material/materialExtractionJobs";
import {
  buildMaterialGraphFirstContext,
  type MaterialGraphContextItem,
  type MaterialGraphTopicItem,
} from "@/features/material/materialGraphFirstContext";
import { getMaterialFullText } from "@/features/material/materialFullTextStore";
import { generateSemanticallySegmentedMaterialDrafts } from "@/features/material/materialSemanticStructuredDrafts";
import { createMaterialDocumentReviewSession } from "@/features/material/materialDocumentReviewStore";
import {
  buildMaterialKnowledgeReuseText,
  getReusableMaterialKnowledgeAsset,
  persistMaterialKnowledgeAsset,
} from "@/features/material/materialKnowledgeAssetStore";
import { estimateMaterialEconomics } from "@/features/material/materialKnowledgeEconomics";
import { appendMaterialEconomicsLedger } from "@/features/material/materialEconomicsLedger";
import { requireGovernanceActorOrResponse } from "@/lib/server/auth/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readStringList(params: URLSearchParams, key: string) {
  return params.getAll(key).map((value) => value.trim()).filter(Boolean);
}

async function readGraphFirstRuntime(req: NextRequest) {
  const contextUrl = new URL("/api/create/context?limit=80", req.nextUrl.origin);
  const topicsUrl = new URL("/api/topics", req.nextUrl.origin);
  const cookie = req.headers.get("cookie") ?? "";
  const headers = cookie ? { cookie } : undefined;

  const [contextResult, topicsResult] = await Promise.allSettled([
    fetch(contextUrl, { cache: "no-store", headers }).then(async (response) => {
      if (!response.ok) throw new Error("context_route_unavailable");
      return (await response.json()) as { items?: MaterialGraphContextItem[] };
    }),
    fetch(topicsUrl, { cache: "no-store", headers }).then(async (response) => {
      if (!response.ok) throw new Error("topics_route_unavailable");
      return (await response.json()) as { topics?: MaterialGraphTopicItem[] };
    }),
  ]);

  return {
    contextItems:
      contextResult.status === "fulfilled" && Array.isArray(contextResult.value.items)
        ? contextResult.value.items
        : [],
    topics:
      topicsResult.status === "fulfilled" && Array.isArray(topicsResult.value.topics)
        ? topicsResult.value.topics
        : [],
    blockers: [
      ...(contextResult.status === "rejected" ? ["context_route_unavailable"] : []),
      ...(topicsResult.status === "rejected" ? ["topics_route_unavailable"] : []),
    ],
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireGovernanceActorOrResponse(req);
  if (gate instanceof Response) return gate;

  const params = req.nextUrl.searchParams;
  const limit = Number(params.get("limit") ?? 24);
  const organizationIds = readStringList(params, "organizationId");
  const regionIds = readStringList(params, "regionId");
  const readModel = await buildMaterialExtractionJobReadModel({
    organizationIds,
    regionIds,
    limit: Number.isFinite(limit) ? limit : 24,
  });

  return NextResponse.json({ ok: true, readModel });
}

type Body = {
  materialId?: string;
  extractionMode?: MaterialExtractionMode;
  dossierId?: string;
  anlassraumId?: string;
  approveCost?: boolean;
  publisher?: string;
  documentType?: string;
  publishedAt?: string;
  versionLabel?: string;
  sourceRef?: string;
};

export async function POST(req: NextRequest) {
  const gate = await requireGovernanceActorOrResponse(req);
  if (gate instanceof Response) return gate;

  const body = (await req.json().catch(() => ({}))) as Body;
  const materialId = String(body.materialId ?? "").trim();
  const extractionMode = String(body.extractionMode ?? "").trim() as MaterialExtractionMode;
  const dossierId = String(body.dossierId ?? "").trim() || null;
  const anlassraumId = String(body.anlassraumId ?? "").trim() || null;
  const approveCost = body.approveCost === true;

  if (!materialId || !extractionMode) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const created = await createMaterialExtractionJob({
      materialId,
      extractionMode,
      submittedBy: gate.actor.userId,
      dossierId,
      anlassraumId,
      approveCost,
    });

    const graphRuntime = await readGraphFirstRuntime(req);
    const graphFirst = buildMaterialGraphFirstContext({
      job: created.job,
      contextItems: graphRuntime.contextItems,
      topics: graphRuntime.topics,
    });
    const fullText = await getMaterialFullText(materialId);
    const reusableAsset = fullText ? await getReusableMaterialKnowledgeAsset(fullText) : null;
    const reuseText = reusableAsset ? buildMaterialKnowledgeReuseText(reusableAsset) : null;
    const hasExistingTopicContext =
      graphFirst.matchedTopicIds.length > 0 ||
      graphFirst.matchedDossierIds.length > 0 ||
      graphFirst.matchedRoundIds.length > 0;
    const economics = estimateMaterialEconomics({
      operation: reusableAsset
        ? "reuse_existing_material"
        : hasExistingTopicContext
          ? "extend_existing_topic"
          : "ingest_new_material",
      characterCount: reusableAsset ? reuseText?.length ?? 0 : fullText?.length ?? 0,
    });

    const structuredDrafts = reusableAsset
      ? await generateSemanticallySegmentedMaterialDrafts({
          text: reuseText,
          graph: graphFirst,
          approveCost: true,
        })
      : await generateSemanticallySegmentedMaterialDrafts({
          text: fullText,
          graph: graphFirst,
          approveCost,
        });

    let knowledgeAsset = reusableAsset;
    if (!reusableAsset && fullText && structuredDrafts.status === "generated") {
      knowledgeAsset = await persistMaterialKnowledgeAsset({
        materialId,
        text: fullText,
        structuredDrafts,
        identity: {
          title: created.job.materialLabel,
          publisher: String(body.publisher ?? "").trim() || null,
          documentType: String(body.documentType ?? created.job.sourceType).trim() || created.job.sourceType,
          publishedAt: String(body.publishedAt ?? "").trim() || null,
          versionLabel: String(body.versionLabel ?? "").trim() || null,
          sourceRef: String(body.sourceRef ?? materialId).trim() || materialId,
          sourceFormat: created.job.sourceType,
          reviewState: "needs_review",
        },
      });
    }

    const economicsLedger = await appendMaterialEconomicsLedger({
      materialId,
      actorId: gate.actor.userId,
      organizationId: created.job.organizationId,
      economics,
      drafts: structuredDrafts,
      reusedExistingKnowledge: Boolean(reusableAsset),
      reuseSourceAssetId: reusableAsset?.id ?? null,
    });

    const reviewSession = await createMaterialDocumentReviewSession({
      job: created.job,
      actorId: gate.actor.userId,
      graphFirst,
      drafts: structuredDrafts,
    });

    const volumeApprovalRequired =
      structuredDrafts.status === "blocked" &&
      structuredDrafts.error === "material_analysis_volume_approval_required";

    return NextResponse.json({
      ok: true,
      job: created.job,
      persistence: created.persistence,
      graphFirst: { ...graphFirst, blockers: graphRuntime.blockers },
      knowledgeReuse: reusableAsset
        ? {
            reused: true,
            assetId: reusableAsset.id,
            sourceMaterialId: reusableAsset.materialId,
            sourceCharacterCount: reusableAsset.characterCount,
            reuseCharacterCount: reuseText?.length ?? 0,
            contentFingerprint: reusableAsset.contentFingerprint,
            identity: reusableAsset.identity,
          }
        : {
            reused: false,
            assetId: knowledgeAsset?.id ?? null,
            identity: knowledgeAsset?.identity ?? null,
          },
      economics,
      economicsLedger: economicsLedger
        ? {
            id: economicsLedger.id,
            operation: economicsLedger.operation,
            internalAnalysisUnits: economicsLedger.internalAnalysisUnits,
            commercialCreditsQuoted: economicsLedger.commercialCreditsQuoted,
            commercialCreditsCharged: economicsLedger.commercialCreditsCharged,
            chargeState: economicsLedger.chargeState,
            reusedExistingKnowledge: economicsLedger.reusedExistingKnowledge,
          }
        : null,
      structuredDrafts,
      reviewSession: reviewSession
        ? {
            id: reviewSession.id,
            status: reviewSession.status,
            href: `/admin/material/review/${reviewSession.id}`,
            selectedCount: 0,
          }
        : null,
      message: reusableAsset
        ? "Dieses Material war eDebatte bereits bekannt. Für die neue Ausarbeitung wurde nur die kompakte, quellengebundene Wissensprojektion verwendet; das Ursprungsdokument wurde nicht erneut vollständig analysiert. Die neue Voxy-Arbeit bleibt als eigenständige Professional-Layer-Leistung messbar."
        : volumeApprovalRequired
          ? `Das Dokument wurde vollständig gelesen und benötigt voraussichtlich ${structuredDrafts.analysisUsage.estimatedAnalysisUnits} interne Analyse-Einheiten. Die kostenrelevante KI-Strukturierung startet erst nach ausdrücklicher Freigabe.`
          : structuredDrafts.status === "generated"
            ? "Extraktionsjob wurde semantisch nach Abschnitten analysiert und gegen vorhandenes eDebatte-Wissen geprüft. Reviewpflichtige Fragen bleiben getrennte Arbeitsentwürfe; als dauerhaftes Materialwissen werden nur Themen, Entscheidungs-/Prüfpunkte, Quellenhinweise, Unsicherheiten und Provenienz gespeichert. Es wurde nichts automatisch veröffentlicht, gemergt, als Runde angelegt oder in den Graph geschrieben."
            : "Extraktionsjob wurde gegen vorhandenes eDebatte-Wissen geprüft. Strukturierte KI-Drafts konnten noch nicht produktiv erzeugt werden; es wurde nichts automatisch veröffentlicht, gemergt oder angelegt.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "material_extraction_job_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
