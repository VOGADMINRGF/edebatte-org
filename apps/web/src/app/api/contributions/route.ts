import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TEXT_LENGTH = 20;

function getString(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function makeTitleFromText(text: string) {
  const line = text.split("\n").find(Boolean) || text;
  return line.slice(0, 120);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const skip = Math.max(Number(url.searchParams.get("skip") || 0), 0);
  const sortRaw = String(url.searchParams.get("sort") || "-createdAt");
  const sortKey = sortRaw.startsWith("-") ? sortRaw.slice(1) : sortRaw;
  const sortDir = sortRaw.startsWith("-") ? -1 : 1;

  const col = await coreCol("contributions");
  const items = await col
    .find({})
    .sort({ [sortKey]: sortDir })
    .skip(skip)
    .limit(limit)
    .toArray();

  // keep shape tolerant
  const data = items.map((d: any) => ({ id: String(d._id), ...d }));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const source = getString(formData, "source") || "web";
    const locale = getString(formData, "locale") || getString(formData, "language") || "de";

    // LandingDemo sends "text" – ContributionForm sends "content"
    const text = getString(formData, "text");
    const content = getString(formData, "content");
    const mergedText = (text || content).trim();

    const title = getString(formData, "title");
    const summary = getString(formData, "summary");

    const role = getString(formData, "role");
    const level = getString(formData, "level");

    // ContributionForm optional JSON fields
    const linksRaw = getString(formData, "links");
    const mediaRaw = getString(formData, "media");
    const links = linksRaw ? safeJson<any[]>(linksRaw, []) : [];
    const media = mediaRaw ? safeJson<any[]>(mediaRaw, []) : [];

    // LandingDemo file uploads (metadata only for now)
    const fileEntries = [...formData.getAll("files"), ...formData.getAll("files[]")];
    const files = fileEntries.filter((e): e is File => e instanceof File);
    const attachments = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    // Enforce HumanCheck only for landing demo bridge
    if (source === "landing_demo") {
      const humanA = Number(getString(formData, "humanA"));
      const humanB = Number(getString(formData, "humanB"));
      const humanAnswer = Number(getString(formData, "humanAnswer"));

      if (!mergedText || mergedText.length < MIN_TEXT_LENGTH) {
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
    }

    // Minimal validation for all sources (don’t break internal tools)
    if (!mergedText) {
      return NextResponse.json({ ok: false, message: "Inhalt fehlt." }, { status: 400 });
    }

    const now = new Date();
    const doc = {
      source,
      locale,
      language: locale,

      title: title || makeTitleFromText(mergedText),
      summary: summary || undefined,
      content: mergedText,

      context: {
        role: role || undefined,
        level: level || undefined,
      },

      links,
      media,
      attachments,

      status: source === "landing_demo" ? "pending_review" : "new",
      createdAt: now,
      updatedAt: now,
    };

    const col = await coreCol("contributions");
    const result = await col.insertOne(doc);

    return NextResponse.json({
      ok: true,
      contributionId: String(result.insertedId),
      status: doc.status,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Beitrag konnte nicht gespeichert werden.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
