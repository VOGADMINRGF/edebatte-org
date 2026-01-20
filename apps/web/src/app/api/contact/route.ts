import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateContactSpam } from "@/lib/spam/contactSpam";
import { verifyHumanChallenge } from "@/lib/spam/humanChallenge";
import { sendMail } from "@/utils/mailer";
import {
  getClientIp,
  rateLimitFromRequest,
  rateLimitHeaders,
  rateLimitOrThrow,
} from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FILL_MS = 6000;
const MAX_FILL_MS = 2 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 5000;
const TURNSTILE_ENABLED =
  !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL_RATE_LIMIT = { limit: 2, windowMs: 60 * 60 * 1000 }; // 2 pro Stunde pro E-Mail
const IP_RATE_LIMIT = { limit: 3, windowMs: 30 * 60 * 1000 }; // 3 pro 30 Min pro IP

const ContactSchema = z.object({
  category: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(120).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH + 500),
  newsletterOptIn: z.string().optional(),
  website: z.string().optional(),
  hp_contact: z.string().optional(),
  hp_company: z.string().optional(),
  hp_message_copy: z.string().optional(),
  hp_social: z.string().optional(),
  formStartedAt: z.string().optional(),
  turnstileToken: z.string().optional(),
  humanChallengeId: z.string().min(1).max(60),
  humanAnswer: z.string().min(1).max(200),
  humanShape: z.string().min(1).max(30),
});

type Classification = "ham" | "spam" | "suspicious";

function wantsJson(req: NextRequest) {
  const accept = req.headers.get("accept") || "";
  const contentType = req.headers.get("content-type") || "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function sanitizeText(value: unknown, maxLen: number, opts?: { preserveNewlines?: boolean }) {
  if (typeof value !== "string") return "";
  const stripped = stripHtml(value);
  const withoutControls = stripped.replace(/\p{C}/gu, "");
  const cleaned = opts?.preserveNewlines ? withoutControls.trim() : withoutControls.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, maxLen);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function hashValue(value: string, salt = "") {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

async function verifyTurnstile(token: string, ip: string) {
  if (!TURNSTILE_ENABLED) return { ok: true as const };
  if (!token) return { ok: false as const, code: "missing_token" as const };
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY || "",
        response: token,
        remoteip: ip,
      }),
    });
    const data = await res.json();
    if (!data.success) return { ok: false as const, code: "invalid_token" as const };
    return { ok: true as const };
  } catch {
    return { ok: false as const, code: "verification_failed" as const };
  }
}

function redirect(req: NextRequest, suffix: string, headers?: Record<string, string>) {
  const res = NextResponse.redirect(new URL(`/kontakt?${suffix}`, req.url), 303);
  if (headers) {
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  }
  return res;
}

