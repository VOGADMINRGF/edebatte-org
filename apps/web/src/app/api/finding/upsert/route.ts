import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatError } from "@core/errors/formatError";
import { PERMISSIONS } from "@core/auth/rbac";
import { mapOutcomeToStatus } from "@/core/factcheck/triage";
import { stableHash } from "@core/utils/hash";
import { logger } from "@core/observability/logger";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  dossierEdgesCol,
  updateDossierCounts,
  touchDossierFactchecked,
  ensureDossierForStatement,
} from "@features/dossier/db";
import { DossierSourceTypeSchema, type DossierEdgeRel } from "@features/dossier/schemas";
import {
  DOSSIER_LIMITS,
  clampLocator,
  clampPublisher,
  clampQuote,
  clampRationaleItem,
  clampSnippet,
  clampText,
  clampTitle,
} from "@features/dossier/limits";
import { mutateDossierWithRevision } from "@features/dossier/revisions";
import { mapOutcomeToClaimStatus, mapOutcomeToFindingVerdict } from "@features/dossier/factcheck";
import {
  loadStatementByAnyId,
  getCanonicalStatementId,
  getStatementAliases,
} from "@features/dossier/statement";
import { requireDossierEditor } from "@/lib/server/auth/dossier";
import { logPermissionDenied, resolveRoleFromRequest } from "@/lib/server/auth/requestRole";
import {
  internalSystemIdentityAuditFields,
  resolveInternalSystemIdentity,
  resolveTrustedInternalSystemIdentity,
} from "@/lib/server/auth/systemIdentity";

export const runtime = "nodejs";

const SourceSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1).max(DOSSIER_LIMITS.title).optional(),
  title: z.string().min(1).max(DOSSIER_LIMITS.title).optional(),
  publisher: z.string().min(1).max(DOSSIER_LIMITS.publisher).optional(),
  kind: z.string().min(1).max(60).optional(),
  type: DossierSourceTypeSchema.optional(),
  snippet: z.string().max(DOSSIER_LIMITS.snippet).optional(),
  quote: z.string().max(DOSSIER_LIMITS.quote).optional(),
  locator: z.string().max(DOSSIER_LIMITS.locator).optional(),
});

const BodySchema = z.object({
  claimId: z.string().min(1),
  dossierId: z.string().min(1).optional(),
  statementId: z.string().min(1).optional(),
  dossierClaimId: z.string().min(1).optional(),
  claimText: z.string().min(1).max(600).optional(),
  summary: z.string().min(1).max(800),
  outcome: z.string().min(1),
  rationale: z
    .union([
      z.string().min(1).max(DOSSIER_LIMITS.rationale),
      z.array(z.string().min(1).max(DOSSIER_LIMITS.rationale)).min(1).max(12),
    ])
    .optional(),
  metrics: z.any().optional(),
  comparedJurisdictions: z.any().optional(),
  sources: z.array(SourceSchema).optional(),
});

