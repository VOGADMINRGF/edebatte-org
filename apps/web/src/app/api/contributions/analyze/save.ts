// apps/web/src/app/api/contributions/analyze/save.ts
import { NextRequest } from "next/server";
import { coreCol } from "@core/triMongo";
import { formatError } from "@/core/utils/errors";

export const runtime = "nodejs"; // wichtig für Mongo
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.text || !Array.isArray(body?.statements) || body.statements.length === 0) {
      throw new Error("INVALID_PAYLOAD");
    }

    const contributions = await coreCol<any>("contributions");
    const { insertedId } = await contributions.insertOne({
      ...body,
      status: "confirmed",
      createdAt: new Date()
    });

    return new Response(JSON.stringify({ success: true, id: String(insertedId) }), { status: 200 });
  } catch (error: any) {
    const formattedError = formatError({
      message: "Speichern fehlgeschlagen",
      code: "SAVE_ERROR",
      cause: error?.message || error
    });

    // Fehler wegloggen – ohne Model, direkt in eine Collection:
    try {
      const errors = await coreCol<any>("error_logs");
      await errors.insertOne({
        message: typeof formattedError === "string"
          ? formattedError
          : (formattedError as any)?.message ?? "[error]",
        level: "error",
        meta: typeof formattedError === "object" ? formattedError : { formattedError },
        path: "/api/contributions/analyze/save",
        payload: await safeCloneBody(req),
        ts: new Date()
      });
    } catch {}

    return new Response(JSON.stringify(formattedError), { status: 500 });
  }
}

/** Request-Body sicher klonen (stream kann „locked“ sein) */
async function safeCloneBody(req: NextRequest) {
  try { return await req.json(); } catch { return null; }
}
