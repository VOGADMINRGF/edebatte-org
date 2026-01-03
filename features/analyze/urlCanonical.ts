const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "cmpid",
  "cid",
  "igshid",
]);

function safeLower(s: string): string {
  return (s || "").toLowerCase();
}

export function canonicalizeUrl(url: string): { canonicalUrl: string; key: string; host: string } {
  try {
    const u = new URL(url);
    const host = safeLower(u.hostname.replace(/^www\./, ""));

    const params = new URLSearchParams(u.search);
    for (const k of Array.from(params.keys())) {
      if (STRIP_PARAMS.has(k) || k.startsWith("utm_")) params.delete(k);
    }

    let path = u.pathname || "/";
    path = path.replace(/\/+$/, "");
    if (!path) path = "/";

    const search = params.toString();
    const canonicalUrl = `${u.protocol}//${host}${path}${search ? `?${search}` : ""}`;
    const key = `${host}${path}${search ? `?${search}` : ""}`;
    return { canonicalUrl, key, host };
  } catch {
    const clean = (url || "").trim();
    return { canonicalUrl: clean, key: clean, host: "" };
  }
}
