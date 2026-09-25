import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RundenShareActions from "@/app/runden/RundenShareActions";

describe("runden qr participation language contract", () => {
  it("uses participation-first wording for link + QR actions", () => {
    const html = renderToStaticMarkup(
      <RundenShareActions
        share={{
          contextKind: "runde",
          primaryTargetKind: "round_operating_target",
          canonicalTarget: "/round/mobilitaet?anlassraumId=65f000000000000000000401",
          qrTarget: "/round/mobilitaet?anlassraumId=65f000000000000000000401",
          shareTitle: "Mobilität Innenstadt",
          sharePrompt: "Laufenden Anlass teilen",
          shareSummary: "Zusammenfassung",
          socialCandidate: false,
          needsReviewBeforeOfficialSocial: true,
        }}
      />,
    );

    expect(html).toContain("Teilnahmekontext: Runde");
    expect(html).toContain("Teilnahmelink kopieren");
    expect(html).toContain("Teilnahme per QR öffnen");
    expect(html).toContain("Teilnahme teilen");
    expect(html).toContain("Teile diesen Anlassraum mit Nachbarn, Freunden oder deiner Initiative.");
    expect(html).toContain("Nutze den QR-Code für Bürgerdialoge, Veranstaltungen oder Workshops.");
    expect(html).toContain("Link, Share und QR erscheinen erst nach einer bewussten sichtbaren Freigabe.");
    expect(html).toContain("Wird der Anlass pausiert, geschlossen oder archiviert");
    expect(html).toContain("Sichtbar heißt nicht automatisch geprüft oder amtlich.");
    expect(html).toContain("Wird Sichtbarkeit zurückgenommen, pausiert, geschlossen oder archiviert, verschwindet auch dieser öffentliche Link- und QR-Pfad wieder.");
    expect(html).toContain("Amtliche Antworten und Freigaben bleiben verifizierten Rollen vorbehalten.");

    expect(html).not.toContain("Link kopieren");
    expect(html).not.toContain("QR bereitstellen");
    expect(html).not.toContain(">Teilen<");
  });
});
