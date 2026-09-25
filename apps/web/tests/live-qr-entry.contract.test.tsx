import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

import QRScanPage from "@/app/qr/[qrId]/page";

describe("live qr entry contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes campaign qr resolutions into the guarded live campaign landing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            targetType: "campaign_session",
            targetIds: ["demo-pflege-vor-ort", "session-berlin-01"],
            title: "Pflege vor Ort 2026",
          },
        }),
      }),
    );

    const tree = await QRScanPage({
      params: Promise.resolve({ qrId: "pflege-berlin" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-testid="qr-campaign-landing"');
    expect(html).toContain("Kampagnen-QR");
    expect(html).toContain("Pflege vor Ort 2026");
    expect(html).toContain('href="/live/demo-pflege-vor-ort?source=qr&amp;session=session-berlin-01"');
    expect(html).toContain("Live-Einstieg öffnen");
    expect(html).toContain("Kampagnenkontext ansehen");
    expect(html).toContain("nichts automatisch veröffentlicht oder gezählt");
  });

  it("shows a safe fallback for unknown qr ids instead of crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: false,
        }),
      }),
    );

    const tree = await QRScanPage({
      params: Promise.resolve({ qrId: "unknown-live-qr" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-testid="qr-entry-fallback"');
    expect(html).toContain('data-qr-fallback-reason="not_found"');
    expect(html).toContain("QR-Code nicht verfügbar");
    expect(html).toContain("unknown-live-qr");
    expect(html).toContain('href="/start"');
    expect(html).toContain('href="/stream"');
    expect(html).toContain("kein Auto-Publish");
  });
});
