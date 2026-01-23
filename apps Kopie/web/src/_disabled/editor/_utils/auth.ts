// apps/web/src/app/api/editor/_utils/auth.ts
import { NextResponse } from "next/server";

export function requireEditorAuth(req: Request): NextResponse | null {
  const hdr =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token =
    (hdr?.startsWith("Bearer ") ? hdr.slice(7) : null) ||
    req.headers.get("x-editor-token") ||
    undefined;

  if (!process.env.EDITOR_TOKEN) {
    return NextResponse.json(
      { error: "EDITOR_TOKEN_NOT_CONFIGURED" },
      { status: 500 },
    );
  }
  if (!token || token !== process.env.EDITOR_TOKEN) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}
