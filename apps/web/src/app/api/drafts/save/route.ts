export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "@core/db/triMongo";
import { coreDb } from "@core/db/triMongo";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { assertCsrf } from "@/lib/security/csrf";

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
    assertCsrf(req);
    const user = await requireServerUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = SaveDraftSchema.parse(await req.json().catch(() => ({})));
    const db = await coreDb();
    const col = db.collection<DraftDoc>("drafts");
    const now = new Date();

    if (body.draftId && ObjectId.isValid(body.draftId)) {
      const _id = new ObjectId(body.draftId);
      const existing = await col.findOne({ _id, userId: String(user.id) });
      if (!existing) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      await col.updateOne(
        { _id, userId: String(user.id) },
        {
          $set: {
            locale: body.locale ?? existing.locale,
            source: body.source ?? existing.source,
            text: body.text,
            textOriginal: body.textOriginal ?? existing.textOriginal,
            textPrepared: body.textPrepared ?? existing.textPrepared,
            evidenceInput: body.evidenceInput ?? existing.evidenceInput,
            analysis: body.analysis ?? existing.analysis,
            updatedAt: now,
          },
        },
      );

      return NextResponse.json({
        ok: true,
        draftId: String(_id),
        updatedAt: now.toISOString(),
      });
    }

    const _id = new ObjectId();
    const doc: DraftDoc = {
      _id,
      userId: String(user.id),
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
    return NextResponse.json(
      { ok: false, error: "save_failed", message: err?.message ?? "save_failed" },
      { status: 500 },
    );
  }
}