function logRequest(data: {
  classification: Classification | "blocked";
  spamScore: number;
  reasons: string[];
  ipHash: string;
  durationMs: number | null;
  urlCount?: number;
  honeypot?: boolean;
  messagePreview?: string;
}) {
  try {
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        ...data,
      }),
    );
  } catch {
    /* ignore logging issues */
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = Object.fromEntries(form.entries());
  const ip = getClientIp(req);
  const ipHash = await hashValue(ip, process.env.CONTACT_LOG_SALT || "");
  const parsed = ContactSchema.safeParse(raw);

  if (!parsed.success) {
    logRequest({
      classification: "blocked",
      spamScore: 0,
      reasons: ["invalid_payload"],
      ipHash,
      durationMs: null,
    });
    if (wantsJson(req)) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    return redirect(req, "error=invalid");
  }

  const ipRate = await rateLimitFromRequest(req, IP_RATE_LIMIT.limit, IP_RATE_LIMIT.windowMs, {
    scope: "contact",
  });
  if (!ipRate.ok) {
    logRequest({
      classification: "blocked",
      spamScore: 0,
      reasons: ["rate_limit_ip"],
      ipHash,
      durationMs: null,
    });
    const headers = rateLimitHeaders(ipRate);
    if (wantsJson(req)) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryIn: ipRate.retryIn },
        { status: 429, headers },
      );
    }
    return new Response(
      `<p style="font-family: system-ui; margin: 24px;">Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut oder schreib uns direkt an <a href="mailto:kontakt@edebatte.org">kontakt@edebatte.org</a>.</p>`,
      { status: 429, headers: { "content-type": "text/html; charset=utf-8", ...headers } },
    );
  }

  const {
    category,
    name,
    email,
    phone,
    subject,
    message,
    newsletterOptIn,
    website,
    hp_contact,
    hp_company,
    hp_message_copy,
    hp_social,
    formStartedAt,
    turnstileToken,
    humanChallengeId,
    humanAnswer,
    humanShape,
  } = parsed.data;

  const cleanCategory = sanitizeText(category, 120) || "Kontakt";
  const cleanName = sanitizeText(name, 200);
  const cleanEmail = sanitizeText(email, 320).toLowerCase();
  const cleanPhone = sanitizeText(phone, 120);
  const cleanSubject = sanitizeText(subject, 200);
  const cleanMessage = sanitizeText(message, MAX_MESSAGE_LENGTH, { preserveNewlines: true });
  const wantsNewsletter = Boolean(newsletterOptIn);
  const honeypotValue = `${website ?? ""}${hp_contact ?? ""}${hp_company ?? ""}${hp_message_copy ?? ""}${hp_social ?? ""}`.trim();
  const cleanHumanChallengeId = sanitizeText(humanChallengeId, 60);
  const cleanHumanAnswer = sanitizeText(humanAnswer, 200);
  const cleanHumanShape = sanitizeText(humanShape, 30).toLowerCase();

  const now = Date.now();
  const startedAt = Number.parseInt(formStartedAt ?? "", 10);
  const durationMs = Number.isFinite(startedAt) ? now - startedAt : null;
  const userAgent = req.headers.get("user-agent") || "";

  let classification: Classification = "ham";
  let spamScore = 0;
  const reasons: string[] = [];
  let allowMail = true;

  if (honeypotValue) {
    classification = "spam";
    spamScore = 5;
    reasons.push("honeypot");
    allowMail = false;
  }

  if (durationMs !== null) {
    if (durationMs < MIN_FILL_MS) {
      classification = "spam";
      spamScore = Math.max(spamScore, 4);
      reasons.push("too_fast");
      allowMail = false;
    } else if (durationMs > MAX_FILL_MS) {
      classification = "spam";
      spamScore = Math.max(spamScore, 4);
      reasons.push("expired_form");
      allowMail = false;
    }
  } else {
    reasons.push("missing_timer");
  }

  if (classification !== "spam" && TURNSTILE_ENABLED) {
    const turnstile = await verifyTurnstile(turnstileToken || "", ip);
    if (!turnstile.ok) {
      classification = "spam";
      spamScore = Math.max(spamScore, 4);
      reasons.push(`turnstile:${turnstile.code}`);
      allowMail = false;

      logRequest({
        classification,
        spamScore,
        reasons,
        ipHash,
        durationMs,
        honeypot: Boolean(honeypotValue),
        urlCount: 0,
      });

      const payload = { ok: false, error: "turnstile", code: turnstile.code };
      if (wantsJson(req)) {
        return NextResponse.json(payload, { status: 400 });
      }
      return redirect(req, "error=captcha");
    }
  }

  const humanCheck = verifyHumanChallenge({
    id: cleanHumanChallengeId,
    answer: cleanHumanAnswer,
  });
  if (!humanCheck.ok) {
    classification = "spam";
    spamScore = Math.max(spamScore, 4);
    reasons.push(`human:${humanCheck.code}`);
    allowMail = false;

    logRequest({
      classification,
      spamScore,
      reasons,
      ipHash,
      durationMs,
      honeypot: Boolean(honeypotValue),
      urlCount: 0,
    });

    const payload = { ok: false, error: "challenge", code: humanCheck.code };
    if (wantsJson(req)) {
      return NextResponse.json(payload, { status: 400 });
    }
    return redirect(req, "error=challenge");
  }

  if (cleanHumanShape !== "kreis") {
    classification = "spam";
    spamScore = Math.max(spamScore, 4);
    reasons.push("shape:wrong");
    allowMail = false;

    logRequest({
      classification,
      spamScore,
      reasons,
      ipHash,
      durationMs,
      honeypot: Boolean(honeypotValue),
      urlCount: 0,
    });

    const payload = { ok: false, error: "shape" };
    if (wantsJson(req)) {
      return NextResponse.json(payload, { status: 400 });
    }
    return redirect(req, "error=shape");
  }

  const spamEvaluation = evaluateContactSpam({
    name: cleanName,
    subject: cleanSubject,
    message: cleanMessage,
    userAgent,
  });
  spamScore = Math.max(spamScore, spamEvaluation.spamScore);
  reasons.push(...spamEvaluation.reasons);

  if (classification !== "spam") {
    classification =
      spamScore >= 3
        ? "spam"
        : spamScore === 2
          ? "suspicious"
          : spamEvaluation.classification;
    if (classification !== "ham") allowMail = false;
  }

  const emailRate = await rateLimitOrThrow(
    `contact-email:${cleanEmail}`,
    EMAIL_RATE_LIMIT.limit,
    EMAIL_RATE_LIMIT.windowMs,
    { salt: process.env.CONTACT_LOG_SALT },
  );
  if (!emailRate.ok) {
    logRequest({
      classification: "blocked",
      spamScore,
      reasons: ["rate_limit_email", ...reasons],
      ipHash,
      durationMs,
    });
    const headers = rateLimitHeaders(emailRate);
    if (wantsJson(req)) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryIn: emailRate.retryIn },
        { status: 429, headers },
      );
    }
    return redirect(req, "error=ratelimit", headers);
  }

  const to = process.env.CONTACT_INBOX || "kontakt@edebatte.org";
  const safeSubject =
    cleanSubject && cleanSubject.trim().length > 0 ? cleanSubject.trim() : `Kontakt (${cleanCategory})`;
  const outboundSubject =
    classification === "suspicious" ? `[VERDACHT SPAM] ${safeSubject}` : safeSubject;

  if (allowMail) {
    const html = `
      <h3>Neue Kontaktanfrage</h3>
      <p><strong>Kategorie:</strong> ${escapeHtml(cleanCategory)}</p>
      <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(cleanEmail)}</p>
      ${cleanPhone ? `<p><strong>Telefon:</strong> ${escapeHtml(cleanPhone)}</p>` : ""}
      <p><strong>Newsletter Opt-In:</strong> ${wantsNewsletter ? "ja" : "nein"}</p>
      <p><strong>Spam-Score:</strong> ${spamScore} (${classification})</p>
      <p><strong>Nachricht:</strong><br/>${escapeHtml(cleanMessage).replace(/\n/g, "<br/>")}</p>
    `;

    await sendMail({
      to,
      subject: outboundSubject,
      html,
    });

    await sendMail({
      to: cleanEmail,
      subject: "Danke für deine Nachricht an eDebatte",
      html: `
        <p>Hi ${escapeHtml(cleanName)},</p>
        <p>danke für deine Nachricht – wir freuen uns über jedes Feedback und melden uns so schnell wie möglich.</p>
        <p><strong>Zusammenfassung:</strong></p>
        <ul>
          <li><strong>Thema:</strong> ${escapeHtml(cleanCategory)}</li>
          ${safeSubject ? `<li><strong>Betreff:</strong> ${escapeHtml(safeSubject)}</li>` : ""}
          <li><strong>Nachricht:</strong><br/>${escapeHtml(cleanMessage).replace(/\n/g, "<br/>")}</li>
        </ul>
        <p>Viele Grüße<br/>dein eDebatte Team</p>
      `,
    });
  }

  logRequest({
    classification,
    spamScore,
    reasons,
    ipHash,
    durationMs,
    urlCount: spamEvaluation.urlCount,
    honeypot: Boolean(honeypotValue),
    messagePreview:
      classification === "spam"
        ? cleanMessage.slice(0, 200)
        : cleanMessage.slice(0, 400),
  });

  const payload = { ok: true, classification, spamScore, reasons };
  if (wantsJson(req)) {
    return NextResponse.json(payload, { status: 200, headers: rateLimitHeaders(ipRate) });
  }
  return redirect(req, "sent=1", rateLimitHeaders(ipRate));
}
