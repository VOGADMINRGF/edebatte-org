// apps/web/src/utils/aiPing.ts
type Row = { name: string; ok: boolean; error?: string; skipped?: boolean };

// kleine Helfer, um aussagekräftige Fehlertexte zu bekommen
async function toErr(r: Response) {
  try {
    const j = await r.json();
    const msg = j?.error?.message ?? j?.message ?? JSON.stringify(j);
    return `HTTP ${r.status}${msg ? ` – ${msg}` : ""}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}

export async function pingOpenAI(): Promise<Row> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { name: "ai:openai", ok: true, skipped: true };
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    return {
      name: "ai:openai",
      ok: r.ok,
      error: r.ok ? undefined : await toErr(r),
    };
  } catch (e: any) {
    return {
      name: "ai:openai",
      ok: false,
      error: e?.message ?? "fetch failed",
    };
  }
}

export async function pingAnthropic(): Promise<Row> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name: "ai:anthropic", ok: true, skipped: true };
  try {
    const r = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    return {
      name: "ai:anthropic",
      ok: r.ok,
      error: r.ok ? undefined : await toErr(r),
    };
  } catch (e: any) {
    return {
      name: "ai:anthropic",
      ok: false,
      error: e?.message ?? "fetch failed",
    };
  }
}

export async function pingMistral(): Promise<Row> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return { name: "ai:mistral", ok: true, skipped: true };
  try {
    const r = await fetch("https://api.mistral.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    return {
      name: "ai:mistral",
      ok: r.ok,
      error: r.ok ? undefined : await toErr(r),
    };
  } catch (e: any) {
    return {
      name: "ai:mistral",
      ok: false,
      error: e?.message ?? "fetch failed",
    };
  }
}

/**
 * YOU.com – ARI SEARCH (günstiger Ping)
 * ENV:
 *  - YOUCOM_ARI_API_KEY  (required)
 *  - YOUCOM_SEARCH_URL   (optional, default https://api.ydc-index.io)
 *
 * Wir rufen eine Mini-Suche auf (count=1). Header ist **X-API-Key**.
 */
export async function pingAriSearch(): Promise<Row> {
  const key = process.env.YOUCOM_ARI_API_KEY;
  const base = process.env.YOUCOM_SEARCH_URL || "https://api.ydc-index.io";
  if (!key)
    return {
      name: "ai:ari:search",
      ok: false,
      error: "YOUCOM_ARI_API_KEY missing",
    };

  const url = `${base.replace(/\/+$/, "")}/v1/search?query=ping&count=1`;
  try {
    const r = await fetch(url, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      cache: "no-store",
    });
    return {
      name: "ai:ari:search",
      ok: r.ok,
      error: r.ok ? undefined : await toErr(r),
    };
  } catch (e: any) {
    return {
      name: "ai:ari:search",
      ok: false,
      error: e?.message ?? "fetch failed",
    };
  }
}
