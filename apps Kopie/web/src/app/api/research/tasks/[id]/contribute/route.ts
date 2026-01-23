import { NextResponse, type NextRequest } from "next/server";
import { createContribution, getTaskById } from "@core/research";
import { logger } from "@/utils/logger";
import { getCookie } from "@/lib/http/typedCookies";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function POST(req: NextRequest, context: any) {
  const params = (context as { params?: { id?: string } })?.params ?? {};
  const taskId = typeof params.id === "string" ? params.id : "";
  const userId = req.cookies.get("u_id")?.value ?? (await readCookie("u_id"));
  const verified = req.cookies.get("u_verified")?.value ?? (await readCookie("u_verified")) ?? "0";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (verified !== "1") {
    return NextResponse.json({ ok: false, error: "verification_required" }, { status: 403 });
  }

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = await rateLimitOrThrow(`research:contrib:${userId}:${ip}`, 10, 60 * 60 * 1000, {
    salt: "research-contrib",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { summary, details, sources } = body ?? {};

  if (!summary) {
    return NextResponse.json({ ok: false, error: "missing_summary" }, { status: 400 });
  }

  try {
    const task = taskId ? await getTaskById(taskId) : null;
    if (!task || task.status === "archived") {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const contribution = await createContribution({
      taskId,
      authorId: userId,
      summary,
      details,
      sources,
    });

    if (!contribution) {
      return NextResponse.json({ ok: false, error: "unable_to_save" }, { status: 500 });
    }

    logger.info({ msg: "research.contribution.submitted", taskId, authorId: userId });
    return NextResponse.json({ ok: true, contribution });
  } catch (err: any) {
    logger.error({ msg: "research.contribution.failed", taskId, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
