// features/stream/components/StreamList.tsx — v3 (superset aus v1+v2)
// "E150/E200"-fähig: paginiert, Infinite-Scroll, Toolbar (Suche/Sort/Tag/Kind),
// v1-Domain-Filter (all/live/district/nation/global/G7/EU), Admin-Planen-Button,
// starke Typen, shadcn/ui, framer-motion, lucide-react.

"use client";

import * as React from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ThumbsUp,
  Eye,
  Tag as TagIcon,
  Globe,
  CircleDot,
  MapPin,
  Landmark,
  Flag,
} from "lucide-react";

/* ---------------------------------- Types --------------------------------- */

export type StreamStats = {
  likes?: number;
  comments?: number;
  views?: number;
};

export type StreamAuthor = {
  id?: string;
  name?: string;
  avatarUrl?: string;
};

export type StreamItem = {
  id: string;
  // v2 Felder
  kind?: "statement" | "content" | "event" | "update" | "live" | string;
  title: string;
  summary?: string;
  contentHtml?: string; // nie direkt rendern
  author?: StreamAuthor;
  createdAt: string | Date;
  tags?: string[];
  stats?: StreamStats;
  imageUrl?: string;
  href?: string;
  data?: any;

  // v1-Kompat: optionale Felder, falls Backend diese liefert
  status?: "Live" | "Geplant" | "Replay" | "Vergangen" | string;
  topic?: string;
  region?: string;
  district?: string;
  country?: string;   // ISO (z. B. "DE")
  category?: string;  // z. B. "EU" | "G7" | "Global"
};

export type PageResponse = {
  items: StreamItem[];
  nextCursor?: string | null;
  hasMore?: boolean;
  total?: number;
};

type SortKey = "newest" | "oldest" | "most_commented" | "most_liked" | "most_viewed";

type DomainFilter =
  | "all"
  | "live"
  | "district"
  | "nation"
  | "global"
  | "g7"
  | "eu";

/** v2-Props */
export type V2Props = {
  endpoint?: string;
  queryParams?: Record<string, string | number | boolean | undefined>;
  pageSize?: number;
  initialItems?: StreamItem[];
  renderItem?: (item: StreamItem) => React.ReactNode;
  onItemClick?: (item: StreamItem) => void;
  className?: string;
  showToolbar?: boolean;
  disableInfiniteScroll?: boolean;
  defaultFilterTag?: string;
  defaultFilterKind?: string;
};

/** v1-Props (Kompatibilität) */
export type V1Props = {
  user?: { country?: string; region?: string; district?: string };
  admin?: boolean;
  presseView?: boolean;
  politikView?: boolean;
  ngoView?: boolean;
  readOnly?: boolean;
  accentColor?: string; // aktivierter Pill-Hintergrund
  showIcons?: boolean;
  language?: "de" | "en";
};

export type StreamListV3Props = V2Props & V1Props;

/* ------------------------------ Helper config ----------------------------- */

const DEFAULT_ENDPOINT = "/api/streams";
const DEFAULT_ACCENT = "#3B82F6"; // Fallback (Brand/Indigo-ähnlich)
const GLOBAL_CATEGORIES = new Set(["EU", "G7", "G-Gipfel", "Sonstiges", "Global"]);

const COUNTRY_LABEL_DE: Record<string, string> = {
  DE: "Deutschland",
  FR: "Frankreich",
  IT: "Italien",
  UA: "Ukraine",
  IN: "Indien",
  CN: "China",
  US: "USA",
  RU: "Russland",
  PL: "Polen",
  ES: "Spanien",
  SE: "Schweden",
  NO: "Norwegen",
  DK: "Dänemark",
  GB: "Großbritannien",
  TR: "Türkei",
};
const COUNTRY_LABEL_EN: Record<string, string> = {
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  UA: "Ukraine",
  IN: "India",
  CN: "China",
  US: "USA",
  RU: "Russia",
  PL: "Poland",
  ES: "Spain",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  GB: "United Kingdom",
  TR: "Turkey",
};

/* --------------------------------- Utils ---------------------------------- */

const cn = (...args: Array<string | undefined | null | false>) => args.filter(Boolean).join(" ");

