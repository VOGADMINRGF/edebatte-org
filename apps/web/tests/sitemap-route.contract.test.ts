import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap route contract", () => {
  it("lists the canonical public discovery routes without auth or legacy-only entries", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://www.edebatte.org/",
      "https://www.edebatte.org/themen",
      "https://www.edebatte.org/runden",
      "https://www.edebatte.org/beteiligung",
      "https://www.edebatte.org/factcheck",
      "https://www.edebatte.org/pricing",
      "https://www.edebatte.org/pricing/institutionen",
      "https://www.edebatte.org/pricing/institutionen/decision-intelligence",
    ]);
    expect(urls).not.toContain("https://www.edebatte.org/login");
    expect(urls).not.toContain("https://www.edebatte.org/register");
    expect(urls).not.toContain("https://www.edebatte.org/reset");
    expect(urls).not.toContain("https://www.edebatte.org/verify");
    expect(urls).not.toContain("https://www.edebatte.org/settings");
    expect(urls).not.toContain("https://www.edebatte.org/start");
    expect(entries[0]).toMatchObject({
      url: "https://www.edebatte.org/",
      changeFrequency: "daily",
      priority: 1,
    });
  });
});