function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    if (url.pathname.endsWith("/") && url.pathname !== "/") {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function normalizeRationale(input?: string | string[]) {
  if (!input) return { prismaValue: "", items: [] as string[] };
  if (Array.isArray(input)) {
    const items = input
      .map((i) => clampRationaleItem(i))
      .filter(Boolean) as string[];
    return { prismaValue: items.join("\n"), items };
  }
  const text = input.trim();
  const items = text
    .split(/\n+/)
    .map((i) => clampRationaleItem(i))
    .filter(Boolean) as string[];
  return { prismaValue: items.join("\n"), items };
}

function clampSourcesPayload(input: any) {
  if (!input || typeof input !== "object") return input;
  const body = { ...input };
  if (typeof body.summary === "string") {
    body.summary = clampText(body.summary, 800);
  }
  if (Array.isArray(body.sources)) {
    body.sources = body.sources.map((src: any) => ({
      ...src,
      label: clampTitle(src.label),
      title: clampTitle(src.title),
      publisher: clampPublisher(src.publisher),
      snippet: clampSnippet(src.snippet),
      quote: clampQuote(src.quote),
      locator: clampLocator(src.locator),
    }));
  }
  return body;
}

function mapSourceKind(kind?: string, type?: string) {
  if (type && ["official", "research", "primary_doc", "quality_media", "stakeholder", "other"].includes(type)) {
    return type as z.infer<typeof DossierSourceTypeSchema>;
  }
  const k = (kind ?? "").toLowerCase();
  if (k.includes("gov") || k.includes("amtlich")) return "official";
  if (k.includes("research") || k.includes("study")) return "research";
  if (k.includes("doc")) return "primary_doc";
  if (k.includes("media") || k.includes("press")) return "quality_media";
  if (k.includes("stake")) return "stakeholder";
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const systemIdentity = resolveInternalSystemIdentity(req);
    const trustedSystemIdentity = resolveTrustedInternalSystemIdentity(req);
    const roleContext = resolveRoleFromRequest(req);
    const hasTrustedSystemAccess =
      trustedSystemIdentity?.source === "finding_queue" ||
      trustedSystemIdentity?.source === "finding_worker" ||
      trustedSystemIdentity?.source === "factcheck_worker";
    let actorRole: "editor" | "admin" | "pipeline" = "pipeline";
    let actorUserId: string | undefined;
    if (systemIdentity && !hasTrustedSystemAccess) {
      logger.warn(
        {
          scope: "finding.upsert",
          method: req.method,
          path: req.nextUrl.pathname,
          ...internalSystemIdentityAuditFields(systemIdentity),
        },
        "SYSTEM_IDENTITY_DENIED",
      );
      return NextResponse.json(formatError("FORBIDDEN", "Permission denied"), { status: 403 });
    }
    if (!hasTrustedSystemAccess) {
      const auth = await requireDossierEditor(req);
      if (auth instanceof Response) {
        if (roleContext.source === "header") {
          logPermissionDenied({
            req,
            scope: "finding.upsert",
            permission: PERMISSIONS.EDITOR_ITEM_WRITE,
            role: roleContext.role,
            source: roleContext.source,
            details: {
              denyReason: "header_role_not_allowed",
              ...internalSystemIdentityAuditFields(systemIdentity),
            },
          });
        }
        return auth;
      }
      actorRole = auth.actorRole === "admin" ? "admin" : "editor";
      actorUserId = auth.userId;
    }

    const rawBody = await req.json();
    const body = BodySchema.parse(clampSourcesPayload(rawBody));
    const prisma = await getPrismaClient();
    if (!prisma) {
      return NextResponse.json({ error: "storage_disabled" }, { status: 503 });
    }
    const findingModel = (prisma as any).finding;
    const factcheckClaim = (prisma as any).factcheckClaim;
    const evidenceModel = (prisma as any).evidence;
    if (!findingModel || !factcheckClaim) {
      return NextResponse.json(
        { error: "factcheck_models_missing" },
        { status: 501 },
      );
    }

    const rationaleNormalized = normalizeRationale(body.rationale);
    const finding = await findingModel.upsert({
      where: { claimId: body.claimId },
      create: {
        claimId: body.claimId,
        summary: body.summary,
        outcome: body.outcome,
        rationale: rationaleNormalized.prismaValue,
        metrics: body.metrics,
        comparedJurisdictions: body.comparedJurisdictions,
      },
      update: {
        summary: body.summary,
        outcome: body.outcome,
        rationale: rationaleNormalized.prismaValue,
        metrics: body.metrics,
        comparedJurisdictions: body.comparedJurisdictions,
        lastChecked: new Date(),
      },
    });

    await factcheckClaim.update({
      where: { id: body.claimId },
      data: { status: mapOutcomeToStatus(body.outcome), findingId: finding.id },
    });

    if (body.sources?.length) {
      await evidenceModel?.createMany(
        body.sources.map((s: any) => ({
          claimId: body.claimId,
          label: s.label,
          url: s.url,
          kind: s.kind,
        })),
      );
    }

    const dossierId = body.dossierId
      ? body.dossierId
      : body.statementId
        ? await resolveDossierId(body.statementId)
        : null;
    if (dossierId) {
      await upsertDossierFinding({
        dossierId,
        claimId: body.dossierClaimId ?? body.claimId,
        claimText: body.claimText,
        outcome: body.outcome,
        rationale: rationaleNormalized.items,
        sources: body.sources ?? [],
        actorRole,
        actorUserId,
      });
    }

    return NextResponse.json({ findingId: finding.id });
  } catch (err: any) {
    return NextResponse.json(formatError("bad_request", String((err as any)?.message ?? err), err), { status: 400 });
  }
}

async function getPrismaClient() {
  if (!process.env.WEB_DATABASE_URL) return null;
  const mod = await import("@/lib/prisma");
  return mod.prisma;
}

async function resolveDossierId(statementId: string): Promise<string | null> {
  const statement = await loadStatementByAnyId(statementId);
  if (!statement) return null;
  const canonical = getCanonicalStatementId(statement, statementId);
  const aliases = getStatementAliases(statement);
  const dossier = await ensureDossierForStatement(canonical, { title: statement.title ?? undefined }, aliases);
  return dossier?.dossierId ?? null;
}

