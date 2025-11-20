import { analyzeContribution } from "@features/analyze/analyzeContribution";
const REQUIRE_LOGIN = process.env.REQUIRE_LOGIN === "1";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { cookies, headers } from "next/headers";
import { coreCol, ObjectId } from "@core/db/triMongo";
import { readSession } from "src/utils/session";

const DEV_DISABLE_CSRF = process.env.DEV_DISABLE_CSRF === "1";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function safeLang(v: unknown) {
  const ok = new Set(["de","en","fr","it","es","pl","uk","ru","tr","hi","zh","ar"]);
  const x = typeof v === "string" ? v.slice(0, 2).toLowerCase() : "de";
  return ok.has(x) ? x : "de";
}
type CursorPayload = { t: string | number | Date; id: string };
function enc(c: CursorPayload) {
  const t = c.t instanceof Date ? c.t.toISOString() : String(c.t);
  return Buffer.from(JSON.stringify({ t, id: c.id })).toString("base64url");
}
function dec(s: string): CursorPayload {
  const j = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
  if (!j?.t || !j?.id) throw new Error("bad cursor");
  return j as CursorPayload;
}

async function isCsrfValid(req: NextRequest): Promise<boolean> {
  if (DEV_DISABLE_CSRF) return true;
  const jar = await cookies();
  const c = jar.get("csrf-token")?.value ?? "";
  // bevorzugt expliziter Header; fallback: global headers() (Next 15 dynamic)
  const h = req.headers.get("x-csrf-token") ?? (await headers()).get("x-csrf-token") ?? "";
  if (c && h && c === h) return true;

  // DEV-Fallback: gleiche Origin + gesetztes Cookie reicht
  try {
    const origin = req.nextUrl.origin;
    const referer = req.headers.get("referer") || "";
    const sameOrigin = referer.startsWith(origin);
    if (sameOrigin && c && !h) return true;
  } catch {}
  return false;
}
function csrfForbidden() {
  return NextResponse.json({ ok: false, error: "forbidden_csrf" }, { status: 403 });
}

// GET – Cursor Pagination + optionale Filter
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "20");
  const limit = clamp(Number.isFinite(limitParam) ? limitParam : 20, 1, 100);
  const cursor = url.searchParams.get("cursor");

  let category = url.searchParams.get("category")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const language = url.searchParams.get("language")?.trim();

  let query: Record<string, any> = {};
  if (category) query.category = category;
  if (status) query.status = status;
  if (language) query.language = language;

  if (cursor) {
    try {
      const { t, id } = dec(cursor);
      const d = new Date(String(t));
      if (!Number.isNaN(d.getTime()) && ObjectId.isValid(String(id))) {
        const older = {
          $or: [
            { createdAt: { $lt: d } },
            { createdAt: d, _id: { $lt: new ObjectId(String(id)) } },
          ],
        };
        query = Object.keys(query).length ? { $and: [query, older] } : older;
      }
    } catch { /* ignore bad cursor */ }
  }

  const col = await coreCol("statements");
  const docs = await col.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).toArray();

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  const data = docs.map((d: any) => ({
    id: String(d._id),
    title: d.title,
    text: d.text,
    category: d.category,
    language: d.language,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    factcheckStatus: d.factcheckStatus ?? null,
    stats: d.stats ?? {
      views: 0, votesAgree: 0, votesNeutral: 0, votesDisagree: 0, votesTotal: 0,
    },
    location: d.location ?? null,
  }));

  const last = docs.at(-1);
  const nextCursor = hasMore && last ? enc({ t: last.createdAt, id: String(last._id) }) : null;

  const res = NextResponse.json({ ok: true, data, nextCursor });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

// Factcheck-Job optional enqueuen
async function tryEnqueueFactcheck(payload: any) {
  try {
    const { getFactcheckQueue } = await import("@core/queue/factcheckQueue");
    const q = getFactcheckQueue();
    await q.add("factcheck", payload, { jobId: `stmt-${payload.contributionId}` });
  } catch (err) {
    console.warn("[factcheck enqueue skipped]", (err as any)?.message || err);
  }
}

// POST – persist
export async function POST(req: NextRequest) {
  if (!(await isCsrfValid(req))) return csrfForbidden();

  const sess = await readSession();
  if (REQUIRE_LOGIN && !sess) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const rawText = body?.text ?? body?.content ?? "";
  const text = String(rawText).trim().slice(0, 4000);
  if (!text) return NextResponse.json({ ok: false, error: "text_required" }, { status: 400 });

  const providedTitle = String(body?.title ?? "").trim().slice(0, 200);
  const autoTitle = (text.split(/\n+/).find(Boolean) || "").slice(0, 120) || "Beitrag";
  const title = providedTitle || autoTitle;

  let category = String(body?.category ?? "").trim().slice(0,80);
  const language = safeLang(body?.language);
  const scope = body?.scope ? String(body.scope).slice(0, 120) : undefined;
  const timeframe = body?.timeframe ? String(body.timeframe).slice(0, 120) : undefined;

  
  const analysis = await analyzeContribution({ text, locale: language });
  if (!category) {
    const firstTopic = analysis.claims.find((c) => c.topic)?.topic;
    if (firstTopic) category = firstTopic;
  }
  const now = new Date();

  const doc: any = { analysis,
    title, text, category, language,
    author: null,
    userId: (sess as any)?.uid ?? null,
    createdAt: now, updatedAt: now,
    factcheckStatus: "queued" as const,
    stats: { views: 0, votesAgree: 0, votesNeutral: 0, votesDisagree: 0, votesTotal: 0 },
  };

  if (body?.location && Array.isArray(body.location?.coordinates)) {
    doc.location = {
      type: "Point",
      coordinates: [Number(body.location.coordinates[0]), Number(body.location.coordinates[1])] as [number, number],
    };
  }

  const col = await coreCol("statements");
  const ins = await col.insertOne(doc);
  const id = String(ins.insertedId);

  tryEnqueueFactcheck({ contributionId: id, text, language, topic: category, scope, timeframe }).catch(() => {});
  const resp = NextResponse.json({ ok: true, id }, { status: 201 });
  resp.headers.set("Location", `/api/statements/${id}`);
  return resp;
}
