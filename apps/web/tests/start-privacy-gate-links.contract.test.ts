import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import LandingStart from "@/app/start/LandingStart";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/start",
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", { alt: "", ...props }),
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

describe("start privacy gate link contract", () => {
  it("allows the local draft entry before active processing and keeps participation explicit", () => {
    const html = renderToStaticMarkup(createElement(LandingStart));

    expect(html).not.toContain('data-requires-privacy-gate="true"');
    expect(html).toContain('href="/swipes"');
    expect(html).toContain('href="/runden/new?gtm=1&amp;source=homepage"');
  });
});
