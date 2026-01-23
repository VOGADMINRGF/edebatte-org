import { NextRequest } from "next/server";
import { z } from "zod";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  dossierEdgesCol,
  openQuestionsCol,
} from "@features/dossier/db";
import { findDossierByAnyId } from "@features/dossier/lookup";
import { sanitizeClaimPublic, selectEffectiveFindings } from "@features/dossier/effective";
import { rateLimitHeaders } from "@/utils/rateLimitHelpers";
import { rateLimitPublic } from "@/utils/publicRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({ dossierId: z.string().min(1) });
const EXPORT_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

async function resolveParams(p: any): Promise<{ dossierId: string }> {
  const val = p && typeof p.then === "function" ? await p : p;
  return ParamsSchema.parse(val);
}

function stripId<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id, ...rest } = doc;
  return rest;
}

const HEADER = [
  "entityType",
  "entityId",
  "dossierId",
  "statementId",
  "fromType",
  "fromId",
  "toType",
  "toId",
  "rel",
  "claimId",
  "sourceId",
  "findingId",
  "questionId",
  "status",
  "kind",
  "verdict",
  "title",
  "text",
  "url",
  "publisher",
  "publishedAt",
  "snippet",
  "rationale",
  "citations",
  "responsibility",
  "createdAt",
  "updatedAt",
  "extra",
];

const esc = (s: unknown) => {
  const v = s == null ? "" : String(s);
  return v.includes(",") || v.includes("\n") || v.includes('"')
    ? `"${v.replace(/"/g, '""')}"`
    : v;
};

const toIso = (v?: Date | string | null) => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const toJson = (v: unknown) => {
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const rl = await rateLimitPublic(req, EXPORT_RATE_LIMIT.limit, EXPORT_RATE_LIMIT.windowMs, "dossier_export_csv");
  if (!rl.ok) {
    return new Response("rate_limited", { status: 429, headers: rateLimitHeaders(rl) });
  }

  const { dossierId } = await resolveParams(context.params);
  const dossier = await findDossierByAnyId(dossierId);
  if (!dossier) {
    return new Response("dossier_not_found", { status: 404 });
  }

  const dossierKey = dossier.dossierId;
  const [claims, sources, findings, openQuestions, edges] = await Promise.all([
    (await dossierClaimsCol()).find({ dossierId: dossierKey }).sort({ createdAt: 1 }).toArray(),
    (await dossierSourcesCol()).find({ dossierId: dossierKey }).sort({ publishedAt: -1, createdAt: -1 }).toArray(),
    (await dossierFindingsCol()).find({ dossierId: dossierKey }).sort({ updatedAt: -1 }).toArray(),
    (await openQuestionsCol()).find({ dossierId: dossierKey }).sort({ status: 1, createdAt: 1 }).toArray(),
    (await dossierEdgesCol()).find({ dossierId: dossierKey, active: { $ne: false } }).sort({ createdAt: 1 }).toArray(),
  ]);
  const effectiveFindings = selectEffectiveFindings(findings);

  const rows: string[][] = [];
  rows.push(HEADER);

  const pushRow = (row: Record<string, string>) => {
    rows.push(HEADER.map((key) => row[key] ?? ""));
  };

  pushRow({
    entityType: "dossier",
    entityId: dossier.dossierId,
    dossierId: dossier.dossierId,
    statementId: dossier.statementId,
    status: dossier.status ?? "active",
    title: dossier.title ?? "",
    createdAt: toIso(dossier.createdAt),
    updatedAt: toIso(dossier.updatedAt),
    extra: toJson({
      counts: dossier.counts ?? null,
      lastFactcheckedAt: toIso(dossier.lastFactcheckedAt),
    }),
  });

  for (const claim of claims) {
    const safeClaim = sanitizeClaimPublic(stripId(claim));
    const safeAuthorRef = safeClaim.authorRef ?? null;
    pushRow({
      entityType: "claim",
      entityId: claim.claimId,
      dossierId: dossierKey,
      statementId: dossier.statementId,
      claimId: claim.claimId,
      status: claim.status,
      kind: claim.kind,
      text: claim.text,
      createdAt: toIso(claim.createdAt),
      updatedAt: toIso(claim.updatedAt),
      extra: toJson({
        uncertaintyNotes: claim.uncertaintyNotes ?? [],
        evidenceIndicator: claim.evidenceIndicator ?? null,
        authorRef: safeAuthorRef,
      }),
    });
  }

  for (const source of sources) {
    pushRow({
      entityType: "source",
      entityId: source.sourceId,
      dossierId: dossierKey,
      statementId: dossier.statementId,
      sourceId: source.sourceId,
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      publishedAt: toIso(source.publishedAt),
      snippet: source.snippet ?? "",
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
      extra: toJson({
        type: source.type,
        canonicalUrlHash: source.canonicalUrlHash,
        retrievedAt: toIso(source.retrievedAt),
        licenseNote: source.licenseNote ?? null,
        conflictOfInterest: source.conflictOfInterest ?? null,
        tags: source.tags ?? [],
        language: source.language ?? null,
      }),
    });
  }

  for (const finding of effectiveFindings) {
    pushRow({
      entityType: "finding",
      entityId: finding.findingId,
      dossierId: dossierKey,
      statementId: dossier.statementId,
      claimId: finding.claimId,
      findingId: finding.findingId,
      verdict: finding.verdict,
      rationale: toJson(finding.rationale ?? []),
      citations: toJson(finding.citations ?? []),
      createdAt: toIso(finding.createdAt),
      updatedAt: toIso(finding.updatedAt),
      extra: toJson({
        producedBy: finding.producedBy,
        jobId: finding.jobId ?? null,
      }),
    });
  }

  for (const q of openQuestions) {
    pushRow({
      entityType: "open_question",
      entityId: q.questionId,
      dossierId: dossierKey,
      statementId: dossier.statementId,
      questionId: q.questionId,
      status: q.status,
      text: q.text,
      responsibility: toJson(q.responsibility ?? null),
      createdAt: toIso(q.createdAt),
      updatedAt: toIso(q.updatedAt),
      extra: toJson({ links: q.links ?? null }),
    });
  }

  for (const edge of edges) {
    pushRow({
      entityType: "edge",
      entityId: edge.edgeId,
      dossierId: dossierKey,
      statementId: dossier.statementId,
      fromType: edge.fromType,
      fromId: edge.fromId,
      toType: edge.toType,
      toId: edge.toId,
      rel: edge.rel,
      createdAt: toIso(edge.createdAt),
      extra: toJson({
        weight: edge.weight ?? null,
        justification: edge.justification ?? null,
        createdBy: edge.createdBy ?? null,
      }),
    });
  }

  const lines = rows.map((row) => row.map(esc).join(","));
  const EOL = "\r\n";
  const csv = "\uFEFF" + lines.join(EOL) + EOL;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="dossier_export.csv"',
      "cache-control": "no-store",
      ...rateLimitHeaders(rl),
    },
  });
}
