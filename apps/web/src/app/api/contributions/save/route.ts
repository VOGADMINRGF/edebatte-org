export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCol, ObjectId } from "@core/db/triMongo";
import { z } from "zod";

const DraftSaveSchema = z.object({
  draftId: z.string().optional(),
  text: z.string().min(1),
  textOriginal: z.string().optional(),
  textPrepared: z.string().optional(),
  evidenceItems: z.array(z.object({ id: z.string().optional(), url: z.string().optional(), note: z.string().optional() })).optional(),
  locale: z.string().optional(),
  source: z.string().optional(),
  analysis: z.unknown().optional(),
});

type ContributionDraftDoc = {
  _id?: ObjectId;
  authorId: string;
  text: string;
  textOriginal?: string;
  textPrepared?: string;
  evidenceItems?: { id?: string; url?: string; note?: string }[];
  locale?: string;
  source?: string;
  analysis?: unknown;
  status: "draft" | "finalized";
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
  proposalIds?: string[];
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  let body: z.infer<typeof DraftSaveSchema>;
  try {
    body = DraftSaveSchema.parse(await req.json());
  } catch (err: any) {
    const message = err?.issues?.[0]?.message ?? "invalid_body";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const Drafts = await getCol<ContributionDraftDoc>("contribution_drafts");
  const now = new Date();

  if (body.draftId) {
    let draftOid: ObjectId;
    try {
      draftOid = new ObjectId(body.draftId);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_draft" }, { status: 400 });
    }

    const result = await Drafts.findOneAndUpdate(
      { _id: draftOid, authorId: userId },
      {
        $set: {
          text: body.text,
          textOriginal: body.textOriginal ?? body.text,
          textPrepared: body.textPrepared ?? body.text,
          evidenceItems: body.evidenceItems ?? [],
          locale: body.locale ?? null,
          source: body.source ?? null,
          analysis: body.analysis ?? null,
          status: "draft",
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );

    const updated = (result as any)?.value ?? result;
    if (!updated) {
      return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      draftId: String(updated._id),
      updatedAt: updated.updatedAt?.toISOString() ?? now.toISOString(),
    });
  }

  const doc: ContributionDraftDoc = {
    authorId: userId,
    text: body.text,
    textOriginal: body.textOriginal ?? body.text,
    textPrepared: body.textPrepared ?? body.text,
    evidenceItems: body.evidenceItems ?? [],
    locale: body.locale ?? undefined,
    source: body.source ?? undefined,
    analysis: body.analysis ?? undefined,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const insert = await Drafts.insertOne(doc as ContributionDraftDoc);
  return NextResponse.json({ ok: true, draftId: String(insert.insertedId), updatedAt: now.toISOString() });
}
