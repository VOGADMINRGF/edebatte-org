// apps/web/src/app/api/public/updates/route.ts
// Public Updates mit HumanCheck, Rate-Limit + Double-Opt-in Start.

import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Collection } from "mongodb";
import { coreCol } from "@core/db/triMongo";
import { incrementRateLimit } from "@/lib/security/rate-limit";
import { verifyHumanToken } from "@/lib/security/human-token";
import { sendMail } from "@/utils/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 Minuten
const EMAIL_RATE_LIMIT_MAX = 4;
const EMAIL_RATE_LIMIT_WINDOW = 60 * 60; // 1 Stunde
const DEFAULT_CONSENT_VERSION = process.env.UPDATES_CONSENT_VERSION || "updates_v1";
const UPDATES_NOTIFY_TO = process.env.UPDATES_NOTIFY_TO;
const MIN_FORM_MS = 1500;
const MAX_FORM_MS = 2 * 60 * 60 * 1000;

const bodySchema = z.object({
  email: z.string().email(),
  interests: z.string().trim().max(500).optional(),
  name: z.string().trim().max(200).optional(),
  locale: z.string().trim().max(10).optional(),
  humanToken: z.string().min(10).max(1024),
  formStartedAt: z.coerce.number().optional(),
  hp_updates: z.string().optional(),
});

type SubscriberStatus = "pending" | "active" | "unsubscribed";

type SubscriberDoc = {
  _id?: any;
  email: string;
  name: string | null;
  interests: string | null;
  locale: string | null;
  consentVersion: string;
  status: SubscriberStatus;
  confirmTokenHash?: string | null;
  confirmTokenExpiresAt?: Date | null;
  confirmedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function hashedClientKey(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ua = req.headers.get("user-agent") || "unknown";
  const key = `${ip}|${ua}`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 32);
}

function generateConfirmToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashConfirmToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getPublicOrigin(req: NextRequest) {
  const envOrigin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.WEB_BASE_URL ||
    process.env.PUBLIC_BASE_URL;
  const raw = envOrigin || req.nextUrl.origin;
  return raw.replace(/\/$/, "");
}

function getMembershipUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/mitglied-werden`;
}

function buildConfirmMail(opts: {
  email: string;
  name?: string | null;
  confirmUrl: string;
  origin: string;
}) {
  const { email, name, confirmUrl, origin } = opts;
  const greeting = name ? `Hallo ${name}` : "Hallo";
  const membershipUrl = getMembershipUrl(origin);

  const html = `
    <p>${greeting},</p>
    <p>du hast deine E-Mail-Adresse <strong>${email}</strong> für Updates von VoiceOpenGov eingetragen.</p>
    <p>Bitte bestätige deine Anmeldung mit einem Klick:</p>
    <p>
      <a href="${confirmUrl}"
         style="display:inline-flex;padding:10px 18px;border-radius:999px;background:#111;color:#fff;text-decoration:none;font-weight:600;">
        Anmeldung bestätigen
      </a>
    </p>
    <p>Oder kopiere diesen Link in deinen Browser:<br />
      <a href="${confirmUrl}">${confirmUrl}</a>
    </p>
    <p>Mit deinen Updates halten wir dich über neue Abstimmungen, Funktionen und Beteiligungsmöglichkeiten auf dem Laufenden.</p>
    <p>Wenn du unsere Arbeit langfristig stärken möchtest, kannst du jederzeit
      <a href="${membershipUrl}">Mitglied werden</a> oder uns auch anonym unterstützen.</p>
    <p>Falls du dich nicht selbst eingetragen hast, kannst du diese Nachricht ignorieren.</p>
    <p>– Dein Team von VoiceOpenGov</p>
  `;

  const text = `${greeting},

du hast deine E-Mail-Adresse ${email} für Updates von VoiceOpenGov eingetragen.

Bitte bestätige deine Anmeldung über diesen Link:
${confirmUrl}

Mit deinen Updates halten wir dich über neue Abstimmungen, Funktionen und Beteiligungsmöglichkeiten auf dem Laufenden.

Wenn du unsere Arbeit langfristig stärken möchtest, kannst du jederzeit Mitglied werden oder uns anonym unterstützen:
${membershipUrl}

Falls du dich nicht selbst eingetragen hast, kannst du diese Nachricht ignorieren.

