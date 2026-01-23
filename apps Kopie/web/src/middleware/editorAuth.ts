// apps/web/src/middleware/editorAuth.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Timing‑safe Vergleich für kurze Secrets (z.B. Tokens)
 * Für längere Daten/Signaturen besser HMAC mit crypto.subtle.digest nutzen.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Prüft Editor‑Auth über:
 *  - Authorization: Bearer <token>
 *  - ODER Cookie: editor_token=<token> (für Browser/Swagger/Tools)
 * Gibt bei fehlender/inkorrekter Auth eine Response zurück, sonst null.
 */
export function checkEditorAuth(req: NextRequest) {
  const envToken = (process.env.EDITOR_TOKEN ?? "").trim();

  if (!envToken) {
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: "Server misconfiguration: EDITOR_TOKEN missing",
        },
      },
      { status: 500 },
    );
  }

  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ")
    ? header.split(" ")[1]?.trim()
    : "";
  const cookieToken = req.cookies.get("editor_token")?.value?.trim();

  const presented = bearer || cookieToken || "";

  if (!presented || !safeEqual(presented, envToken)) {
    return NextResponse.json(
      { error: { code: 401, message: "Unauthorized" } },
      { status: 401 },
    );
  }

  return null;
}
