export type AriSource = { id?: string; title?: string; url: string; snippet?: string };

export async function queryAri(
  { query, sources = [], format = "json", topK = 5 }:
  { query: string; sources?: string[]; format?: "json" | "text"; topK?: number; }
): Promise<{ ok: true; items: AriSource[] } | { ok: false; error: string }> {
  const endpoint = process.env.ARI_ENDPOINT;
  const key = process.env.ARI_API_KEY;
  if (!endpoint || !key) return { ok: false, error: "ARI not configured" };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ q: query, sources, topK, format }),
  });
  if (!res.ok) return { ok: false, error: `ARI ${res.status}` };

  const data = (await res.json().catch(() => null)) as any;     // ⬅️ TS beruhigen
  const items = Array.isArray(data?.items) ? (data.items as AriSource[]) : [];
  return { ok: true, items };
}
