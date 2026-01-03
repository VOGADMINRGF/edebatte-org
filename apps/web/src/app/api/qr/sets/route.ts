export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { requireCreatorContext } from "../../streams/utils";

const QuestionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(800).optional(),
  options: z.array(z.string().min(1).max(120)).min(2).max(8),
  publicAttribution: z.enum(["public", "hidden"]).optional(),
});

const CreateSetSchema = z.object({
  title: z.string().min(3).max(140).optional(),
  streamSessionId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  questions: z.array(QuestionSchema).min(1).max(5),
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

export async function POST(req: NextRequest) {
  const ctx = await requireCreatorContext(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = CreateSetSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });
  }

  const questions = parsed.data.questions.map((q, idx) => ({
    id: q.title.toLowerCase().replace(/\s+/g, "-").slice(0, 24) + `-${idx + 1}`,
    title: q.title,
    description: q.description ?? null,
    options: q.options.map((opt) => opt.trim()).filter(Boolean),
    publicAttribution: q.publicAttribution ?? "hidden",
    allowAnonymousVoting: q.publicAttribution !== "public",
  }));

  if (questions.some((q) => q.options.length < 2)) {
    return NextResponse.json({ ok: false, error: "options_required" }, { status: 400 });
  }

  const publicCount = questions.filter((q) => q.publicAttribution === "public").length;
  const hiddenCount = questions.length - publicCount;
  if (publicCount > 3) {
    return NextResponse.json({ ok: false, error: "public_limit_exceeded" }, { status: 400 });
  }
  if (questions.length >= 5 && hiddenCount < 2) {
    return NextResponse.json({ ok: false, error: "anonymous_minimum" }, { status: 400 });
  }

  const code = await generateUniqueCode();
  const now = new Date();

  const doc = {
    code,
    creatorId: ctx.userId,
    organizationId: parsed.data.organizationId ?? null,
    streamSessionId: parsed.data.streamSessionId ?? null,
    title: parsed.data.title ?? null,
    questions,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const col = await coreCol("qr_question_sets");
  const result = await col.insertOne(doc);

  return NextResponse.json({
    ok: true,
    setId: result.insertedId.toString(),
    code,
  });
}
