// apps/web/src/app/api/ai/region-summary/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Produktionsverhalten:
 * - Wenn AI_REGION_SUMMARY_ENABLED !== "true" -> 404 (kein Dummy)
 * - Sonst: echter Provider-Call (hier OpenAI als Beispiel).
 *   Erfordert: OPENAI_API_KEY, OPENAI_MODEL (z.B. "gpt-4o-mini")
 */
export async function POST(req: NextRequest) {
  const enabled =
    (process.env.AI_REGION_SUMMARY_ENABLED || "").toLowerCase() === "true";
  if (!enabled) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const { region, filters } = await req.json().catch(() => ({}));
  if (!region)
    return NextResponse.json(
      { ok: false, error: "missing_region" },
      { status: 400 },
    );

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey)
    return NextResponse.json(
      { ok: false, error: "missing_openai_key" },
      { status: 500 },
    );

  try {
    // --- echter Provider-Call (OpenAI Responses API) ---
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Du schreibst prägnante, neutrale Regions-Zusammenfassungen basierend auf Metadaten und Kategorien.",
          },
          {
            role: "user",
            content: `Region: ${JSON.stringify(region)}\nFilter: ${JSON.stringify(filters || {})}\nAufgabe: Gib eine 3-5 Sätze Kurz-Zusammenfassung und 3 Stichpunkte (neutral, faktenorientiert).`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, provider_error: t || r.statusText },
        { status: 502 },
      );
    }

    const j = await r.json();
    const text = j.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ ok: true, summary: text });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "provider_failed" },
      { status: 500 },
    );
  }
}
