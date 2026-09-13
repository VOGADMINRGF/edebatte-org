export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId, coreCol } from "@core/db/triMongo";
import { anlassraumCol } from "@features/anlassraum/db";
import { requireCreatorContext } from "../../streams/utils";
import { evaluateQrQuestionSetQuestion } from "@/features/create/qrQuestionSetGuard";

const QuestionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(800).optional(),
  options: z.array(z.string().min(1).max(120)).min(2).max(12),
  publicAttribution: z.enum(["public", "hidden"]).optional(),
});

const CreateSetSchema = z.object({
  title: z.string().min(3).max(140).optional(),
  streamSessionId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  anlassraumId: z.string().min(1).optional(),
  dossierId: z.string().min(1).optional(),
  roundSlug: z.string().min(1).max(120).optional(),
  questions: z.array(QuestionSchema).min(1).max(10),
});

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateCode(len = 8) {
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

async function generateUniqueCode() {
  const col = await coreCol("qr_question_sets");
  for (let i = 0; i < 6; i += 1) {
    const code = generateCode();
    const exists = await col.findOne({ code }, { projection: { _id: 1 } });
    if (!exists) return code;
  }
  throw new Error("code_generation_failed");
}

const PUBLIC_MAX_QUESTIONS = 5;
const PUBLIC_MAX_OPTIONS = 5;

export async function POST(req: NextRequest) {
  const ctx = await requireCreatorContext(req);

  const raw = await req.json().catch(() => null);
  const parsed = CreateSetSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });
  }

  const questions = parsed.data.questions.map((q, idx) => {
    const questionGuard = evaluateQrQuestionSetQuestion({
      question: q.title,
      staffReviewerId: ctx?.isStaff ? ctx.userId : null,
    });
    return {
      id: q.title.toLowerCase().replace(/\s+/g, "-").slice(0, 24) + `-${idx + 1}`,
      title: q.title,
      description: q.description ?? null,
      options: q.options.map((opt) => opt.trim()).filter(Boolean),
      publicAttribution: q.publicAttribution ?? "hidden",
      allowAnonymousVoting: q.publicAttribution !== "public",
      questionGuard,
    };
  });

  if (questions.some((q) => q.options.length < 2)) {
    return NextResponse.json({ ok: false, error: "options_required" }, { status: 400 });
  }
  const blockedQuestion = questions.find(
    (question) => question.questionGuard.releaseState === "blocked",
  );
  if (blockedQuestion) {
    return NextResponse.json(
      {
        ok: false,
        error: "public_question_blocked",
        questionGuard: blockedQuestion.questionGuard,
      },
      { status: 422 },
    );
  }

  if (!ctx) {
    if (
      parsed.data.organizationId ||
      parsed.data.streamSessionId ||
      parsed.data.anlassraumId ||
      parsed.data.dossierId ||
      parsed.data.roundSlug
    ) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (questions.length > PUBLIC_MAX_QUESTIONS) {
      return NextResponse.json({ ok: false, error: "question_limit_exceeded" }, { status: 400 });
    }
    if (questions.some((q) => q.options.length > PUBLIC_MAX_OPTIONS)) {
      return NextResponse.json({ ok: false, error: "options_limit_exceeded" }, { status: 400 });
    }
    questions.forEach((q) => {
      q.publicAttribution = "hidden";
      q.allowAnonymousVoting = true;
    });
  }

  const code = await generateUniqueCode();
  const now = new Date();
  const reviewRequired = questions.some(
    (question) => question.questionGuard.releaseState === "review_required",
  );
  let anlassraumId: ObjectId | null = null;
  let dossierId: ObjectId | null = null;

  if (parsed.data.anlassraumId) {
    if (!ObjectId.isValid(parsed.data.anlassraumId)) {
      return NextResponse.json({ ok: false, error: "invalid_anlassraum_id" }, { status: 400 });
    }
    const roomId = new ObjectId(parsed.data.anlassraumId);
    const room = await (await anlassraumCol()).findOne({ _id: roomId });
    if (!room) {
      return NextResponse.json({ ok: false, error: "anlassraum_not_found" }, { status: 404 });
    }
    anlassraumId = roomId;
    if (room.dossierId) {
      dossierId = room.dossierId;
    }
  }

  if (parsed.data.dossierId) {
    if (!ObjectId.isValid(parsed.data.dossierId)) {
      return NextResponse.json({ ok: false, error: "invalid_dossier_id" }, { status: 400 });
    }
    dossierId = new ObjectId(parsed.data.dossierId);
  }

  const doc = {
    code,
    creatorId: ctx?.userId ?? null,
    organizationId: ctx ? parsed.data.organizationId ?? null : null,
    streamSessionId: ctx ? parsed.data.streamSessionId ?? null : null,
    title: parsed.data.title ?? null,
    questions,
    anlassraumId,
    dossierId,
    roundSlug: parsed.data.roundSlug ?? null,
    protocolStatus: "open",
    status: reviewRequired ? "review_required" : "active",
    questionGuardReviewState: reviewRequired ? "review_required" : "not_required",
    version: 0,
    noAutoApproval: true,
    noAutoPublish: true,
    source: ctx ? "creator" : "public_qr_studio",
    createdAt: now,
    updatedAt: now,
  };

  const col = await coreCol("qr_question_sets");
  const result = await col.insertOne(doc);

  return NextResponse.json(
    {
      ok: true,
      setId: result.insertedId.toString(),
      code,
      status: doc.status,
      questionGuardReviewState: doc.questionGuardReviewState,
      anlassraumId: anlassraumId?.toHexString() ?? null,
      dossierId: dossierId?.toHexString() ?? null,
      roundSlug: parsed.data.roundSlug ?? null,
      noAutoApproval: true,
      noAutoPublish: true,
    },
    { status: reviewRequired ? 202 : 200 },
  );
}