– Dein Team von VoiceOpenGov`;

  return {
    subject: "Bitte bestätige deine Anmeldung für VoiceOpenGov-Updates",
    html,
    text,
  };
}

function buildInternalNotifyMail(opts: {
  email: string;
  name?: string | null;
  interests?: string | null;
}) {
  const { email, name, interests } = opts;
  const subject =
    "Neue Anmeldung für VoiceOpenGov-Updates (Double-Opt-in gestartet)";
  const html = `
    <p>Es gibt eine neue Anmeldung für den Updates-Verteiler.</p>
    <ul>
      <li><strong>E-Mail:</strong> ${email}</li>
      <li><strong>Name:</strong> ${name || "—"}</li>
      <li><strong>Interessen:</strong> ${interests || "—"}</li>
    </ul>
    <p>Status: <strong>pending</strong> – Bestätigung per Double-Opt-in steht noch aus.</p>
  `;
  const text = `Neue Anmeldung für den Updates-Verteiler:

E-Mail: ${email}
Name: ${name || "—"}
Interessen: ${interests || "—"}

Status: pending (Double-Opt-in läuft).`;

  return { subject, html, text };
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const {
    email: rawEmail,
    interests,
    name,
    locale: rawLocale,
    humanToken,
    formStartedAt,
    hp_updates,
  } = parsed.data;

  if (hp_updates && hp_updates.trim().length > 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const payload = await verifyHumanToken(humanToken);
  if (!payload || payload.formId !== "public-updates") {
    return NextResponse.json(
      { ok: false, error: "invalid_human_token" },
      { status: 400 },
    );
  }

  if (typeof formStartedAt === "number") {
    const durationMs = Date.now() - formStartedAt;
    if (durationMs < MIN_FORM_MS || durationMs > MAX_FORM_MS) {
      return NextResponse.json(
        { ok: false, error: "invalid_input" },
        { status: 400 },
      );
    }
  }

  const rateKey = hashedClientKey(req);
  const attempts = await incrementRateLimit(
    `public:updates:${rateKey}`,
    RATE_LIMIT_WINDOW,
  );
  if (attempts > RATE_LIMIT_MAX) {
    console.info("[E200] /api/public/updates ratelimit hit", {
      key: rateKey,
      attempts,
    });
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  const email = rawEmail.trim().toLowerCase();
  const emailKey = crypto.createHash("sha256").update(email).digest("hex").slice(0, 24);
  const emailAttempts = await incrementRateLimit(
    `public:updates:email:${emailKey}`,
    EMAIL_RATE_LIMIT_WINDOW,
  );
  if (emailAttempts > EMAIL_RATE_LIMIT_MAX) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }
  const locale = rawLocale?.trim() || "de";
  const now = new Date();
  const consentVersion = DEFAULT_CONSENT_VERSION;

  const confirmToken = generateConfirmToken();
  const confirmTokenHash = hashConfirmToken(confirmToken);
  const confirmTokenExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 Tage

  const col = (await coreCol("public_updates_subscribers")) as Collection<SubscriberDoc>;

  await col.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        createdAt: now,
      },
      $set: {
        name: name?.trim() || null,
        interests: interests?.trim() || null,
        locale,
        consentVersion,
        status: "pending" as SubscriberStatus,
        confirmTokenHash,
        confirmTokenExpiresAt,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  const origin = getPublicOrigin(req);
  const confirmUrl = `${origin}/api/public/updates/confirm?token=${encodeURIComponent(
    confirmToken,
  )}&email=${encodeURIComponent(email)}`;

  // 1) Mail an Absender: Double-Opt-in-Link
  const confirmMail = buildConfirmMail({
    email,
    name,
    confirmUrl,
    origin,
  });
  await sendMail({
    to: email,
    subject: confirmMail.subject,
    html: confirmMail.html,
    text: confirmMail.text,
  });

  // 2) Empfangsbestätigung an internes Updates-Postfach
  if (UPDATES_NOTIFY_TO) {
    const internalMail = buildInternalNotifyMail({
      email,
      name,
      interests,
    });
    await sendMail({
      to: UPDATES_NOTIFY_TO,
      subject: internalMail.subject,
      html: internalMail.html,
      text: internalMail.text,
    });
  }

  // Frontend erwartet nur { ok: true }, Code wird ignoriert
  return NextResponse.json({ ok: true, code: "pending_confirm" });
}
