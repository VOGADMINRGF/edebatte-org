import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import LiveCampaignPage from "@/app/live/[campaignId]/page";
import { createLiveCampaignStartDraft } from "@/features/campaign/liveCampaignEntryClient";
import {
  readLiveCampaignEntry,
} from "@/features/campaign/liveCampaignEntry";
import { readStartDraftContext, saveStartDraftContext } from "@/features/start/startDraftContext";

function installSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
}

describe("live campaign entry contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a clear mobile-first campaign entry with draft-only guardrails", async () => {
    const tree = await LiveCampaignPage({
      params: Promise.resolve({ campaignId: "demo-pflege-vor-ort" }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-testid="live-campaign-entry"');
    expect(html).toContain("Pflege vor Ort 2026");
    expect(html).toContain("Beitrag einbringen");
    expect(html).toContain("Frage stellen");
    expect(html).toContain('data-testid="live-campaign-trust-labels"');
    expect(html).toContain("Entwurf");
    expect(html).toContain("Noch nicht veröffentlicht");
    expect(html).toContain("Wird eingeordnet");
    expect(html).toContain("Quellenlage offen");
    expect(html).toContain("Prüfung empfohlen");
    expect(html).toContain("Community-Beitrag");
    expect(html).toContain("Keine Stimme aus dem Entwurf.");
    expect(html).toContain("Keine Quellenprüfung ohne bestehenden Gate-Pfad.");
    expect(html).toContain("Report-Entwurf öffnen");
    expect(html).toContain("Media-Kit ansehen");
    expect(html).toContain('href="/live/demo-pflege-vor-ort/host"');
    expect(html).toContain('href="/live/demo-pflege-vor-ort/report"');
    expect(html).toContain('href="/live/demo-pflege-vor-ort/media-kit"');
    expect(html).not.toContain("Verifiziert");
    expect(html).not.toContain("Quellen geprüft");
    expect(html).toContain('href="/create?startDraft=1&amp;campaign=demo-pflege-vor-ort"');
    expect(html).toContain('href="/themen?startDraft=1&amp;campaign=demo-pflege-vor-ort"');
  });

  it("creates a campaign-aware draft handoff for create and themes without auto-publish flags changing", async () => {
    installSessionStorage();
    const campaign = await readLiveCampaignEntry("demo-pflege-vor-ort");
    expect(campaign).not.toBeNull();

    saveStartDraftContext(createLiveCampaignStartDraft(campaign!, "contribution", "live_campaign"));

    expect(readStartDraftContext()?.origin).toBe("live_campaign");
    expect(readStartDraftContext()?.targetHint).toBe("create");
    expect(readStartDraftContext()?.campaign?.campaignId).toBe("demo-pflege-vor-ort");
    expect(readStartDraftContext()?.noAutoPublish).toBe(true);
    expect(readStartDraftContext()?.noAutoDossier).toBe(true);
    expect(readStartDraftContext()?.noAutoAnlassraum).toBe(true);
    expect(readStartDraftContext()?.noAutoGraphWrite).toBe(true);

    saveStartDraftContext(createLiveCampaignStartDraft(campaign!, "question", "campaign_qr"));

    expect(readStartDraftContext()?.origin).toBe("campaign_qr");
    expect(readStartDraftContext()?.targetHint).toBe("themes");
    expect(readStartDraftContext()?.campaign?.title).toBe("Pflege vor Ort 2026");
  });

  it("shows a helpful fallback for unknown campaign ids instead of crashing", async () => {
    const tree = await LiveCampaignPage({
      params: Promise.resolve({ campaignId: "unbekanntes-campaign-ziel" }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-testid="live-campaign-entry-missing"');
    expect(html).toContain("Live-Kampagne nicht gefunden");
    expect(html).toContain('href="/start"');
    expect(html).toContain('href="/themen"');
    expect(html).not.toContain("Verifiziert");
  });

  it("keeps the QR landing wired to the draft-first live route instead of the old join shortcut", () => {
    const qrPageSource = readFileSync(resolve(process.cwd(), "src/app/qr/[qrId]/page.tsx"), "utf8");

    expect(qrPageSource).toContain('source: "qr"');
    expect(qrPageSource).toContain('href={liveHref}');
    expect(qrPageSource).toContain("Live-Einstieg öffnen");
    expect(qrPageSource).not.toContain("Teilnahme starten");
  });
});
