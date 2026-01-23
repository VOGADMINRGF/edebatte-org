// apps/web/src/features/research/SerpResultItem.tsx
import React from "react";

export type SerpResult = {
  url?: string; // optional: may be empty for "source categories"
  title: string;
  snippet?: string;
  siteName?: string;
  breadcrumb?: string;
  faviconUrl?: string;
  publishedAt?: string;
};

function hostOf(url?: string): string {
  if (!url || url === "#") return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isRealUrl(url?: string): boolean {
  return Boolean(url && url !== "#");
}

export function SerpResultItem({
  result,
  view = "serp",
}: {
  result: SerpResult;
  view?: "serp" | "cards";
}) {
  const host = hostOf(result.url);
  const displaySite = result.siteName || host || "Prüfplan";
  const initial = (displaySite?.[0] || "?").toUpperCase();
  const visible = host ? `${host}${result.breadcrumb ? ` › ${result.breadcrumb}` : ""}` : result.breadcrumb || "";

  const containerClass =
    view === "cards" ? "rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-1" : "py-2";

  const metaClass = "flex items-center gap-2 text-[11px] text-slate-600";
  const titleClass = "block text-sm font-semibold text-sky-700 hover:underline";
  const snippetClass = "text-[12px] leading-relaxed text-slate-700";

  const Wrap = isRealUrl(result.url) ? "a" : "div";
  const wrapProps = isRealUrl(result.url)
    ? ({ href: result.url, target: "_blank", rel: "noreferrer noopener" } as any)
    : ({} as any);

  return (
    <div className={containerClass}>
      <div className={metaClass}>
        {result.faviconUrl && isRealUrl(result.url) ? (
          <img src={result.faviconUrl} alt={host || displaySite} className="h-4 w-4 rounded" />
        ) : (
          <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[9px] font-semibold text-slate-700">
            {initial}
          </div>
        )}
        <span className="font-semibold text-slate-700">{displaySite}</span>
        {visible ? <span className="text-slate-400">· {visible}</span> : null}
      </div>

      <Wrap {...wrapProps} className={titleClass}>
        {result.title}
      </Wrap>

      {result.snippet ? <p className={snippetClass + " line-clamp-3"}>{result.snippet}</p> : null}
      {result.publishedAt ? <p className="text-[10px] text-slate-500">Aktualisiert: {result.publishedAt}</p> : null}
    </div>
  );
}

export default SerpResultItem;
