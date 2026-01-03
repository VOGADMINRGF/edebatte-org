export type SerpResultLite = {
  url?: string; // optional: may be empty
  title: string;
  snippet?: string;
  siteName?: string;
  breadcrumb?: string;
  faviconUrl?: string;
  publishedAt?: string;
};

type AriSearchResult = { ok: true; snippets: string[] } | { ok: false; error: string };

type AriSerpResult = { ok: true; results: SerpResultLite[] } | { ok: false; error: string };

function getAriConfig() {
  if (process.env.ARI_DISABLED === "1") return { ok: false as const, error: "ARI disabled" };
  const base =
    process.env.ARI_BASE_URL ||
    process.env.ARI_URL ||
    process.env.ARI_API_URL ||
    process.env.YOUCOM_ARI_API_URL;
  const key = process.env.ARI_API_KEY || process.env.YOUCOM_ARI_API_KEY;
  if (!base || !key) return { ok: false as const, error: "ARI not configured" };
  return { ok: true as const, base: base.replace(/\/+$/, ""), key };
}

export async function callAriSearch(query: string): Promise<AriSearchResult> {
  const cfg = getAriConfig();
  if (!cfg.ok) return { ok: false, error: cfg.error };

  try {
    const res = await fetch(`${cfg.base}/v1/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({ q: query, topK: 5 }),
    });
    if (!res.ok) return { ok: false, error: `ARI ${res.status}` };
    const json = await res.json().catch(() => ({}));
    const snippets =
      Array.isArray(json?.items) && json.items.length
        ? (json.items as any[])
            .map((it) => it?.snippet || it?.summary || it?.text || it?.content)
            .filter((t): t is string => typeof t === "string")
            .slice(0, 5)
        : [];
    return { ok: true, snippets };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "ARI search failed" };
  }
}

/**
 * callAriSearchSerp():
 * Für UI/Factcheck brauchbar: strukturierte SERP-Items (URL, Title, Snippet).
 * Der Endpoint bleibt derselbe (/v1/search), wir mappen nur anders.
 */
export async function callAriSearchSerp(query: string): Promise<AriSerpResult> {
  const cfg = getAriConfig();
  if (!cfg.ok) return { ok: false, error: cfg.error };

  try {
    const res = await fetch(`${cfg.base}/v1/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({ q: query, topK: 6 }),
    });
    if (!res.ok) return { ok: false, error: `ARI ${res.status}` };
    const json = await res.json().catch(() => ({}));

    const results: SerpResultLite[] =
      Array.isArray(json?.items) && json.items.length
        ? (json.items as any[])
            .map((it) => {
              const url = typeof it?.url === "string" ? it.url : undefined;
              const title =
                (typeof it?.title === "string" && it.title) ||
                (typeof it?.name === "string" && it.name) ||
                "Quelle";
              const snippet =
                (typeof it?.snippet === "string" && it.snippet) ||
                (typeof it?.summary === "string" && it.summary) ||
                undefined;

              let siteName: string | undefined = undefined;
              try {
                if (url) siteName = new URL(url).hostname;
              } catch {
                /* ignore */
              }

              return {
                url,
                title,
                snippet,
                siteName,
                publishedAt: typeof it?.publishedAt === "string" ? it.publishedAt : undefined,
              } satisfies SerpResultLite;
            })
            .filter(Boolean)
            .slice(0, 6)
        : [];

    return { ok: true, results };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "ARI search failed" };
  }
}
