import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LandingStart from "@/app/start/LandingStart";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/start",
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}));

describe("landing information architecture contract", () => {
  it("keeps the homepage focused on participation first and depth on demand", () => {
    const html = renderToStaticMarkup(<LandingStart />);

    expect(html).toContain("Eine Frage. Viele Perspektiven. Ein klareres Bild.");
    expect(html).toContain("Mitmachen");
    expect(html).toContain("Etwas starten");
    expect(html).toContain("Schnell deine Meinung abgeben");
    expect(html).toContain("Eine eigene Frage öffnen");
    expect(html).toContain("1 Frage · direkt ausprobieren");
    expect(html).toContain("Jetzt beginnt der Unterschied");
    expect(html).toContain("Nicht nur Antworten sammeln");
    expect(html).toContain("Einfach anfangen. Tiefe entsteht erst, wenn du sie brauchst.");
    expect(html).toContain("Du behältst die Kontrolle.");
    expect(html).toContain("ohne eine feste Schablone vorzugeben");
    expect(html).toContain("ohne Menschen in politische oder persönliche Schubladen einzuordnen");
    expect(html).toContain('href="/runden/new?gtm=1&amp;source=homepage-intent"');
    expect(html).toContain('href="/swipes"');

    expect(html).not.toContain("Parteiprogramm");
    expect(html).not.toContain("Review Queue");
    expect(html).not.toContain("Runtime-basiert");
    expect(html).not.toContain("Orchestrator");
    expect(html).not.toContain("Anlassraum");
    expect(html).not.toContain("Analysefortschritt");
  });
});