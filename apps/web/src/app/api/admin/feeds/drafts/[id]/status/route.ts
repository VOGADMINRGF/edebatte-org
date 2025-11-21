"use server";

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { voteDraftsCol } from "@features/feeds/db";
import type { VoteDraftStatus } from "@features/feeds/types";
import { isStaffRequest } from "../../../utils";

const ALLOWED_STATUS: VoteDraftStatus[] = ["draft", "review", "discarded"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const status = String(body?.status ?? "").toLowerCase() as VoteDraftStatus;
  const reviewNote = body?.reviewNote ? String(body.reviewNote).slice(0, 2000) : undefined;
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  let draftId: ObjectId;
  try {
    draftId = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const drafts = await voteDraftsCol();
  const now = new Date();
  const update: any = {
    status,
    updatedAt: now,
  };
  if (status === "discarded") {
    update.reviewNote = reviewNote ?? null;
  } else if (reviewNote !== undefined) {
    update.reviewNote = reviewNote;
  }

  const result = await drafts.findOneAndUpdate(
    { _id: draftId },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!result.value) {
    return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    draft: {
      id: result.value._id.toHexString(),
      status: result.value.status,
      reviewNote: result.value.reviewNote ?? null,
      updatedAt: result.value.updatedAt?.toISOString?.() ?? null,
    },
  });
}
