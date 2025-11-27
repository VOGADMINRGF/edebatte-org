import { NextResponse, type NextRequest } from "next/server";
import { updateContributionStatus } from "@core/research";
import { logger } from "@/utils/logger";
import { isStaffRequest } from "@/app/api/admin/feeds/utils";
import { awardResearchXp } from "@features/account/service";

export async function POST(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { contributionId, status, reviewNote } = body ?? {};

  if (!contributionId || !status) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const updated = await updateContributionStatus({
      contributionId,
      status,
      reviewNote,
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    if (updated.status === "accepted") {
      await awardResearchXp(updated.authorId, updated.taskId).catch((err) => {
        logger.warn({
          msg: "admin.research.xp.award_failed",
          contributionId,
          taskId: updated.taskId,
          err: err?.message,
        });
      });
    }

    logger.info({ msg: "admin.research.contribution.status_updated", contributionId, status });
    return NextResponse.json({ ok: true, contribution: updated });
  } catch (err: any) {
    logger.error({ msg: "admin.research.contribution.status_failed", contributionId, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
