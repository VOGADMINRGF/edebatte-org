// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SwipesClient } from "@/app/swipes/SwipesClient";
import type { SwipeItem } from "@/features/swipes/types";

vi.mock("@/components/privacy/PrivacyGateProvider", () => ({
  usePrivacyGate: () => ({ ensureActiveProcessingAllowed: () => true }),
}));

const ITEMS: SwipeItem[] = [
  buildItem("one", "Soll der Bürgerpark mehr Sitzplätze erhalten?", true),
  buildItem("two", "Soll die Busspur am Bahnhof verlängert werden?", true),
  buildItem("three", "Soll der Platz vor dem Rathaus entsiegelt werden?", true),
  buildItem("four", "Soll die Stadtbibliothek sonntags öffnen?", false),
];
let feedItems = ITEMS;

function buildItem(id: string, title: string, hasEventualities: boolean): SwipeItem {
  return {
    id,
    title,
    text: `${title} Kurzer Kontext.`,
    level: "Kommune",
    category: "Stadtentwicklung",
    domainLabel: "Regional",
    topicTags: ["Wuppertal"],
    sourceType: "civic",
    sourceLabel: "Bürgerhinweis",
    responsibilityLabel: "Zuständigkeit: Kommune",
    evidenceCount: 2,
    eventualitiesCount: hasEventualities ? 2 : 0,
    hasEventualities,
  };
}

describe("immediate swipe card flow", () => {
  beforeEach(() => {
    feedItems = ITEMS;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/swipes/feed") {
          return { ok: true, json: async () => ({ items: feedItems, nextCursor: null }) } as Response;
        }
        if (url === "/api/swipes/vote") {
          return { ok: true, json: async () => ({ ok: true }) } as Response;
        }
        if (url === "/api/swipes/eventualities") {
          throw new Error("Normal votes must not open the variants step");
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("moves directly after neutral, no and yes without a prompt or variants interruption", async () => {
    render(<SwipesClient requireAuthAfterFreeVotes />);

    await expectActiveTitle(ITEMS[0].title);
    const controls = within(screen.getByRole("navigation", { name: "Swipe-Entscheidungen" }));

    fireEvent.click(controls.getByRole("button", { name: "Neutral" }));
    await expectActiveTitle(ITEMS[1].title);
    expect(screen.queryByText("Was fehlt dir gerade für eine Entscheidung?")).toBeNull();

    fireEvent.click(controls.getByRole("button", { name: "Nein – Karte ablehnen" }));
    await expectActiveTitle(ITEMS[2].title);

    fireEvent.click(controls.getByRole("button", { name: "Ja – Karte zustimmen" }));
    await expectActiveTitle(ITEMS[3].title);

    expect(screen.queryByText("Varianten-Schritt")).toBeNull();
    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/swipes/eventualities")).toBe(false);
    });
  });

  it("opens the login gate only after the tenth free decision", async () => {
    feedItems = Array.from({ length: 12 }, (_, index) =>
      buildItem(`gate-${index + 1}`, `Kommunale Frage ${index + 1}?`, false),
    );
    render(<SwipesClient requireAuthAfterFreeVotes />);

    await expectActiveTitle(feedItems[0].title);
    const controls = within(screen.getByRole("navigation", { name: "Swipe-Entscheidungen" }));

    for (let index = 1; index <= 9; index += 1) {
      fireEvent.click(controls.getByRole("button", { name: "Neutral" }));
      await expectActiveTitle(feedItems[index].title);
      expect(screen.queryByText("Weiter abstimmen")).toBeNull();
    }

    fireEvent.click(controls.getByRole("button", { name: "Neutral" }));
    await expectActiveTitle(feedItems[10].title);
    expect(screen.getByText("Weiter abstimmen")).toBeTruthy();
    expect(screen.getByText("Du hast 10 Themen eingeordnet.")).toBeTruthy();
  });
});

async function expectActiveTitle(title: string) {
  await waitFor(() => {
    const activeCard = document.querySelector<HTMLElement>('[data-swipe-card="active"]');
    expect(activeCard).not.toBeNull();
    expect(within(activeCard as HTMLElement).getByRole("heading", { name: title })).toBeTruthy();
  });
}

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
