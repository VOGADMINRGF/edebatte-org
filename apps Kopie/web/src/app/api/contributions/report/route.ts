// apps/web/src/app/api/contributions/report/route.ts
import { NextRequest } from "next/server";

function ok(status = 200) {
  return new Response(JSON.stringify({ ok: true }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function fail(reason: string, status = 500) {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Wir speichern hier (noch) nichts persistent – nur basic Validation.
    if (!body?.trace || typeof body?.originalText !== "string") {
      return fail("INVALID_PAYLOAD", 400);
    }
    // Hook-Punkt: hier später triMongo/Prisma einhängen (Archive in votes-DB).
    console.log("Editorial report:", {
      trace: body.trace,
      userNote: body.userNote ?? "",
      flags: Array.isArray(body.flags) ? body.flags : [],
      textLen: body.originalText?.length ?? 0,
    });
    return ok(200);
  } catch (e) {
    return fail("SERVER_ERROR", 500);
  }
}
