import { NextResponse, type NextRequest } from "next/server";
import { getTaskById } from "@core/research";
import { logger } from "@/utils/logger";
import { getCookie } from "@/lib/http/typedCookies";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function GET(req: NextRequest, context: any) {
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
  try {
    const task = taskId ? await getTaskById(taskId) : null;
    if (!task) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, task });
  } catch (err: any) {
    logger.error({ msg: "research.tasks.detail_failed", id: taskId, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
