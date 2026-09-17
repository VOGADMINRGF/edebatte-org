import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MandatDetailPage from "@/app/mandat/[id]/page";

async function renderMandat(id = "responsibility-record-001") {
  const element = await MandatDetailPage({
    params: Promise.resolve({ id }),
  });
  return renderToStaticMarkup(element);
}

describe("/mandat/[id] read-only public surface", () => {
  it("renders neutral responsibility identity, authority and references", async () => {
    const html = await renderMandat();

    expect(html).toContain("eDebatte Verantwortungsregister");
    expect(html).toContain("Verantwortungsgegenstand");
    expect(html).toContain("Autorisierung");
    expect(html).toContain("Aussteller");
    expect(html).toContain("Bezug zu Dossier / Runde / Anlassraum");
    expect(html).toContain("dossier-31");
    expect(html).toContain("round-energie-2026-01");
    expect(html).toContain("anlass-energie-2030");
    expect(html).toContain("Herkunft / Provenienz");
    expect(html).toContain("Letzte Aktualisierung");
    expect(html).toContain("Transparenzhinweis");
  });

  it("stays explicitly read-only and refuses authority derivation", async () => {
    const html = await renderMandat();
    const lower = html.toLowerCase();

    expect(lower).toContain("öffentlich lesbar und read-only");
    expect(lower).toContain("keine bearbeitungsfunktion");
    expect(lower).toContain("keine automatische zuordnung");
    expect(lower).toContain("keine automatische mitgliedschaftsübernahme");
    expect(lower).toContain("keine automatische ableitung von mandaten oder weisungen");
    expect(html).toContain("supportsMembershipHandoff: false");
    expect(html).toContain("supportsAutomaticAssignment: false");
    expect(html).toContain("supportsAuthorityDerivationFromEDebatte: false");
    expect(html).toContain("supportsMandateEditInPublicSurface: false");
  });

  it("does not present the register as owned by VoiceOpenGov", async () => {
    const html = await renderMandat();
    const lower = html.toLowerCase();

    expect(lower).not.toContain("voiceopengov mandatsregister");
    expect(lower).not.toContain("vog-mandat-");
    expect(lower).not.toContain("dossier_round_outcome");
    expect(lower).not.toContain("spricht für eine partei");
  });
});
