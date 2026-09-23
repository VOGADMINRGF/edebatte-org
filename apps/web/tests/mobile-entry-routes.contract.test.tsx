import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

import LandingStart from "@/app/start/LandingStart";
import { classifyMobileAppShellPath } from "@/features/wrapper/mobileAppShellContract";

describe("mobile entry routes contract", () => {
  const startPageSource = readFileSync(resolve(process.cwd(), "src/app/start/page.tsx"), "utf8");

  it("keeps start, swipes, event, dossier and QR entry inside the mobile core shell", () => {
    expect(classifyMobileAppShellPath("/start")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/swipes")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/runden")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/anlassraum")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/dossier")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/dossier/dossier-123")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/stream")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/stream/event-berlin")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/qr/event-berlin")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/live/demo-pflege-vor-ort")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/live/demo-pflege-vor-ort/host")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/live/demo-pflege-vor-ort/report")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
    expect(classifyMobileAppShellPath("/live/demo-pflege-vor-ort/media-kit")).toMatchObject({ shellEnabled: true, bottomNavEnabled: true, reason: "core" });
  });

  it("keeps /start as a mobile-first citizen entry without demo dossier fallback", () => {
    const html = renderToStaticMarkup(<LandingStart blocks={[]} />);

    expect(html).toContain("Was sollte sich ändern?");
    expect(html).toContain("Anliegen einbringen");
    expect(html).toContain("Schnell mitentscheiden");
    expect(html).toContain('href="/create"');
    expect(html).toContain('href="/swipes"');
    expect(html).not.toContain('href="/dossier/demo"');
  });

  it("keeps the start shell on stable mobile viewport units instead of hard h-screen constraints", () => {
    expect(startPageSource).toContain('className="min-h-[100svh]"');
    expect(startPageSource).not.toContain("min-h-screen");
  });

  it("renders the citizen action before secondary homepage sections", () => {
    const html = renderToStaticMarkup(<LandingStart blocks={[]} />);

    expect(html).toContain("Ein Satz reicht zum Start");
    expect(html.indexOf("Anliegen einbringen")).toBeLessThan(
      html.indexOf("Professionelle Nutzung bleibt nachgelagert"),
    );
    expect(html).toContain("min-h-12");
  });
});