function dedupById(arr: StreamItem[]): StreamItem[] {
  const seen = new Set<string>();
  const out: StreamItem[] = [];
  for (const it of arr) {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

function nfmt(n?: number) {
  if (typeof n !== "number") return "0";
  return new Intl.NumberFormat(undefined, { notation: "compact", compactDisplay: "short" }).format(n);
}

function fmtDate(d: string | Date) {
  try {
    const dt = new Date(d);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return String(d);
  }
}

function getNationalFlag(code?: string) {
  const c = (code || "DE").toUpperCase().slice(0, 2);
  const A = 0x1f1e6;
  const z = (ch: string) => String.fromCodePoint(A + (ch.charCodeAt(0) - 65));
  if (c.length !== 2 || c[0] < "A" || c[0] > "Z" || c[1] < "A" || c[1] > "Z") return "🏳️";
  return z(c[0]) + z(c[1]);
}

function countryLabel(code?: string, lang: "de" | "en" = "de") {
  const m = lang === "en" ? COUNTRY_LABEL_EN : COUNTRY_LABEL_DE;
  return m[(code || "DE").toUpperCase()] || (lang === "en" ? "National" : "National");
}

/* ------------------------------- Component -------------------------------- */

export default function StreamListV3({
  /* v2 */
  endpoint = DEFAULT_ENDPOINT,
  queryParams,
  pageSize = 20,
  initialItems = [],
  renderItem,
  onItemClick,
  className,
  showToolbar = true,
  disableInfiniteScroll = false,
  defaultFilterTag,
  defaultFilterKind,

  /* v1 */
  user,
  admin,
  presseView,
  politikView,
  ngoView,
  readOnly,
  accentColor = DEFAULT_ACCENT,
  showIcons = true,
  language = "de",
}: StreamListV3Props) {
  // --- derived user context ---
  const userCountry = (user?.country || "DE").toUpperCase();
  const userRegion = user?.region;
  const flagEmoji = getNationalFlag(userCountry);
  const nationLabel = countryLabel(userCountry, language);

  // --- state ---
  const [items, setItems] = useState<StreamItem[]>(() => dedupById(initialItems));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [activeTag, setActiveTag] = useState<string | undefined>(defaultFilterTag || undefined);
  const [activeKind, setActiveKind] = useState<string | undefined>(defaultFilterKind || undefined);
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // --- compute tags cloud ---
  const allTags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => (i.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // --- helper: does item match v1 domain filter? ---
  const matchDomainFilter = useCallback(
    (it: StreamItem): boolean => {
      switch (domainFilter) {
        case "all":
          return true;
        case "live": {
          const status = (it.status || it.kind || "").toString().toLowerCase();
          return status.includes("live");
        }
        case "district": {
          if (!userRegion) return false;
          const reg = (it.region || "").toLowerCase();
          const dist = (it.district || "").toLowerCase();
          return reg === userRegion.toLowerCase() || dist === (user?.district || "").toLowerCase();
        }
        case "nation": {
          const c = (it.country || (it.tags?.find(t => t.length === 2) ?? "")).toUpperCase();
          return c === userCountry;
        }
        case "global": {
          // Fallback: tags enthalten "global" oder Kategorienmenge
          const hasTag = (it.tags || []).some((t) => t.toLowerCase() === "global" || t.toUpperCase() === "EU" || t.toUpperCase() === "G7");
          return hasTag || GLOBAL_CATEGORIES.has((it.category || "").toString());
        }
        case "g7":
          return (it.category || "").toUpperCase() === "G7" || (it.tags || []).some((t) => t.toUpperCase() === "G7");
        case "eu":
          return (it.category || "").toUpperCase() === "EU" || (it.tags || []).some((t) => t.toUpperCase() === "EU");
      }
    },
    [domainFilter, userRegion, user?.district, userCountry],
  );

  // --- derive visible items (client-side filters + sort) ---
  const visibleItems = useMemo(() => {
    let arr = [...items];

    // v1 domain filter
    arr = arr.filter(matchDomainFilter);

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.summary && i.summary.toLowerCase().includes(q)) ||
          (i.author?.name && i.author.name.toLowerCase().includes(q)) ||
          (i.topic && i.topic.toLowerCase().includes(q)) ||
          (i.region && i.region.toLowerCase().includes(q)),
      );
    }

    // tag/kind filters
    if (activeTag) arr = arr.filter((i) => i.tags?.includes(activeTag));
    if (activeKind) arr = arr.filter((i) => (i.kind ?? "").toLowerCase() === activeKind.toLowerCase());

    // sort
    const byNum = (n?: number) => (typeof n === "number" ? n : -Infinity);
    arr.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      switch (sort) {
        case "oldest":
          return da - db;
        case "most_commented":
          return byNum(b.stats?.comments) - byNum(a.stats?.comments);
        case "most_liked":
          return byNum(b.stats?.likes) - byNum(a.stats?.likes);
        case "most_viewed":
          return byNum(b.stats?.views) - byNum(a.stats?.views);
        case "newest":
        default:
          return db - da;
      }
    });

    return arr;
  }, [items, matchDomainFilter, search, activeTag, activeKind, sort]);

  // --- build URL (server-side filtering ready) ---
  const buildURL = useCallback(
    (nextCursor?: string | null) => {
      const u = new URL(endpoint, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      const qp = new URLSearchParams();
      qp.set("limit", String(pageSize));
      if (nextCursor) qp.set("cursor", nextCursor);

      // carry queryParams
      if (queryParams) {
        for (const [k, v] of Object.entries(queryParams)) {
          if (v === undefined) continue;
          qp.set(k, String(v));
        }
      }

      // reflect v1 domain filter for API (optional server handling)
      qp.set("df", domainFilter);
      if (userCountry) qp.set("country", userCountry);
      if (userRegion) qp.set("region", userRegion);
      if (user?.district) qp.set("district", user.district);

      // reflect v2 filters
      if (activeTag) qp.set("tag", activeTag);
      if (activeKind) qp.set("kind", activeKind);
      if (search.trim()) qp.set("q", search.trim());
      qp.set("sort", sort);

      u.search = qp.toString();
      return u.toString();
    },
    [endpoint, pageSize, queryParams, domainFilter, userCountry, userRegion, user?.district, activeTag, activeKind, search, sort],
  );

  // --- fetch a page ---
  const fetchPage = useCallback(
    async (nextCursor?: string | null) => {
      setLoading(true);
      setError(null);
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const url = buildURL(nextCursor ?? cursor);
        const res = await fetch(url, { method: "GET", signal: ac.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PageResponse | StreamItem[];

        let page: PageResponse;
        if (Array.isArray(data)) {
          page = { items: data, nextCursor: null, hasMore: data.length >= pageSize };
        } else {
          page = data;
        }

        setItems((prev) => dedupById(prev.concat(page.items || [])));
        setCursor(page.nextCursor ?? null);
        setHasMore(Boolean(page.hasMore ?? (page.items?.length ?? 0) >= pageSize));
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Unbekannter Fehler");
        }
      } finally {
        setLoading(false);
      }
    },
    [buildURL, cursor, pageSize],
  );

  const refresh = useCallback(async () => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    await fetchPage(null);
  }, [fetchPage]);

  // --- initial load ---
  useEffect(() => {
    if (initialItems.length === 0) {
      fetchPage(null);
    } else {
      setHasMore(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- re-query on filters/search/endpoint changes (debounced) ---
  useEffect(() => {
    const t = setTimeout(() => {
      refresh();
    }, 180);
    return () => clearTimeout(t);
  }, [activeTag, activeKind, search, sort, domainFilter, endpoint, JSON.stringify(queryParams), refresh]);

  // --- infinite scroll ---
  useEffect(() => {
    if (disableInfiniteScroll) return;
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loading && hasMore) {
          fetchPage();
        }
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [disableInfiniteScroll, loading, hasMore, fetchPage]);

  // --- domain filters (v1-style) ---
  const domainFilters: Array<{ id: DomainFilter; label: string; icon?: React.ReactNode; disabled?: boolean }> = [
    { id: "all", label: language === "en" ? "All" : "Alle", icon: showIcons ? <CircleDot className="h-4 w-4" /> : undefined },
    { id: "live", label: "Live", icon: showIcons ? <CircleDot className="h-4 w-4" /> : undefined },
    userRegion
      ? { id: "district", label: language === "en" ? "My district" : "In meinem Wahlkreis", icon: showIcons ? <MapPin className="h-4 w-4" /> : undefined }
      : { id: "district", label: language === "en" ? "My district" : "In meinem Wahlkreis", icon: showIcons ? <MapPin className="h-4 w-4" /> : undefined, disabled: true },
    { id: "nation", label: nationLabel, icon: showIcons ? <span aria-hidden>{flagEmoji}</span> : undefined },
    { id: "global", label: language === "en" ? "Global" : "Global", icon: showIcons ? <Globe className="h-4 w-4" /> : undefined },
  ];

  if (presseView || politikView) {
    domainFilters.push(
      { id: "g7", label: "G7", icon: showIcons ? <Landmark className="h-4 w-4" /> : undefined },
      { id: "eu", label: "EU", icon: showIcons ? <Flag className="h-4 w-4" /> : undefined },
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="sticky top-0 z-10 mb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-xl border p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 w-full">
              <div className="relative w-full md:w-[340px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-60" />
                <Input
  value={search}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
  placeholder={language === "en" ? "Search (title, author, summary)…" : "Suchen (Titel, Autor, Zusammenfassung)…"}
  className="pl-8"
  aria-label={language === "en" ? "Search" : "Suche"}
/>
              </div>

              <Separator orientation="vertical" className="hidden md:block h-6" />

              {/* Tags (desktop) */}
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <Filter className="h-4 w-4 opacity-60 shrink-0" />
                <TagSelector
                  allTags={allTags}
                  activeTag={activeTag}
                  onSelect={(t) => setActiveTag((prev) => (prev === t ? undefined : t))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <SortSelect sort={sort} setSort={setSort} language={language} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={loading}
                aria-label={language === "en" ? "Refresh" : "Aktualisieren"}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                {language === "en" ? "Refresh" : "Aktualisieren"}
              </Button>
            </div>
          </div>

          {/* Tags (mobile) */}
          {allTags.length > 0 && (
            <div className="mt-3 md:hidden">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <Filter className="h-4 w-4 opacity-60 shrink-0" />
                <TagSelector
                  allTags={allTags}
                  activeTag={activeTag}
                  onSelect={(t) => setActiveTag((prev) => (prev === t ? undefined : t))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* v1 Domain-Filter Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {domainFilters.map((f) => (
          <FilterPill
            key={f.id}
            active={domainFilter === f.id}
            label={f.label}
            icon={f.icon}
            disabled={f.disabled}
            onClick={() => !f.disabled && setDomainFilter(f.id)}
            accentColor={accentColor}
          />
        ))}
      </div>

      {/* Fehlerzustand */}
      {error && (
        <Card className="mb-4 border-destructive/50">
          <CardHeader>
            <p className="text-sm text-destructive">
              {language === "en" ? "Error loading:" : "Fehler beim Laden:"} {error}
            </p>
          </CardHeader>
          <CardFooter>
            <Button size="sm" onClick={refresh}>
              {language === "en" ? "Try again" : "Erneut versuchen"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Leerer Zustand */}
      {!loading && visibleItems.length === 0 && !error && (
        <EmptyState
          title={language === "en" ? "No entries yet" : "Noch keine Einträge"}
          description={
            language === "en"
              ? "As soon as content is published, it will appear here."
              : "Sobald Inhalte veröffentlicht werden, erscheinen sie hier in der Liste."
          }
          actionLabel={language === "en" ? "Reload" : "Neu laden"}
          onAction={refresh}
        />
      )}

      {/* Liste */}
      <ul className="grid grid-cols-1 gap-3">
        {visibleItems.map((item, idx) => {
          const node = renderItem ? (
            renderItem(item)
          ) : (
            <DefaultStreamCard item={item} onClick={onItemClick} />
          );

          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.2) }}
            >
              {node}
            </motion.li>
          );
        })}

        {/* Skeletons */}
        {loading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={`sk-${i}`} />
            ))}
          </>
        )}
      </ul>

      {/* Mehr laden (ohne Infinite-Scroll) */}
      {disableInfiniteScroll && hasMore && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => fetchPage()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {language === "en" ? "Loading…" : "Lädt…"}
              </>
            ) : (
              language === "en" ? "Load more" : "Mehr laden"
            )}
          </Button>
        </div>
      )}

      {/* Sentinel für Infinite-Scroll */}
      {!disableInfiniteScroll && <div ref={sentinelRef} aria-hidden className="h-10 w-full" />}

      {/* Planen-Button (v1) */}
      {(admin || presseView || politikView || ngoView) && !readOnly && (
        <div className="mt-6 flex justify-end">
          <Button className="font-semibold" onClick={() => (window.location.href = "/stream/add")} type="button">
            + {language === "en" ? "Plan Stream" : "Stream planen"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Helper Widgets ----------------------------- */

function FilterPill({
  active,
  label,
  icon,
  onClick,
  disabled,
  accentColor,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accentColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border transition focus:outline-none",
        active ? "text-white shadow" : "bg-background text-foreground/80 hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      style={
        active
          ? { background: accentColor, borderColor: accentColor }
          : { borderColor: "var(--border)" as any }
      }
    >
      {icon && <span className="inline-flex">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function DefaultStreamCard({
  item,
  onClick,
}: {
  item: StreamItem;
  onClick?: (i: StreamItem) => void;
}) {
  const dateLabel = useMemo(() => fmtDate(item.createdAt), [item.createdAt]);
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (item.href) {
      return (
        <Link href={item.href} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-xl">
          {children}
        </Link>
      );
    }
    return <div onClick={() => onClick?.(item)} role={onClick ? "button" : undefined}>{children}</div>;
  };

  const initials = (item.author?.name || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusBadge =
    (item.status && (
      <Badge variant="secondary" className="capitalize">
        {item.status}
      </Badge>
    )) ||
    (item.kind && (
      <Badge variant="secondary" className="capitalize">
        {item.kind}
      </Badge>
    ));

  const tagRow =
    item.tags && item.tags.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        <TagIcon className="h-3.5 w-3.5 opacity-60" />
        {item.tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>
    ) : null;

  return (
    <Wrapper>
      <Card className="hover:bg-muted/40 transition-colors">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={item.author?.avatarUrl} alt={item.author?.name || "Autor"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.author?.name ? `${item.author.name} · ` : ""}
                  {dateLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">{statusBadge}</div>
          </div>

          {tagRow}
        </CardHeader>

        {item.summary && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
          </CardContent>
        )}

        {(item.stats?.likes || item.stats?.comments || item.stats?.views) && (
          <CardFooter className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              {nfmt(item.stats?.likes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {nfmt(item.stats?.comments)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {nfmt(item.stats?.views)}
            </span>
          </CardFooter>
        )}
      </Card>
    </Wrapper>
  );
}

function SkeletonRow() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
      </CardContent>
      <CardFooter>
        <div className="h-3 w-1/5 bg-muted rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="text-center">
      <CardHeader>
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      {onAction && (
        <CardFooter className="justify-center">
          <Button size="sm" onClick={onAction}>
            {actionLabel || "Neu laden"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function SortSelect({
  sort,
  setSort,
  language = "de",
}: {
  sort: SortKey;
  setSort: (k: SortKey) => void;
  language?: "de" | "en";
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant={sort === "newest" ? "default" : "outline"}
        onClick={() => setSort("newest")}
        aria-pressed={sort === "newest"}
        className="gap-1"
        title={language === "en" ? "Newest first" : "Neueste zuerst"}
      >
        <ArrowDownAZ className="h-4 w-4" />
        {language === "en" ? "New" : "Neu"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={sort === "oldest" ? "default" : "outline"}
        onClick={() => setSort("oldest")}
        aria-pressed={sort === "oldest"}
        className="gap-1"
        title={language === "en" ? "Oldest first" : "Älteste zuerst"}
      >
        <ArrowUpAZ className="h-4 w-4" />
        {language === "en" ? "Old" : "Alt"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={sort === "most_commented" ? "default" : "outline"}
        onClick={() => setSort("most_commented")}
        aria-pressed={sort === "most_commented"}
        className="gap-1"
        title={language === "en" ? "Most comments" : "Meiste Kommentare"}
      >
        <MessageSquare className="h-4 w-4" />
        {language === "en" ? "Comments" : "Kommentare"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={sort === "most_liked" ? "default" : "outline"}
        onClick={() => setSort("most_liked")}
        aria-pressed={sort === "most_liked"}
        className="gap-1"
        title={language === "en" ? "Most likes" : "Meiste Likes"}
      >
        <ThumbsUp className="h-4 w-4" />
        {language === "en" ? "Likes" : "Likes"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={sort === "most_viewed" ? "default" : "outline"}
        onClick={() => setSort("most_viewed")}
        aria-pressed={sort === "most_viewed"}
        className="gap-1"
        title={language === "en" ? "Most views" : "Meiste Views"}
      >
        <Eye className="h-4 w-4" />
        {language === "en" ? "Views" : "Views"}
      </Button>
    </div>
  );
}

function TagSelector({
  allTags,
  activeTag,
  onSelect,
}: {
  allTags: string[];
  activeTag?: string;
  onSelect: (t: string) => void;
}) {
  if (allTags.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {allTags.map((t) => {
        const active = activeTag === t;
        return (
          <Badge
            key={t}
            variant={active ? "default" : "outline"}
            className={cn("cursor-pointer select-none whitespace-nowrap", active && "ring-1 ring-ring")}
            onClick={() => onSelect(t)}
          >
            {t}
          </Badge>
        );
      })}
    </div>
  );
}

// named export for compatibility
export { StreamListV3 as StreamList };
