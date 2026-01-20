"use client";

import { useCallback, useEffect, useState } from "react";
import type { LandingScope, LandingTile } from "./landingSeeds";
import { SEEDS } from "./landingSeeds";

const STORAGE_KEY = "edb_landing_feed_v1";

type Store = Record<LandingScope, LandingTile[]>;

function safeRead(): Store | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function safeWrite(store: Store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function scopeFromResponsibility(resp?: string | null): LandingScope {
  const r = (resp || "").toLowerCase();
  if (/\b(eu|europe|european|brussel|brüssel)\b/.test(r)) return "eu";
  if (/(kommune|bezirk|gemeinde|city|municipal|county|district|local)\b/.test(r)) return "region";
  if (/(bund|land|federal|national|country|state)\b/.test(r)) return "country";
  if (/(global|world|international|un|united nations)\b/.test(r)) return "world";
  return "world";
}

export function useLandingFeed() {
  const [store, setStore] = useState<Store>(() => ({
    world: SEEDS.world,
    eu: SEEDS.eu,
    country: SEEDS.country,
    region: SEEDS.region,
  }));

  useEffect(() => {
    const saved = safeRead();
    if (saved?.world && saved?.eu && saved?.country && saved?.region) {
      setStore(saved);
    }
  }, []);

  const ingest = useCallback((scope: LandingScope, tiles: LandingTile[]) => {
    setStore((prev) => {
      const next = { ...prev };
      const existing = new Set(next[scope].map((t) => t.text.trim()));
      const merged = [...tiles.filter((t) => !existing.has(t.text.trim())), ...next[scope]];
      next[scope] = merged.slice(0, 14); // keep it tight
      safeWrite(next);
      return next;
    });
  }, []);

  return { store, ingest };
}
