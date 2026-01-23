import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { formatError } from "@core/errors/formatError";
import { logger } from "@core/observability/logger";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { safeRandomId } from "@core/utils/random";
import { analyzeContribution } from "@features/analyze/analyzeContribution";
import { voteDraftsCol } from "@features/feeds/db";
import { ObjectId } from "@core/db/triMongo";
import { callAriSearchSerp, type SerpResultLite } from "@features/ai/providers/ari_search";
import { factcheckJobsCol, type FactcheckJobStatus } from "@features/factcheck/db";
import type { AnalyzeResult, StatementRecord } from "@features/analyze/schemas";
import { stableHash } from "@core/utils/hash";
import {
  ensureDossierForStatement,
  dossierSourcesCol,
  dossierEdgesCol,
  dossierFindingsCol,
  openQuestionsCol,
  dossierClaimsCol,
  updateDossierCounts,
  touchDossierFactchecked,
} from "@features/dossier/db";
import { seedDossierFromAnalysis } from "@features/dossier/seed";
import { logDossierRevision } from "@features/dossier/revisions";
import { clampPublisher, clampSnippet, clampTitle } from "@features/dossier/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLAIMS = 8;
const MAX_SERP_QUERY_CHARS = 220;

const EnqueueSchema = z.object({
  // bevorzugt: draftId (VoteDraft) oder text
  draftId: z.string().optional().nullable(),
  contributionId: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  language: z.string().optional().nullable(), // "de" | "en" | ...
  // optional: bereits vorhandene claims (z.B. aus Draft)
  claims: z.array(z.any()).optional().nullable(),
  // evidence lookup
  withSerp: z.boolean().optional().default(true),
});

function toShortLang(v?: string | null): string {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return "de";
  return t.split(/[-_]/)[0] || "de";
}

