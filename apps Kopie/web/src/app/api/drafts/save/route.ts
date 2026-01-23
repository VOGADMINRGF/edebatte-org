export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { ObjectId, coreCol } from "@core/db/triMongo";
import { readSession } from "@/utils/session";

const DEV_DISABLE_CSRF = process.env.DEV_DISABLE_CSRF === "1";

async function isCsrfValid(req: NextRequest): Promise<boolean> {
  if (DEV_DISABLE_CSRF) return true;
  const jar = await cookies();
  const c = jar.get("csrf-token")?.value ?? "";
  const h = req.headers.get("x-csrf-token") ?? (await headers()).get("x-csrf-token") ?? "";
  if (c && h && c === h) return true;
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

const SaveDraftSchema = z.object({
  draftId: z.string().nullable().optional(),
  locale: z.string().min(2).max(10).optional(),
  source: z.string().optional(),
  text: z.string().min(1),
  textOriginal: z.string().optional(),
  textPrepared: z.string().optional(),
  evidenceInput: z.string().optional(),
  analysis: z.any().optional(),
});

type DraftDoc = {
  _id: ObjectId;
  userId: string;
  locale?: string;
  source?: string;
  text: string;
  textOriginal?: string;
  textPrepared?: string;
  evidenceInput?: string;
  analysis?: any;
  status: "draft" | "finalized";
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(req: NextRequest) {
  try {
    if (!(await isCsrfValid(req))) return csrfForbidden();

    const session = await readSession();
    const userId = session?.uid;
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = SaveDraftSchema.parse(await req.json().catch(() => ({})));
    const col = await coreCol<DraftDoc>("drafts");
    const now = new Date();

    if (body.draftId && ObjectId.isValid(body.draftId)) {
      const _id = new ObjectId(body.draftId);
      const update: Partial<DraftDoc> = {
        text: body.text,
        updatedAt: now,
      };
      if (body.locale !== undefined) update.locale = body.locale;
      if (body.source !== undefined) update.source = body.source;
      if (body.textOriginal !== undefined) update.textOriginal = body.textOriginal;
      if (body.textPrepared !== undefined) update.textPrepared = body.textPrepared;
      if (body.evidenceInput !== undefined) update.evidenceInput = body.evidenceInput;
      if (body.analysis !== undefined) update.analysis = body.analysis;

      const res = await col.updateOne({ _id, userId }, { $set: update });
      if (!res.matchedCount) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        draftId: String(_id),
        updatedAt: now.toISOString(),
      });
    }

    const _id = new ObjectId();
    const doc: DraftDoc = {
      _id,
      userId,
      locale: body.locale,
      source: body.source,
      text: body.text,
      textOriginal: body.textOriginal,
      textPrepared: body.textPrepared,
      evidenceInput: body.evidenceInput,
      analysis: body.analysis,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    await col.insertOne(doc);

    return NextResponse.json({
      ok: true,
      draftId: String(_id),
      updatedAt: now.toISOString(),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "invalid_input", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "save_failed", message: err?.message ?? "save_failed" },
      { status: 500 },
    );
  }
}
