import { NextRequest, NextResponse } from "next/server";
import { safeRandomId } from "@core/utils/random";

function generateProjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return safeRandomId();
}

export async function POST(req: NextRequest) {
  let body: Record<string, any> | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Feld 'name' ist erforderlich." },
      { status: 400 },
    );
  }

  const project = {
    ...body,
    name,
    id: typeof body?.id === "string" && body.id.trim().length > 0 ? body.id : generateProjectId(),
  };

  return NextResponse.json({
    ok: true,
    data: {
      project,
    },
  });
}