function roleFromRequest(req: NextRequest): Role {
  const cookieRole = req.cookies.get("u_role")?.value as Role | undefined;
  const headerRole = (req.headers.get("x-role") as Role) || undefined;
  let role: Role = cookieRole ?? headerRole ?? "guest";
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(req.url);
    const qRole = url.searchParams.get("role") as Role | null;
    if (qRole) role = qRole;
  }
  return role;
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function coerceClaims(claims: unknown, maxClaims: number): StatementRecord[] {
  if (!Array.isArray(claims)) return [];
  // Wir akzeptieren entweder StatementRecord oder string (text)
  const normalized = claims
    .map((c, idx) => {
      if (typeof c === "string") {
        const text = c.trim();
        if (!text) return null;
        return { id: String(idx + 1), text } as any;
      }
      if (c && typeof c === "object" && typeof (c as any).text === "string") {
        const text = String((c as any).text).trim();
        if (!text) return null;
        // minimal: id/text
        return {
          id: String((c as any).id ?? idx + 1),
          text,
          title: (c as any).title ?? null,
          responsibility: (c as any).responsibility ?? null,
          importance: (c as any).importance ?? null,
          topic: (c as any).topic ?? null,
          domains: (c as any).domains ?? undefined,
          domain: (c as any).domain ?? undefined,
        } as any;
      }
      return null;
    })
    .filter(Boolean) as StatementRecord[];
  return normalized.slice(0, maxClaims);
}

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

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function syncDossierFromFactcheck(params: {
  statementId: string;
  title?: string | null;
  claims: StatementRecord[];
  serpResults: SerpResultLite[];
  withSerp: boolean;
  analysis?: AnalyzeResult | null;
}) {
  const dossier = await ensureDossierForStatement(params.statementId, { title: params.title ?? undefined });
  if (!dossier) return;

  await seedDossierFromAnalysis({
    dossierId: dossier.dossierId,
    claims: params.claims,
    questions: params.analysis?.questions ?? [],
    createdByRole: "pipeline",
  });

  const dossierId = dossier.dossierId;
  const now = new Date();

  if (params.withSerp && params.serpResults.length > 0) {
    const sourceCol = await dossierSourcesCol();
    const edgeCol = await dossierEdgesCol();
    const sources = [];

    for (const res of params.serpResults) {
      if (!res.url) continue;
      const url = normalizeUrl(res.url);
      const canonicalUrlHash = stableHash(url);
      const sourceId = `source_${canonicalUrlHash.slice(0, 12)}`;

      let publisher = clampPublisher(res.siteName ?? undefined);
      if (!publisher) {
        try {
          publisher = clampPublisher(new URL(url).hostname);
        } catch {
          publisher = "Quelle";
        }
      }
      const title = clampTitle(res.title ?? "Quelle") ?? "Quelle";
      const snippet = clampSnippet(res.snippet ?? undefined);

      const previousSource = await sourceCol.findOneAndUpdate(
        { dossierId, canonicalUrlHash },
        {
          $set: {
            url,
            title,
            publisher,
            type: "other",
            snippet,
            publishedAt: parseDate(res.publishedAt),
            updatedAt: now,
          },
          $setOnInsert: {
            dossierId,
            sourceId,
            canonicalUrlHash,
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: "before" },
      );

      const effectiveSourceId = previousSource?.sourceId ?? sourceId;
      sources.push({ sourceId: effectiveSourceId, url });
      await logDossierRevision({
        dossierId,
        entityType: "source",
        entityId: effectiveSourceId,
        action: previousSource ? "update" : "create",
        diffSummary: previousSource ? "Quelle aktualisiert (Factcheck)." : "Quelle hinzugefuegt (Factcheck).",
        byRole: "pipeline",
      });
    }

    for (const claim of params.claims) {
      const claimId = claim.id;
      for (const source of sources) {
        const edgeKey = `edge_${stableHash(`${dossierId}:${claimId}:${source.sourceId}:mentions`).slice(0, 12)}`;
        const edgeRes = await edgeCol.updateOne(
          { dossierId, fromId: claimId, toId: source.sourceId, rel: "mentions" },
          {
            $set: {
              fromType: "claim",
              fromId: claimId,
              toType: "source",
              toId: source.sourceId,
              rel: "mentions",
              active: true,
            },
            $unset: { archivedAt: "", archivedReason: "" },
            $setOnInsert: {
              dossierId,
              edgeId: edgeKey,
              createdBy: "pipeline",
              createdAt: now,
            },
          },
          { upsert: true },
        );
        await logDossierRevision({
          dossierId,
          entityType: "edge",
          entityId: edgeKey,
          action: edgeRes.upsertedId ? "create" : "update",
          diffSummary: edgeRes.upsertedId ? "Graph-Edge erstellt (Factcheck)." : "Graph-Edge aktualisiert (Factcheck).",
          byRole: "pipeline",
        });
      }
    }
  }

  if (params.withSerp && params.serpResults.length === 0 && params.claims.length > 0) {
    const findingCol = await dossierFindingsCol();
    const questionsCol = await openQuestionsCol();
    const claimCol = await dossierClaimsCol();

    for (const claim of params.claims) {
      const claimId = claim.id;
      const findingId = `finding_${claimId}`;
      const findingRes = await findingCol.updateOne(
        { dossierId, claimId, producedBy: "pipeline" },
        {
          $set: {
            findingId,
            dossierId,
            claimId,
            verdict: "unclear",
            rationale: ["Keine Quellen gefunden."],
            citations: [],
            producedBy: "pipeline",
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );

      const claimRes = await claimCol.updateOne(
        { dossierId, claimId },
        { $set: { status: "unclear", updatedAt: now } },
      );

      const questionId = `coverage_${claimId}`;
      const questionRes = await questionsCol.updateOne(
        { dossierId, questionId },
        {
          $set: {
            text: `Welche Primaerquelle fehlt fuer: ${claim.text}`,
            status: "open",
            updatedAt: now,
          },
          $setOnInsert: {
            dossierId,
            questionId,
            createdAt: now,
          },
        },
        { upsert: true },
      );

      await logDossierRevision({
        dossierId,
        entityType: "finding",
        entityId: findingId,
        action: findingRes.upsertedId ? "create" : "update",
        diffSummary: findingRes.upsertedId ? "Finding angelegt (keine Quellen)." : "Finding aktualisiert (keine Quellen).",
        byRole: "pipeline",
      });
      if (claimRes.modifiedCount > 0) {
        await logDossierRevision({
          dossierId,
          entityType: "claim",
          entityId: claimId,
          action: "status_change",
          diffSummary: "Claim-Status auf unklar gesetzt (keine Quellen).",
          byRole: "pipeline",
        });
      }
      await logDossierRevision({
        dossierId,
        entityType: "open_question",
        entityId: questionId,
        action: questionRes.upsertedId ? "create" : "update",
        diffSummary: "Coverage-Gap Frage gesetzt.",
        byRole: "pipeline",
      });
    }
  }

  await updateDossierCounts(dossierId, "Factcheck Sync");
  await touchDossierFactchecked(dossierId, now);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const role = roleFromRequest(req);
    if (!hasPermission(role, PERMISSIONS.FACTCHECK_ENQUEUE)) {
      const fe = formatError("FORBIDDEN", "Permission denied", { role });
      return json(fe, 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON", message: "Malformed JSON" }, 400);
    }

    let payload: z.infer<typeof EnqueueSchema>;
    try {
      payload = EnqueueSchema.parse(body);
    } catch (e) {
      const ze = e as ZodError;
      return json({ ok: false, code: "VALIDATION_ERROR", issues: ze.issues }, 400);
    }

    const lang = toShortLang(payload.language);
    const jobId = safeRandomId();

    // 1) Input bestimmen: Text oder Draft laden
    let inputText = (payload.text ?? "").trim();

    // 1a) Falls draftId vorhanden: VoteDraft laden (triMongo core -> vote_drafts)
    if (!inputText && payload.draftId) {
      try {
        const drafts = await voteDraftsCol();
        const id = payload.draftId.trim();
        if (ObjectId.isValid(id)) {
          const doc = await drafts.findOne({ _id: new ObjectId(id) });
          if (doc) {
            inputText = [doc.title, doc.summary].filter(Boolean).join("\n").trim();
          }
        }
      } catch {
        // ignore
      }
    }

    if (!inputText) {
      return json({ ok: false, code: "MISSING_INPUT", message: "Provide text or draftId" }, 400);
    }

    // 2) Claims bestimmen: entweder payload.claims, oder Analyze via Orchestrator
    let claims = coerceClaims(payload.claims, MAX_CLAIMS);
    let serpResults: SerpResultLite[] = [];
    let analysisError: string | null = null;
    let analysis: AnalyzeResult | null = null;

    if (claims.length === 0) {
      try {
        analysis = await analyzeContribution({
          text: inputText,
          locale: lang,
          pipeline: "factcheck" as any,
          maxClaims: MAX_CLAIMS,
        });
      } catch (err: any) {
        analysisError = err?.message ?? "analyze_failed";
        logger.warn({ err, analysisError }, "FACTCHECK_ANALYZE_FAIL");
      }

      if (analysis) {
        claims = coerceClaims(analysis.claims ?? [], MAX_CLAIMS);
      }
    }

    const status: FactcheckJobStatus = analysisError ? "failed" : "completed";

    // 3) SERP (optional, schnell & begrenzt)
    if (payload.withSerp !== false && claims.length > 0) {
      const q = (claims[0]?.text ?? inputText).slice(0, MAX_SERP_QUERY_CHARS);
      const serp = await callAriSearchSerp(q);
      if (serp.ok) serpResults = serp.results;
    }

    // 4) Persist Job (triMongo)
    const col = await factcheckJobsCol();
    const now = new Date();
    await col.insertOne({
      jobId,
      draftId: payload.draftId ?? null,
      contributionId: payload.contributionId ?? null,
      language: lang,
      inputText,
      status,
      verdict: "UNDETERMINED",
      confidence: 0.5,
      claims,
      serpResults,
      error: analysisError,
      createdAt: now,
      updatedAt: now,
      finishedAt: now,
    } as any);

    if (payload.contributionId) {
      try {
        await syncDossierFromFactcheck({
          statementId: payload.contributionId,
          title: null,
          claims,
          serpResults,
          withSerp: payload.withSerp !== false,
          analysis,
        });
      } catch (err: any) {
        logger.warn({ err }, "FACTCHECK_DOSSIER_SYNC_FAIL");
      }
    }

    const durationMs = Date.now() - t0;
    return json({
      ok: true,
      jobId,
      status,
      claimsCount: claims.length,
      serpCount: serpResults.length,
      durationMs,
      analysisError: analysisError ?? undefined,
    });
  } catch (e: any) {
    const fe = formatError("INTERNAL_ERROR", "Unexpected failure", e?.message ?? String(e));
    logger.error({ fe, e }, "FACTCHECK_ENQUEUE_FAIL");
    return NextResponse.json(fe, { status: 500 });
  }
}
