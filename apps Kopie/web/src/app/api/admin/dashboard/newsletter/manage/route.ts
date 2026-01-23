import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

type Body = {
  email?: string;
  name?: string | null;
  subscribe?: boolean;
};

type NewsletterDoc = {
  _id?: any;
  email: string;
  name?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  settings?: { newsletterOptIn?: boolean | null };
  newsletterOptIn?: boolean | null;
};

function mapEntry(doc: NewsletterDoc) {
  return {
    email: doc.email,
    name: doc.name ?? null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  };
}

function normalizeEmail(email?: string | null) {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
  return valid ? trimmed : null;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  const subscribe = body.subscribe !== false;
  const name = body.name?.trim() || null;

  const users = await getCol<NewsletterDoc>("users");
  const existing = await users.findOne({ email });

  if (subscribe) {
    await users.updateOne(
      { email },
      {
        $set: {
          email,
          name: name ?? existing?.name ?? null,
          "settings.newsletterOptIn": true,
          newsletterOptIn: true,
        },
        $setOnInsert: { createdAt: new Date() },
        $currentDate: { updatedAt: true },
      },
      { upsert: true },
    );
  } else if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: { "settings.newsletterOptIn": false, newsletterOptIn: false },
        $currentDate: { updatedAt: true },
      },
    );
  }

  const updated = await users.findOne({ email });
  return NextResponse.json({ ok: true, entry: updated ? mapEntry(updated) : null });
}
