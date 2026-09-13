import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import LandingStart from "@/app/start/LandingStart";
import { LocaleProvider } from "@/context/LocaleContext";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, ...rest } = props;
    return <img alt="" {...rest} />;
  },
}));

describe("start CTA immediate navigation contract", () => {
  it("renders citizen, participation and professional CTAs as direct links", () => {
    const html = renderToStaticMarkup(
      <LocaleProvider initialLocale="de">
        <LandingStart />
      </LocaleProvider>,
    );

    expect((html.match(/href="\/create"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/href="\/swipes"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((html.match(/href="\/themen"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="/runden/new?gtm=1&amp;source=homepage-professional"');
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("aria-busy");
  });

  it("keeps the landing entry free of pre-navigation analysis and async pending logic", () => {
    const landingSource = readFileSync(
      resolve(process.cwd(), "src/app/start/LandingStart.tsx"),
      "utf8",
    );
    const splitLandingSource = readFileSync(
      resolve(process.cwd(), "src/features/home/HomeSplitVoxyLanding.tsx"),
      "utf8",
    );

    expect(landingSource).not.toContain("useRouter");
    expect(splitLandingSource).not.toContain("useRouter");
    expect(splitLandingSource).not.toContain("onSubmit");
    expect(splitLandingSource).not.toContain("startBusy");
    expect(splitLandingSource).toContain("buildFreeBallotStartHref");
    expect(splitLandingSource).toContain("Link");
  });
});
