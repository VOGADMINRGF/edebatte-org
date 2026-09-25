// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  decodeFreeVoteStorage,
  encodeFreeVoteStorage,
  FREE_VOTE_LIMIT,
  FREE_VOTE_STORAGE_KEY,
  FREE_VOTE_STORAGE_VERSION,
  useFreeVoteLimit,
} from "@/features/surfaces/swipes/useFreeVoteLimit";

describe("10 free swipe contract", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  it("allows ten decisions and rejects the eleventh", async () => {
    const { result } = renderHook(() => useFreeVoteLimit({ enabled: true }));

    await waitFor(() => expect(result.current.limit).toBe(FREE_VOTE_LIMIT));

    const registered: Array<number | null> = [];
    act(() => {
      for (let index = 0; index < FREE_VOTE_LIMIT; index += 1) {
        registered.push(result.current.registerVote());
      }
    });

    expect(registered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.current.count).toBe(10);
    expect(result.current.remaining).toBe(0);
    expect(result.current.canVote).toBe(false);
    expect(result.current.registerVote()).toBeNull();
  });

  it("migrates the legacy numeric three without gating the user", async () => {
    window.localStorage.setItem(FREE_VOTE_STORAGE_KEY, "3");

    const { result } = renderHook(() => useFreeVoteLimit({ enabled: true }));

    await waitFor(() => expect(result.current.count).toBe(3));
    expect(result.current.remaining).toBe(7);
    expect(result.current.canVote).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(FREE_VOTE_STORAGE_KEY) ?? "null")).toEqual({
      version: FREE_VOTE_STORAGE_VERSION,
      count: 3,
    });
  });

  it("preserves legitimate higher counters during the versioned migration", () => {
    expect(decodeFreeVoteStorage("17")).toEqual({ count: 17, needsMigration: true });
    expect(decodeFreeVoteStorage(encodeFreeVoteStorage(17))).toEqual({ count: 17, needsMigration: false });
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}
