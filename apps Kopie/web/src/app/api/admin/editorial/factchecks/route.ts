import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  listEditorialFeedback,
  updateEditorialFeedbackReview,
} from "@/lib/db/editorialFeedbackRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];
const ALLOWED_STATUSES = new Set<ReviewStatus>(REVIEW_STATUSES);
const MANUAL_TYPES = ["manual_factcheck_submit", "manual_factcheck_update"] as const;

function isReviewStatus(value: string): value is ReviewStatus {
  return REVIEW_STATUSES.includes(value as ReviewStatus);
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

  const reviewStatus: ReviewStatus[] | undefined =
    status === "all" ? undefined : [isReviewStatus(status) ? status : "pending"];

  const items = await listEditorialFeedback({
    actionTypes: Array.from(MANUAL_TYPES),
    reviewStatus,
    limit,
  });

  const data = items.map((item) => ({
    id: item.id,
    ts: item.ts,
    createdAt: item.createdAtDate,
    context: item.context,
    reviewStatus: item.reviewStatus ?? "pending",
    reviewedAt: item.reviewedAt ?? null,
    reviewedBy: item.reviewedBy ?? null,
    reviewNote: item.reviewNote ?? null,
    action: item.action,
  }));

  return NextResponse.json({ ok: true, items: data }, { headers: JSON_HEADERS });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const reviewStatus = typeof body?.reviewStatus === "string" ? body.reviewStatus.trim() : "";
  const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim().slice(0, 600) : null;

  if (!id || !isReviewStatus(reviewStatus)) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const user = gate as any;
  const reviewedBy = user?.email ? String(user.email) : user?._id ? String(user._id) : "admin";

  const ok = await updateEditorialFeedbackReview({
    id,
    reviewStatus,
    reviewedBy,
    reviewNote,
  });

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: JSON_HEADERS });
}
