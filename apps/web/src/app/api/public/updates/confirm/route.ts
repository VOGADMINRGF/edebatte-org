// apps/web/src/app/api/public/updates/confirm/route.ts
// Bestätigt Double-Opt-in und verschickt Willkommensmail.

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "mongodb";
import { coreCol } from "@core/db/triMongo";
import { sendMail } from "@/utils/mailer";
import { publicOrigin } from "@/utils/publicOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const UPDATES_NOTIFY_TO = process.env.UPDATES_NOTIFY_TO;

function hashConfirmToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getPublicOrigin() {
  return publicOrigin().replace(/\/$/, "");
}

function getMembershipUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/mitglied-werden`;
}

function buildWelcomeMail(opts: {
  email: string;
  name?: string | null;
  origin: string;
}) {
  const { email, name, origin } = opts;
  const greeting = name ? `Hallo ${name}` : "Hallo";
  const membershipUrl = getMembershipUrl(origin);

  const html = `
    <p>${greeting},</p>
    <p>deine Anmeldung für die eDebatte-Updates wurde erfolgreich bestätigt.</p>
    <p>Ab jetzt informieren wir dich regelmäßig über neue Abstimmungen, Funktionen und Beteiligungsmöglichkeiten.</p>
    <p>Wenn du unsere Arbeit noch stärker unterstützen möchtest, kannst du jederzeit
      <a href="${membershipUrl}">Mitglied werden</a> – oder uns auch anonym unterstützen.</p>
    <p>– Dein Team von eDebatte</p>
  `;

  const text = `${greeting},

deine Anmeldung für die eDebatte-Updates wurde bestätigt.

Ab jetzt informieren wir dich regelmäßig über neue Abstimmungen, Funktionen und Beteiligungsmöglichkeiten.

Wenn du unsere Arbeit noch stärker unterstützen möchtest, kannst du jederzeit Mitglied werden oder uns anonym unterstützen:
${membershipUrl}

– Dein Team von eDebatte`;

  return {
    subject: "Du erhältst jetzt eDebatte-Updates",
    html,
    text,
  };
}

function buildInternalConfirmedMail(opts: { email: string; name?: string | null }) {
  const { email, name } = opts;
  const subject =
    "eDebatte-Updates: Anmeldung bestätigt (Double-Opt-in abgeschlossen)";
  const html = `
    <p>Eine Anmeldung für den Updates-Verteiler wurde soeben bestätigt.</p>
    <ul>
      <li><strong>E-Mail:</strong> ${email}</li>
      <li><strong>Name:</strong> ${name || "—"}</li>
    </ul>
  `;
  const text = `eDebatte-Updates: Double-Opt-in bestätigt.

E-Mail: ${email}
Name: ${name || "—"}
`;

  return { subject, html, text };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();

  if (!token || !email) {
    return NextResponse.json(
      { ok: false, error: "missing_params" },
      { status: 400 },
    );
  }

  const col = (await coreCol("public_updates_subscribers")) as Collection<SubscriberDoc>;
  const tokenHash = hashConfirmToken(token);
  const now = new Date();

  const doc = await col.findOne({
    email,
    confirmTokenHash: tokenHash,
    confirmTokenExpiresAt: { $gte: now },
  });

  if (!doc) {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired" },
      { status: 400 },
    );
  }

  await col.updateOne(
    { _id: doc._id },
    {
      $set: {
        status: "active" as SubscriberStatus,
        confirmedAt: now,
        updatedAt: now,
      },
      $unset: {
        confirmTokenHash: "",
        confirmTokenExpiresAt: "",
      },
    },
  );

  const origin = getPublicOrigin();

  // Willkommensmail an Abonnent:in
  const welcomeMail = buildWelcomeMail({
    email,
    name: doc.name,
    origin,
  });
  await sendMail({
    to: email,
    subject: welcomeMail.subject,
    html: welcomeMail.html,
    text: welcomeMail.text,
  });

  // Info-Mail an updates@
  if (UPDATES_NOTIFY_TO) {
    const internalMail = buildInternalConfirmedMail({
      email,
      name: doc.name,
    });
    await sendMail({
      to: UPDATES_NOTIFY_TO,
      subject: internalMail.subject,
      html: internalMail.html,
      text: internalMail.text,
    });
  }

  // Zurück auf die Startseite (optional mit Marker-Query)
  const redirectUrl = `${origin}/?updates=confirmed`;
  return NextResponse.redirect(redirectUrl);
}
