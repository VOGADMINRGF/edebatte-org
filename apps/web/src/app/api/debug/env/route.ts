import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const key = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "";
  const base = process.env.OPENAI_BASE_URL || "(default https://api.openai.com/v1)";

  const masked = key ? key.slice(0, 7) + "…" + key.slice(-4) : "(missing)";

  return new Response(
    JSON.stringify({
      ok: true,
      hasKey: Boolean(key),
      keyPreview: masked,
      model,
      base,
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
