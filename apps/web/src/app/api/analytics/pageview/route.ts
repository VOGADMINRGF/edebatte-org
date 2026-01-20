import crypto from "crypto";
import type { Collection } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import {
  CONSENT_COOKIE_NAME,
  LEGACY_CONSENT_COOKIE_NAME,
  parseConsentCookie,
} from "@/lib/privacy/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  path: z.string().min(1).max(200),
  visitorId: z.string().min(6).max(128),
});

function normalizePath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("://")) return null;
  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  normalized = normalized.split("?")[0]?.split("#")[0] ?? normalized;
  if (normalized.length > 200) normalized = normalized.slice(0, 200);
  return normalized || null;
}

function readConsent(req: NextRequest) {
  const raw =
    req.cookies.get(CONSENT_COOKIE_NAME)?.value ??
    req.cookies.get(LEGACY_CONSENT_COOKIE_NAME)?.value;
  return parseConsentCookie(raw);
}

type AnalyticsVisitDoc = {
  _id: string;
  date: string;
  path: string;
  visitorHash: string;
  createdAt: Date;
};

type AnalyticsPageviewDoc = {
  _id: string;
  date: string;
  path: string;
  createdAt: Date;
  updatedAt?: Date;
  views?: number;
  uniqueVisitors?: number;
};

export async function POST(req: NextRequest) {
  const consent = readConsent(req);
  if (!consent?.analytics) {
    return new Response(null, { status: 204 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const path = normalizePath(parsed.data.path);
  if (!path) {
    return NextResponse.json({ ok: false, error: "invalid_path" }, { status: 400 });
  }

  const visitorId = parsed.data.visitorId.trim();
  const salt = process.env.PUBLIC_ID_SALT || "edb-analytics";
  const visitorHash = crypto.createHash("sha256").update(`${visitorId}:${salt}`).digest("hex");
  const dateKey = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const visitsCol = (await coreCol("analytics_visits")) as Collection<AnalyticsVisitDoc>;
  const pageviewsCol = (await coreCol("analytics_pageviews")) as Collection<AnalyticsPageviewDoc>;

  const uniqueId = `${dateKey}:${visitorHash.slice(0, 16)}:${path}`;
  const uniqueRes = await visitsCol.updateOne(
    { _id: uniqueId },
    {
      $setOnInsert: {
        _id: uniqueId,
        date: dateKey,
        path,
        visitorHash: visitorHash.slice(0, 32),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const isUnique = Boolean(uniqueRes.upsertedCount);

  await pageviewsCol.updateOne(
    { _id: `${dateKey}:${path}` },
    {
      $setOnInsert: {
        _id: `${dateKey}:${path}`,
        date: dateKey,
        path,
        createdAt: now,
      },
      $inc: {
        views: 1,
        uniqueVisitors: isUnique ? 1 : 0,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
