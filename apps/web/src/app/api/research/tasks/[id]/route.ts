import { NextResponse, type NextRequest } from "next/server";
import { getTaskById } from "@core/research";
import { logger } from "@/utils/logger";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = await getTaskById(params.id);
    if (!task) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, task });
  } catch (err: any) {
    logger.error({ msg: "research.tasks.detail_failed", id: params.id, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
