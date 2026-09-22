import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  getReadModel: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("@/features/vog/publicBallotReadModel", () => ({
  getVogPublicBallotReadModel: (...args: unknown[]) =>
    mocks.getReadModel(...args),
}));

import VogPublicBallotPage from "@/app/vog/fragen/[code]/[questionId]/page";

describe("VOG public ballot page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReadModel.mockResolvedValue(null);
  });

  it("renders a fail-closed missing state even when origin metadata looks trusted", async () => {
    const html = renderToStaticMarkup(
      await VogPublicBallotPage({
        params: Promise.resolve({
          code: "missing-set",
          questionId: "missing-question",
        }),
        searchParams: Promise.resolve({
          source: "vote4gov",
          origin: "voiceopengov",
          origin_id: "vog-question-01",
          reading_locale: "de",
          ui_locale: "de",
          output_locale: "de",
        }),
      }),
    );

    expect(html).toContain("Öffentliche Frage nicht verfügbar");
    expect(html).toContain("Herkunftsparameter können keine Freigabe erzeugen");
    expect(html).not.toContain("Stimme abgeben");
    expect(mocks.getReadModel).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "missing-set",
        questionId: "missing-question",
        readingLocale: "de",
        uiLocale: "de",
        outputLocale: "de",
        guestTokenHash: null,
      }),
    );
  });

  it("renders the English missing and network-safe state", async () => {
    const html = renderToStaticMarkup(
      await VogPublicBallotPage({
        params: Promise.resolve({ code: "missing", questionId: "missing" }),
        searchParams: Promise.resolve({
          reading_locale: "en",
          ui_locale: "en",
          output_locale: "en",
        }),
      }),
    );

    expect(html).toContain('lang="en"');
    expect(html).toContain("Public question unavailable");
    expect(html).toContain("Origin parameters cannot grant access");
  });

  it("renders an Arabic RTL missing state from an allowlisted UI locale", async () => {
    const html = renderToStaticMarkup(
      await VogPublicBallotPage({
        params: Promise.resolve({ code: "missing", questionId: "missing" }),
        searchParams: Promise.resolve({ ui_locale: "ar", reading_locale: "ar" }),
      }),
    );

    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("السؤال العام غير متاح");
  });

  it("does not trust invalid or duplicate query locales", async () => {
    const html = renderToStaticMarkup(
      await VogPublicBallotPage({
        params: Promise.resolve({ code: "missing", questionId: "missing" }),
        searchParams: Promise.resolve({
          reading_locale: ["ar", "de"],
          ui_locale: "not_a_locale",
        }),
      }),
    );

    expect(html).toContain('lang="de"');
    expect(html).toContain("Öffentliche Frage nicht verfügbar");
    expect(html).not.toContain('dir="rtl"');
  });
});
