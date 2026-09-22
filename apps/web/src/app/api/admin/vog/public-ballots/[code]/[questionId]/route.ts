export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import {
  buildVogPublicBallotHref,
  validateVogPublicBallotQuestion,
  VogPublicBallotReleaseSchema,
} from "@features/vog/publicBallotContract";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  enforceVogPublicBallotReleaseSecurity,
  readVogPublicBallotReleaseJson,
} from "@/features/vog/publicBallotSecurity";

type QrQuestionSet = {
  code?: string;
  status?: string;
  questions?: Array<Record<string, unknown>>;
};

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ code: string; questionId: string }> },
) {
  const securityFailure = enforceVogPublicBallotReleaseSecurity(req);
  if (securityFailure) return securityFailure;

  const actor = await requireAdminOrResponse(req);
  if (actor instanceof Response) return actor;

  const payload = await readVogPublicBallotReleaseJson(req);
  if ("response" in payload) return payload.response;
  const parsed = VogPublicBallotReleaseSchema.safeParse(payload.value);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_release_contract" },
      { status: 400 },
    );
  }

  const { code, questionId } = await context.params;
  if (!code || !questionId || code.length > 120 || questionId.length > 120) {
    return NextResponse.json(
      { ok: false, error: "ballot_not_found" },
      { status: 404 },
    );
  }

  const sets = await coreCol<QrQuestionSet>("qr_question_sets");
  const set = await sets.findOne({ code });
  const question = set?.questions?.find(
    (candidate) => String(candidate.id ?? "") === questionId,
  );
  if (!set || !question) {
    return NextResponse.json(
      { ok: false, error: "ballot_not_found" },
      { status: 404 },
    );
  }
  if (parsed.data.status === "open" && set.status !== "active") {
    return NextResponse.json(
      { ok: false, error: "question_set_not_active" },
      { status: 409 },
    );
  }

  const validated = validateVogPublicBallotQuestion({
    ...question,
    vogPublicBallot: parsed.data,
  });
  if (!validated) {
    return NextResponse.json(
      {
        ok: false,
        error: "question_not_public_guest_compatible",
      },
      { status: 409 },
    );
  }

  const duplicateOrigin = await sets.findOne({
    code: { $ne: code },
    questions: {
      $elemMatch: {
        "vogPublicBallot.originId": parsed.data.originId,
        "vogPublicBallot.publicRelease": true,
      },
    },
  });
  if (duplicateOrigin) {
    return NextResponse.json(
      { ok: false, error: "origin_id_already_released" },
      { status: 409 },
    );
  }

  const result = await sets.updateOne(
    { code, "questions.id": questionId },
    {
      $set: {
        "questions.$.vogPublicBallot": parsed.data,
        updatedAt: new Date(),
      },
    },
  );
  if (!result.matchedCount) {
    return NextResponse.json(
      { ok: false, error: "ballot_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    release: {
      originId: parsed.data.originId,
      status: parsed.data.status,
      publicHref: buildVogPublicBallotHref({
        code,
        questionId,
        source: "vote4gov",
        origin: "voiceopengov",
        originId: parsed.data.originId,
        readingLocale: parsed.data.originalLocale,
        uiLocale: parsed.data.originalLocale,
        outputLocale: parsed.data.originalLocale,
      }),
    },
  });
}
