"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_SECTIONS, flattenNavItems } from "./adminNav";

type InventoryRoute = {
  path: string;
  file: string;
  kind: "page" | "api";
};

type DataSearchItem = {
  id: string;
  group: string;
  label: string;
  description?: string | null;
  href: string;
  badge?: string | null;
};

const DATA_GROUP_ORDER = ["Nutzer", "Evidence Claims", "Evidence Items", "Reports"];

export default function AdminSearchButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState<InventoryRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataResults, setDataResults] = useState<DataSearchItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
    if (inventory.length === 0 && !loading) {
      setLoading(true);
      fetch("/api/admin/access/routes/inventory", { cache: "no-store" })
        .then((res) => res.json())
        .then((body) => {
          const items = Array.isArray(body?.items) ? body.items : [];
          setInventory(items);
        })
        .catch(() => null)
        .finally(() => setLoading(false));
    }
  }, [open, inventory.length, loading]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDataResults([]);
    }
  }, [open]);

  const navItems = useMemo(() => flattenNavItems(NAV_SECTIONS), []);

  const filteredNavItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return navItems;
    const terms = normalized.split(/\s+/).filter(Boolean);
    return navItems.filter((item) => {
      const haystack = [item.label, item.description ?? "", item.href, ...(item.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [navItems, query]);

  const filteredInventory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const terms = normalized.split(/\s+/).filter(Boolean);
    return inventory.filter((item) => {
      const haystack = [item.path, item.file, item.kind].join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [inventory, query]);

  const hasQuery = query.trim().length > 0;
  const dataQuery = query.trim();
  const canSearchData = dataQuery.length >= 2;

  useEffect(() => {
    if (!open) {
      setDataLoading(false);
      return;
    }
    if (!canSearchData) {
      setDataResults([]);
      setDataLoading(false);
      return;
    }
    const controller = new AbortController();
    const tid = setTimeout(() => {
      setDataLoading(true);
      fetch(`/api/admin/search?q=${encodeURIComponent(dataQuery)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((body) => {
          const items = Array.isArray(body?.items) ? body.items : [];
          setDataResults(items);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            setDataResults([]);
          }
        })
        .finally(() => setDataLoading(false));
    }, 200);

    return () => {
      clearTimeout(tid);
      controller.abort();
    };
  }, [open, dataQuery, canSearchData]);

  const groupedDataResults = useMemo(() => {
    if (!dataResults.length) return [];
    const buckets = new Map<string, DataSearchItem[]>();
    dataResults.forEach((item) => {
      const group = item.group || "Treffer";
      const list = buckets.get(group) ?? [];
      list.push(item);
      buckets.set(group, list);
    });
    return Array.from(buckets.entries()).sort((a, b) => {
      const aIndex = DATA_GROUP_ORDER.indexOf(a[0]);
      const bIndex = DATA_GROUP_ORDER.indexOf(b[0]);
      if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0]);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [dataResults]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
      >
        Suche
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
          Cmd+K
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 py-16 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_rgba(15,23,42,0.4)] ring-1 ring-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suche in Navigation und Seiten (z.B. reports, users, /admin/...)"
                className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Schliessen
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
              {!hasQuery && (
                <div className="space-y-4">
                  {NAV_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {section.title}
                      </p>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-800 hover:border-sky-200 hover:bg-sky-50"
                          >
                            <div className="font-semibold text-slate-900">{item.label}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500">{item.description}</div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasQuery && (
                <div className="space-y-4">
                  <section>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Navigation
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {filteredNavItems.length} Treffer
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {filteredNavItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-800 hover:border-sky-200 hover:bg-sky-50"
                        >
                          <div className="font-semibold text-slate-900">{item.label}</div>
                          <div className="text-[11px] text-slate-500">{item.href}</div>
                        </Link>
                      ))}
                      {filteredNavItems.length === 0 && (
                        <div className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-500">
                          Keine Treffer in der Navigation.
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Admin Daten
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {dataLoading ? "laedt" : `${dataResults.length} Treffer`}
                      </span>
                    </div>
                    <div className="mt-2 space-y-3">
                      {!canSearchData && (
                        <div className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-500">
                          Mindestens 2 Zeichen für Datensuche.
                        </div>
                      )}
                      {canSearchData &&
                        groupedDataResults.map(([group, items]) => (
                          <div key={group} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                {group}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {items.length}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {items.map((item) => (
                                <Link
                                  key={item.id}
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-800 hover:border-sky-200 hover:bg-sky-50"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {item.label}
                                    </div>
                                    {item.description && (
                                      <div className="text-[11px] text-slate-500">
                                        {item.description}
                                      </div>
                                    )}
                                  </div>
                                  {item.badge && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              ))}
                              {items.length === 0 && !dataLoading && (
                                <div className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-500">
                                  Keine Treffer in {group}.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      {canSearchData && !dataLoading && groupedDataResults.length === 0 && (
                        <div className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-500">
                          Keine Treffer in Admin-Daten.
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Seitenindex
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {loading ? "laedt" : `${filteredInventory.length} Treffer`}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {filteredInventory.map((item) => (
                        <a
                          key={`${item.kind}-${item.path}`}
                          href={item.path}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-800 hover:border-sky-200 hover:bg-sky-50"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{item.path}</div>
                            <div className="text-[11px] text-slate-500">{item.file}</div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                            {item.kind}
                          </span>
                        </a>
                      ))}
                      {!loading && filteredInventory.length === 0 && (
                        <div className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-500">
                          Keine Treffer im Seitenindex.
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
