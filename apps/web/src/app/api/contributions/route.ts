import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import { sendMail } from "@/utils/mailer";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_TEXT_LENGTH = 20;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

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
      content: text,
      locale: locale || undefined,
      context: {
        role: role || undefined,
        level: level || undefined,
      },
      attachments,
      createdAt: now,
      updatedAt: now,
      status: "pending_review",
      reviewStatus: "pending",
      analysis: { status: "pending" },
      source: "landing_demo",
    };

    const col = await coreCol("contributions");
    const result = await col.insertOne(entry);

    const adminTo = process.env.MAIL_ADMIN_TO || "beitraege@edebatte.org";
    const preview = text.length > 600 ? `${text.slice(0, 600)}…` : text;
    const subject = "Neue Landing-Einreichung (pending_review)";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px 0;font-size:18px;">Neue Landing-Einreichung</h2>
        <p style="margin:0 0 10px 0;"><strong>ID:</strong> ${String(result.insertedId)}</p>
        <p style="margin:0 0 10px 0;"><strong>Locale:</strong> ${locale || "n/a"}</p>
        <p style="margin:0 0 10px 0;"><strong>Rolle:</strong> ${role || "n/a"} · <strong>Ebene:</strong> ${level || "n/a"}</p>
        <p style="margin:0 0 10px 0;"><strong>Dateien:</strong> ${attachments.length}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:14px 0;" />
        <p style="margin:0 0 8px 0;font-weight:600;">Text</p>
        <div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">${preview
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>
        <p style="margin:12px 0 0 0;font-size:12px;color:#64748b;">Quelle: landing_demo · Status: pending_review</p>
      </div>
    `;
    await sendMail({ to: adminTo, subject, html });

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = process.env.CONTRIB_READ_TOKEN;
  const provided = url.searchParams.get("token") || req.headers.get("x-read-token");

  if (token && provided !== token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = Math.min(Number(url.searchParams.get("limit") || DEFAULT_LIMIT), MAX_LIMIT);
  const skip = Math.max(Number(url.searchParams.get("skip") || 0), 0);
  const source = url.searchParams.get("source");
  const query = source ? { source } : {};

  const col = await coreCol("contributions");
  const items = await col
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const data = items.map((doc: any) => ({
    id: String(doc._id),
    text: doc.text ?? doc.content ?? "",
    locale: doc.locale ?? null,
    status: doc.status ?? null,
    reviewStatus: doc.reviewStatus ?? null,
    source: doc.source ?? null,
    attachments: doc.attachments ?? [],
    createdAt: doc.createdAt ?? null,
  }));

  return NextResponse.json({ ok: true, items: data });
}