async function upsertDossierFinding(args: {
  dossierId: string;
  claimId: string;
  claimText?: string;
  outcome: string;
  rationale: string[];
  sources: Array<z.infer<typeof SourceSchema>>;
  actorRole: "editor" | "admin" | "pipeline";
  actorUserId?: string;
}) {
  const now = new Date();
  const findingCol = await dossierFindingsCol();
  const claimCol = await dossierClaimsCol();
  const sourceCol = await dossierSourcesCol();
  const edgeCol = await dossierEdgesCol();

  const claimId = args.claimId;
  const producedBy = args.actorRole === "pipeline" ? "pipeline" : "editor";
  const findingId = producedBy === "pipeline" ? `finding_${claimId}` : `finding_${claimId}_editor`;

  const verdict = mapOutcomeToFindingVerdict(args.outcome);
  const claimStatus = mapOutcomeToClaimStatus(args.outcome);
  const citations: Array<{ sourceId: string; quote?: string; locator?: string }> = [];

  async function archiveEdges(params: { fromId: string; toId: string; keepRel: DossierEdgeRel }) {
    const staleEdges = await edgeCol
      .find({
        dossierId: args.dossierId,
        fromId: params.fromId,
        toId: params.toId,
        rel: { $ne: params.keepRel },
        active: { $ne: false },
      })
      .toArray();

    for (const edge of staleEdges) {
      await mutateDossierWithRevision({
        dossierId: args.dossierId,
        mutate: async (session) => {
          const res = await edgeCol.updateOne(
            { _id: edge._id, active: { $ne: false } },
            { $set: { active: false, archivedAt: now, archivedReason: "verdict_changed" } },
            { session },
          );
          return {
            result: null,
            revision:
              res.modifiedCount > 0
                ? {
                    entityType: "edge",
                    entityId: edge.edgeId,
                    action: "update",
                    diffSummary: "Edge archiviert (Verdict geaendert).",
                    byRole: args.actorRole,
                    byUserId: args.actorUserId,
                  }
                : null,
          };
        },
      });
    }
  }

  if (Array.isArray(args.sources) && args.sources.length > 0) {
    for (const src of args.sources) {
      const url = normalizeUrl(src.url);
      const canonicalUrlHash = stableHash(url);
      const sourceId = `source_${canonicalUrlHash.slice(0, 12)}`;
      const publisher = clampPublisher(src.publisher) ?? (() => {
        try {
          return clampPublisher(new URL(url).hostname) ?? "Quelle";
        } catch {
          return "Quelle";
        }
      })();

      const sourceTransaction = await mutateDossierWithRevision({
        dossierId: args.dossierId,
        mutate: async (session) => {
          const sourceRes = await sourceCol.findOneAndUpdate(
            { dossierId: args.dossierId, canonicalUrlHash },
            {
              $set: {
                url,
                title: clampTitle(src.title ?? src.label ?? "Quelle") ?? "Quelle",
                publisher,
                type: mapSourceKind(src.kind, src.type),
                snippet: clampSnippet(src.snippet),
                updatedAt: now,
              },
              $setOnInsert: {
                dossierId: args.dossierId,
                sourceId,
                canonicalUrlHash,
                createdAt: now,
              },
            },
            { upsert: true, returnDocument: "before", includeResultMetadata: true, session },
          );
          const effectiveSourceId = sourceRes.value?.sourceId ?? sourceId;
          return {
            result: { sourceId: effectiveSourceId },
            revision: {
              entityType: "source",
              entityId: effectiveSourceId,
              action: sourceRes.value ? "update" : "create",
              diffSummary: sourceRes.value ? "Quelle aktualisiert (Finding)." : "Quelle hinzugefuegt (Finding).",
              byRole: args.actorRole,
              byUserId: args.actorUserId,
            },
          };
        },
      });
      const effectiveSourceId = sourceTransaction.result.sourceId;

      citations.push({
        sourceId: effectiveSourceId,
        quote: clampQuote(src.quote),
        locator: clampLocator(src.locator),
      });

      const rel: DossierEdgeRel =
        verdict === "supports" ? "supports" : verdict === "refutes" ? "refutes" : "mentions";
      await archiveEdges({ fromId: findingId, toId: effectiveSourceId, keepRel: rel });

      const edgeKey = `edge_${stableHash(`${args.dossierId}:${findingId}:${effectiveSourceId}:${rel}`).slice(0, 12)}`;
      await mutateDossierWithRevision({
        dossierId: args.dossierId,
        mutate: async (session) => {
          const edgeRes = await edgeCol.updateOne(
            { dossierId: args.dossierId, fromId: findingId, toId: effectiveSourceId, rel },
            {
              $set: {
                fromType: "finding",
                fromId: findingId,
                toType: "source",
                toId: effectiveSourceId,
                rel,
                active: true,
              },
              $unset: { archivedAt: "", archivedReason: "" },
              $setOnInsert: {
                dossierId: args.dossierId,
                edgeId: edgeKey,
                createdBy: args.actorRole === "pipeline" ? "pipeline" : "editor",
                createdAt: now,
              },
            },
            { upsert: true, session },
          );
          const created = Boolean(edgeRes.upsertedId);
          return {
            result: null,
            revision: {
              entityType: "edge",
              entityId: edgeKey,
              action: created ? "create" : "update",
              diffSummary: created ? "Graph-Edge erstellt (Finding)." : "Graph-Edge aktualisiert (Finding).",
              byRole: args.actorRole,
              byUserId: args.actorUserId,
            },
          };
        },
      });
    }
  }

  await mutateDossierWithRevision({
    dossierId: args.dossierId,
    mutate: async (session) => {
      const findingRes = await findingCol.updateOne(
        { dossierId: args.dossierId, claimId, producedBy },
        {
          $set: {
            findingId,
            dossierId: args.dossierId,
            claimId,
            verdict,
            rationale: args.rationale ?? [],
            citations,
            producedBy,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true, session },
      );
      const created = Boolean(findingRes.upsertedId);
      return {
        result: null,
        revision: {
          entityType: "finding",
          entityId: findingId,
          action: created ? "create" : "update",
          diffSummary: created ? "Finding angelegt." : "Finding aktualisiert.",
          byRole: args.actorRole === "admin" ? "admin" : args.actorRole === "pipeline" ? "pipeline" : "editor",
          byUserId: args.actorUserId,
        },
      };
    },
  });

  const claimSet: Record<string, any> = {
    status: claimStatus,
    updatedAt: now,
  };
  if (typeof args.claimText === "string" && args.claimText.trim()) {
    claimSet.text = args.claimText.trim();
  }

  await mutateDossierWithRevision({
    dossierId: args.dossierId,
    mutate: async (session) => {
      const claimRes = await claimCol.findOneAndUpdate(
        { dossierId: args.dossierId, claimId },
        {
          $set: claimSet,
          $setOnInsert: {
            dossierId: args.dossierId,
            claimId,
            text: args.claimText ?? "Claim",
            kind: "fact",
            status: claimStatus,
            createdByRole:
              args.actorRole === "admin" ? "admin" : args.actorRole === "pipeline" ? "pipeline" : "editor",
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: "before", includeResultMetadata: true, session },
      );
      const created = !claimRes.value;
      const statusChanged = Boolean(claimRes.value && claimRes.value.status !== claimStatus);
      return {
        result: null,
        revision: {
          entityType: "claim",
          entityId: claimId,
          action: created ? "create" : statusChanged ? "status_change" : "update",
          diffSummary: created
            ? "Claim erstellt (Finding)."
            : statusChanged
              ? "Claim-Status aktualisiert (Finding)."
              : "Claim aktualisiert (Finding).",
          byRole: args.actorRole,
          byUserId: args.actorUserId,
        },
      };
    },
  });

  await archiveEdges({ fromId: claimId, toId: findingId, keepRel: "context_for" });

  const claimEdgeId = `edge_${stableHash(`${args.dossierId}:${claimId}:${findingId}:context`).slice(0, 12)}`;
  await mutateDossierWithRevision({
    dossierId: args.dossierId,
    mutate: async (session) => {
      const claimEdgeRes = await edgeCol.updateOne(
        { dossierId: args.dossierId, fromId: claimId, toId: findingId, rel: "context_for" },
        {
          $set: {
            fromType: "claim",
            fromId: claimId,
            toType: "finding",
            toId: findingId,
            rel: "context_for",
            active: true,
          },
          $unset: { archivedAt: "", archivedReason: "" },
          $setOnInsert: {
            dossierId: args.dossierId,
            edgeId: claimEdgeId,
            createdBy: args.actorRole === "pipeline" ? "pipeline" : "editor",
            createdAt: now,
          },
        },
        { upsert: true, session },
      );
      const created = Boolean(claimEdgeRes.upsertedId);
      return {
        result: null,
        revision: {
          entityType: "edge",
          entityId: claimEdgeId,
          action: created ? "create" : "update",
          diffSummary: created
            ? "Claim-Finding-Edge erstellt (Finding)."
            : "Claim-Finding-Edge aktualisiert (Finding).",
          byRole: args.actorRole,
          byUserId: args.actorUserId,
        },
      };
    },
  });

  await updateDossierCounts(args.dossierId, "Finding Update");
  await touchDossierFactchecked(args.dossierId, now);
}
