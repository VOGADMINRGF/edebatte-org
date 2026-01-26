import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TEXT_LENGTH = 20;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const honey = getString(formData, "honey");
    if (honey) {
      return NextResponse.json({ ok: false, message: "Spam block." }, { status: 400 });
    }

    const text = getString(formData, "text");
    const locale = getString(formData, "locale");
    const role = getString(formData, "role");
    const level = getString(formData, "level");

    const humanA = Number(getString(formData, "humanA"));
    const humanB = Number(getString(formData, "humanB"));
    const humanAnswer = Number(getString(formData, "humanAnswer"));

    if (!text || text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        { ok: false, message: "Bitte mindestens 20 Zeichen schreiben." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(humanA) || !Number.isFinite(humanB) || !Number.isFinite(humanAnswer)) {
      return NextResponse.json({ ok: false, message: "Human-Check ungültig." }, { status: 400 });
    }

    if (humanAnswer !== humanA + humanB) {
      return NextResponse.json({ ok: false, message: "Human-Check stimmt nicht." }, { status: 400 });
    }

    const fileEntries = [...formData.getAll("files"), ...formData.getAll("files[]")];
    const files = fileEntries.filter((entry): entry is File => entry instanceof File);
    const attachments = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    const now = new Date();
    const entry = {
      text,
      locale: locale || undefined,
      context: {
        role: role || undefined,
        level: level || undefined,
      },
      attachments,
      createdAt: now,
      updatedAt: now,
      status: "pending_review",
      source: "landing_demo",
    };

    const col = await coreCol("contributions");
    const result = await col.insertOne(entry);

    return NextResponse.json({
      ok: true,
      contributionId: String(result.insertedId),
      status: "pending_review",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beitrag konnte nicht gespeichert werden.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
