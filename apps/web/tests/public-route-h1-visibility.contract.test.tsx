import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LandingStart from "@/app/start/LandingStart";
import PricingPage from "@/app/pricing/page";
import OrderPage from "@/app/order/page";
import VormerkenPage from "@/app/vormerken/page";
import RegisterPageClient from "@/app/register/RegisterPageClient";
import ThemenPage from "@/app/themen/page";
import PublicParticipationSpaceIndexPage from "@/app/beteiligung/page";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({
    push: navigation.push,
  }),
  usePathname: () => "/start",
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}));

function expectSingleVisibleH1(html: string, text: string) {
  const headings = [...html.matchAll(/<h1([^>]*)>/g)];

  expect(headings).toHaveLength(1);
  expect(headings[0]?.[1] ?? "").not.toContain("sr-only");
  expect(html).toContain(text);
}

describe("public route h1 visibility contract", () => {
  it("keeps the main public entry surfaces on exactly one visible h1", async () => {
    const landingHtml = renderToStaticMarkup(<LandingStart />);
    const pricingHtml = renderToStaticMarkup(await PricingPage({}));
    const orderHtml = renderToStaticMarkup(<OrderPage />);
    const legacyOrderHtml = renderToStaticMarkup(<VormerkenPage />);
    const registerHtml = renderToStaticMarkup(<RegisterPageClient />);
    const themenHtml = renderToStaticMarkup(<ThemenPage />);
    const participationHtml = renderToStaticMarkup(await PublicParticipationSpaceIndexPage());

    expectSingleVisibleH1(landingHtml, "Eine Frage. Viele Perspektiven. Ein klareres Bild.");
    expectSingleVisibleH1(pricingHtml, "Kostenlos mitmachen. Mehr nur buchen, wenn du es brauchst.");
    expectSingleVisibleH1(orderHtml, "Paket wählen und Start vorbereiten");
    expectSingleVisibleH1(legacyOrderHtml, "Paket wählen und Start vorbereiten");
    expectSingleVisibleH1(registerHtml, "Registrieren");
    expectSingleVisibleH1(themenHtml, "Finde, wo dein Beitrag anknüpft.");
    expectSingleVisibleH1(participationHtml, "Öffentlich freigegebene Beteiligungsräume");
  });

  it("keeps raw runtime/debug terms out of rendered public route markup", async () => {
    const html = [
      renderToStaticMarkup(<LandingStart />),
      renderToStaticMarkup(await PricingPage({})),
      renderToStaticMarkup(<OrderPage />),
      renderToStaticMarkup(<VormerkenPage />),
      renderToStaticMarkup(<RegisterPageClient />),
      renderToStaticMarkup(<ThemenPage />),
      renderToStaticMarkup(await PublicParticipationSpaceIndexPage()),
    ].join("\n");

    [
      "Runtime-basiert",
      "Fixture-basiert",
      "Runtime-Published",
      "blocked_unwired",
      "fixture_fallback",
      "public_official",
      "ready_for_publication_review",
    ].forEach((term) => {
      expect(html).not.toContain(term);
    });
  });
});