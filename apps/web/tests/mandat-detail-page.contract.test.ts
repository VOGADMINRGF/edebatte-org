import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MandatDetailPage from "@/app/mandat/[id]/page";

async function renderMandat(id = "decision-mandate-001") {
  const element = await MandatDetailPage({
    params: Promise.resolve({ id }),
  });
  return renderToStaticMarkup(element);
}

describe("/mandat/[id] read-only public surface", () => {
  it("renders decision identity, majority/minority, scope and references", async () => {
    const html = await renderMandat();

    expect(html).toContain("eDebatte Entscheidungsmandat");
    expect(html).toContain("Gültiger Entscheid");
    expect(html).toContain("Mehrheitsposition");
    expect(html).toContain("Minderheitenpositionen");
    expect(html).toContain("simple-majority");
    expect(html).toContain("kommune-beispielstadt");
    expect(html).toContain("decision-snapshot-energy-2026-01");
    expect(html).toContain("verbindlicher Repräsentationsauftrag");
    expect(html).toContain("Bezug zu Dossier / Runde / Anlassraum");
    expect(html).toContain("dossier-31");
    expect(html).toContain("round-energie-2026-01");
    expect(html).toContain("anlass-energie-2030");
  });

  it("stays read-only and refuses binding from draft/open processes", async () => {
    const html = await renderMandat();
    const lower = html.toLowerCase();

    expect(lower).toContain("öffentlich lesbar und read-only");
    expect(lower).toContain("entwurf, laufende debatte oder unvollständige abstimmung");
    expect(lower).toContain("nur ein gültig abgeschlossener entscheidungssnapshot");
    expect(html).toContain("supportsMembershipHandoff: false");
    expect(html).toContain("supportsAutomaticAssignment: false");
    expect(html).toContain("supportsAutomaticBindingFromDraftOrOpenProcess: false");
    expect(html).toContain("supportsMandateEditInPublicSurface: false");
  });

  it("does not present the decision register as owned by VoiceOpenGov", async () => {
    const html = await renderMandat();
    const lower = html.toLowerCase();

    expect(lower).not.toContain("voiceopengov mandatsregister");
    expect(lower).not.toContain("spricht für eine partei");
  });

  it("keeps legacy links resolving to the canonical decision record", async () => {
    const html = await renderMandat("vog-mandat-001");
    expect(html).toContain("decision-snapshot-energy-2026-01");
  });
});
