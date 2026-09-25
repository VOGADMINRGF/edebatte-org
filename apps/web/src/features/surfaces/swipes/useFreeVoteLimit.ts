"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const FREE_VOTE_STORAGE_KEY = "edb_swipes_free_votes_v1";
export const FREE_VOTE_STORAGE_VERSION = 2;
export const FREE_VOTE_LIMIT = 10;

type FreeVoteStorageState = {
  version: typeof FREE_VOTE_STORAGE_VERSION;
  count: number;
};

export type DecodedFreeVoteStorage = {
  count: number;
  needsMigration: boolean;
};

function normalizeCount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

export function decodeFreeVoteStorage(raw: string | null): DecodedFreeVoteStorage {
  if (raw === null) return { count: 0, needsMigration: false };

  const legacyCount = normalizeCount(raw);
  if (legacyCount !== null) {
    return { count: legacyCount, needsMigration: true };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FreeVoteStorageState> | null;
    const count = normalizeCount(parsed?.count);
    if (count === null) return { count: 0, needsMigration: true };
    return {
      count,
      needsMigration: parsed?.version !== FREE_VOTE_STORAGE_VERSION,
    };
  } catch {
    return { count: 0, needsMigration: true };
  }
}

export function encodeFreeVoteStorage(count: number): string {
  return JSON.stringify({
    version: FREE_VOTE_STORAGE_VERSION,
    count: normalizeCount(count) ?? 0,
  } satisfies FreeVoteStorageState);
}

type UseFreeVoteLimitArgs = {
  enabled: boolean;
  limit?: number;
};

export function useFreeVoteLimit({ enabled, limit = FREE_VOTE_LIMIT }: UseFreeVoteLimitArgs) {
  const [count, setCount] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const countRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      countRef.current = 0;
      setCount(0);
      setGateOpen(false);
      return;
    }
    try {
      const decoded = decodeFreeVoteStorage(window.localStorage.getItem(FREE_VOTE_STORAGE_KEY));
      countRef.current = decoded.count;
      setCount(decoded.count);
      setGateOpen(false);
      if (decoded.needsMigration) {
        window.localStorage.setItem(FREE_VOTE_STORAGE_KEY, encodeFreeVoteStorage(decoded.count));
      }
    } catch {
      countRef.current = 0;
      setCount(0);
    }
  }, [enabled]);

  const canVote = !enabled || count < limit;
  const remaining = Math.max(limit - count, 0);

  const registerVote = useCallback((): number | null => {
    if (!enabled) return 0;
    if (countRef.current >= limit) {
      return null;
    }
    const next = countRef.current + 1;
    countRef.current = next;
    setCount(next);
    try {
      window.localStorage.setItem(FREE_VOTE_STORAGE_KEY, encodeFreeVoteStorage(next));
    } catch {
      // ignore storage errors
    }
    return next;
  }, [enabled, limit]);

  const unregisterVote = useCallback((): number | null => {
    if (!enabled) return 0;
    const next = Math.max(countRef.current - 1, 0);
    countRef.current = next;
    setCount(next);
    if (next < limit) {
      setGateOpen(false);
    }
    try {
      window.localStorage.setItem(FREE_VOTE_STORAGE_KEY, encodeFreeVoteStorage(next));
    } catch {
      // ignore storage errors
    }
    return next;
  }, [enabled, limit]);

  return useMemo(
    () => ({
      enabled,
      limit,
      count,
      remaining,
      canVote,
      gateOpen,
      setGateOpen,
      registerVote,
      unregisterVote,
    }),
    [enabled, limit, count, remaining, canVote, gateOpen, registerVote, unregisterVote],
  );
}
