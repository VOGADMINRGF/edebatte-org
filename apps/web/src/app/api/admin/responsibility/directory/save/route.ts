import { NextResponse, type NextRequest } from "next/server";
import { saveActor } from "@core/responsibility";
import { isStaffRequest } from "../../feeds/utils";
import { logger } from "@/utils/logger";

export async function POST(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, actorKey, name, level, role, regionId, description, isActive, meta } = body ?? {};

  if (!actorKey || !name) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  try {
    const saved = await saveActor({
      id,
      actorKey,
      name,
      level,
      role,
      regionId,
      description,
      isActive,
      meta,
    });

    logger.info({ msg: "responsibility.actor.saved", actorKey: saved.actorKey, id: saved.id });
    return NextResponse.json({ ok: true, actor: saved });
  } catch (err: any) {
    logger.error({ msg: "responsibility.save.failed", actorKey, id, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
