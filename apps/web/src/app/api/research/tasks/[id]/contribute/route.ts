import { NextResponse, type NextRequest } from "next/server";
import { createContribution, getTaskById } from "@core/research";
import { logger } from "@/utils/logger";
import { getCookie } from "@/lib/http/typedCookies";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function POST(req: NextRequest, context: any) {
  const params = (context as { params?: { id?: string } })?.params ?? {};
  const taskId = typeof params.id === "string" ? params.id : "";
  const userId = req.cookies.get("u_id")?.value ?? (await readCookie("u_id"));
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
