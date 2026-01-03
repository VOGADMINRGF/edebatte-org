import { NextRequest, NextResponse } from "next/server";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { formatError } from "@core/errors/formatError";
import { factcheckJobsCol } from "@features/factcheck/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function roleFromRequest(req: NextRequest): Role {
  const cookieRole = req.cookies.get("u_role")?.value as Role | undefined;
  const headerRole = (req.headers.get("x-role") as Role) || undefined;
  let role: Role = cookieRole ?? headerRole ?? "guest";
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(req.url);
    const qRole = url.searchParams.get("role") as Role | null;
    if (qRole) role = qRole;
  }
  return role;
}

export async function GET(req: NextRequest) {
  const role = roleFromRequest(req);
  if (!hasPermission(role, PERMISSIONS.FACTCHECK_STATUS)) {
    const fe = formatError("FORBIDDEN", "Permission denied", { role });
    return NextResponse.json(fe, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);

  const col = await factcheckJobsCol();
  const jobs = await col
    .aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          jobId: 1,
          status: 1,
          verdict: 1,
          confidence: 1,
          createdAt: 1,
          finishedAt: { $ifNull: ["$finishedAt", null] },
          draftId: { $ifNull: ["$draftId", null] },
          contributionId: { $ifNull: ["$contributionId", null] },
          claimsCount: { $size: { $ifNull: ["$claims", []] } },
          serpCount: { $size: { $ifNull: ["$serpResults", []] } },
        },
      },
    ])
    .toArray();

  return NextResponse.json({ ok: true, jobs });
}
