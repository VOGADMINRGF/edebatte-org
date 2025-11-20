// apps/web/src/app/api/contributions/analyze/route.ts
import { NextRequest } from "next/server";
import { analyzeContribution } from "@features/analyze/analyzeContribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

const DEFAULT_MAX_CLAIMS = 20;

function ok(data: any, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: JSON_HEADERS,
  });
}

function err(message: string, status = 500, extra: any = {}) {
  return new Response(JSON.stringify({ ok: false, error: message, ...extra }), {
    status,
    headers: JSON_HEADERS,
  });
}

type AnalyzeBody = {
  text: string;
  locale?: string;
  maxClaims?: number;
  stream?: boolean;
  live?: boolean;
};

function sanitizeLocale(locale?: string): string {
  if (typeof locale === "string" && locale.trim()) {
    return locale.trim();
  }
  return "de";
}

function sanitizeMaxClaims(maxClaims?: number): number {
  if (
    typeof maxClaims === "number" &&
    Number.isFinite(maxClaims) &&
    maxClaims > 0
  ) {
    return Math.min(DEFAULT_MAX_CLAIMS, Math.max(1, Math.floor(maxClaims)));
  }
  return DEFAULT_MAX_CLAIMS;
}

/**
 * E150 – Contribution-AI
 * - JSON: { ok: true, result: AnalyzeResult }
 * - SSE: progress/result/error-events mit identischem Result-Shape
 */
export async function POST(req: NextRequest): Promise<Response> {
  let body: AnalyzeBody | null = null;

  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return err("Missing 'text' in request body", 400);
  }

  const locale = sanitizeLocale(body.locale);
  const maxClaims = sanitizeMaxClaims(body.maxClaims);
  const text = body.text;

  if (wantsSse(req, body)) {
    return startAnalyzeSseStream(req);
  }

  try {
    const result = await analyzeContribution({
      text,
      locale,
      maxClaims,
    });

    return ok({ result }, 200);
  } catch (e: any) {
    console.error("[E150] /api/contributions/analyze error", e);
    const msg = String(e?.message ?? "");
    const normalized =
      msg.includes("KI-Antwort war kein gültiges JSON")
        ? "AnalyzeContribution: KI-Antwort war kein gültiges JSON. Bitte später erneut versuchen."
        : "AnalyzeContribution: Fehler im Analyzer. Bitte später erneut versuchen.";
    return err(normalized, 500);
  }
}

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
} as const;

function wantsSse(req: NextRequest, body: AnalyzeBody | null): boolean {
  if (body?.stream === true || body?.live === true) return true;
  const accept = req.headers.get("accept")?.toLowerCase() ?? "";
  return accept.includes("text/event-stream");
}

/**
 * Platzhalter für künftigen SSE-Modus (progress events, Zwischenschritte).
 * TODO: Echte Implementierung nachziehen, sobald Orchestrator Zwischenschritte liefert.
 */
function startAnalyzeSseStream(_req: NextRequest): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const notImplemented = {
        event: "error",
        data: "Server-Sent Events sind noch nicht implementiert.",
      };
      controller.enqueue(
        encoder.encode(`event: ${notImplemented.event}\ndata: ${JSON.stringify({ reason: notImplemented.data })}\n\n`)
      );
      controller.close();
    },
  });
  return new Response(stream, {
    status: 501,
    headers: SSE_HEADERS,
  });
}
