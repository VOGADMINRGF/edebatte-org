import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: hier an DB hängen (Prisma/Mongo)
  const body = await req.json().catch(() => ({}));
  const text: string = String(body?.text || "");
  console.log("[draft/save]", { len: text.length });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
