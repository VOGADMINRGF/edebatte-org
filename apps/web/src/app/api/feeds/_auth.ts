import { NextRequest } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function hasEditorToken(req: NextRequest): boolean {
  const envToken = (process.env.EDITOR_TOKEN ?? "").trim();
  if (!envToken) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const headerToken = req.headers.get("x-editor-token")?.trim() ?? "";
  const cookieToken = req.cookies.get("editor_token")?.value?.trim() ?? "";
  const presented = bearer || headerToken || cookieToken;
  if (!presented) return false;
  return safeEqual(presented, envToken);
}

export async function requireAdminOrEditor(req: NextRequest): Promise<Response | null> {
  const gate = await requireAdminOrResponse(req);
  if (!(gate instanceof Response)) return null;
  if (hasEditorToken(req)) return null;
  return gate;
}
