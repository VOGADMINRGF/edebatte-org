// E200: Public updates endpoint guarded by HumanCheck tokens.
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { incrementRateLimit } from "@/lib/security/rate-limit";
import { verifyHumanToken } from "@/lib/security/human-token";

// E200: Public updates endpoint guarded by HumanCheck tokens + rate limit (10 req / 15 min per pseudo-IP).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes
const DEFAULT_CONSENT_VERSION = process.env.UPDATES_CONSENT_VERSION || "updates_v1";

type SubscriberDoc = {
  email: string;
  name?: string | null;
  interests?: string | null;
  locale?: string | null;
  consentVersion?: string | null;
  status?: "pending" | "active";
  createdAt: Date;
  updatedAt: Date;
};

const bodySchema = z.object({
  email: z.string().email(),
  interests: z.string().trim().max(500).optional(),
  name: z.string().trim().max(200).optional(),
  humanToken: z.string(),
  locale: z.string().trim().max(10).optional(),
  consentVersion: z.string().trim().max(32).optional(),
});

function hashedClientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const agent = req.headers.get("user-agent")?.slice(0, 80) || "ua";
  return crypto.createHash("sha256").update(`updates:${ip}:${agent}`).digest("hex");
}

function normalizeLocale(raw?: string | null, req?: NextRequest) {
  const candidate =
    (typeof raw === "string" && raw.trim()) ||
    req?.headers.get("x-locale") ||
    req?.headers.get("accept-language")?.split(",")[0] ||
    "de";
  return candidate.slice(0, 10);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.path.join("."));
    const code = issues.includes("email")
      ? "invalid_email"
      : issues.includes("interests")
        ? "invalid_interests"
        : issues.includes("humanToken")
          ? "missing_token"
          : "bad_request";
    return NextResponse.json({ ok: false, code }, { status: 400 });
  }

  const rateKey = hashedClientKey(request);
  const attempts = await incrementRateLimit(`public:updates:${rateKey}`, RATE_LIMIT_WINDOW);
  if (attempts > RATE_LIMIT_MAX) {
    console.info("[E200] /api/public/updates ratelimit hit", { key: rateKey, attempts });
    return NextResponse.json({ ok: false, code: "ratelimited" }, { status: 429 });
  }

  const verified = await verifyHumanToken(parsed.data.humanToken);
  if (!verified) {
    return NextResponse.json({ ok: false, code: "invalid_token" }, { status: 403 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const now = new Date();
  const locale = normalizeLocale(parsed.data.locale, request);
  const consentVersion = parsed.data.consentVersion || DEFAULT_CONSENT_VERSION;

  const updatesCol = await coreCol<SubscriberDoc>("public_updates_subscribers");
  await updatesCol.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        createdAt: now,
        status: "active",
      },
      $set: {
        name: parsed.data.name?.trim() || null,
        interests: parsed.data.interests?.trim() || null,
        locale,
        consentVersion,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true, code: "saved" });
}
