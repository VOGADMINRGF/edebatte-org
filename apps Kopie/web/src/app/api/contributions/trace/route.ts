export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import callOpenAI from "@features/ai/providers/openai";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

const TraceSchema = z.object({
  textOriginal: z.string().min(1).max(10_000),
  textPrepared: z.string().max(10_000).optional(),
  locale: z.string().min(2).max(8).optional(),
  statements: z
    .array(z.object({ id: z.string().min(1).max(80), text: z.string().min(3).max(800) }))
    .max(30)
    .default([]),
});

function buildPrompt(args: z.infer<typeof TraceSchema>) {
  const baseText = (args.textPrepared?.trim() || args.textOriginal.trim()).slice(0, 10_000);
  const list = args.statements
    .map((s, i) => `${i + 1}. (${s.id}) ${s.text}`)
    .join("\n");

  return `
Du erhältst Nutzer-Text und daraus abgeleitete Kernaussagen.
Aufgabe: Erzeuge NUR JSON.

REGELN:
- Du DARFST KEINE externen Fakten behaupten (keine realen Akteure, Medienhäuser, Verbände namentlich).
- Du gibst NUR: (a) Zitate aus dem Nutzer-Text, (b) Ein Prüf-/Recherche-Plan als Vorschläge.
- Quotes: max 18 Wörter je Quote, nur wörtliche Ausschnitte aus dem Text.
- "mode":
  - "verbatim" wenn Quote sehr nah an der Aussage ist,
  - "paraphrase" wenn umformuliert,
  - "inference" wenn Interpretation/Ergänzung.

INPUT TEXT:
${baseText}

KERNAUSSAGEN:
${list}

Gib zurück (JSON):
{
  "attribution": { "<id>": { "mode": "verbatim|paraphrase|inference", "quotes": ["...","..."], "why": "..." } },
  "guidance": {
    "concern": "...",
    "scopeHints": { "levels": ["Kommune","Land","Bund","EU/International"], "why": "..." },
    "istStandChecklist": { "society": ["..."], "media": ["..."], "politics": ["..."] },
    "proFrames": [ { "frame":"...", "stakeholders":["z.B. ..."] } ],
    "contraFrames": [ { "frame":"...", "stakeholders":["z.B. ..."] } ],
    "alternatives": ["..."],
    "searchQueries": ["..."],
    "sourceTypes": ["z.B. Gesetzestexte", "z.B. Fachstudien", "z.B. Stellungnahmen", "z.B. Statistiken"]
  }
}`.trim();
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = await rateLimitOrThrow(`trace:ip:${ip}`, 30, 10 * 60 * 1000, { salt: "trace" });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = TraceSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "invalid_body", issues: body.error.issues }, { status: 400 });
  }

  const prompt = buildPrompt(body.data);
  const guidanceOnly = (body.data.statements?.length ?? 0) === 0;

  const model = process.env.OPENAI_TRACE_MODEL || "gpt-4o-mini";
  const { text } = await callOpenAI({
    prompt,
    asJson: true,
    model,
    max_tokens: 1200,
    timeoutMs: 20_000,
  });

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!data || typeof data !== "object") {
    return NextResponse.json({ ok: false, error: "trace_parse_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, guidanceOnly, ...data }, { status: 200 });
}
