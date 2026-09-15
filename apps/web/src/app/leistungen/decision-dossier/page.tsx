import type { Metadata } from "next";
import ProfessionalServiceDetail from "@/features/home/ProfessionalServiceDetail";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "Decision Dossier: politische Themen strukturiert analysieren | eDebatte";
const DESCRIPTION =
  "Ein komplexes politisches oder gesellschaftliches Thema als nachvollziehbare Entscheidungsgrundlage mit Quellen, Positionen, Alternativen und Auswirkungen aufbereiten.";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/leistungen/decision-dossier",
  title: TITLE,
  description: DESCRIPTION,
});

export default function DecisionDossierPage() {
  return (
    <ProfessionalServiceDetail
      serviceId="decision-dossier"
      eyebrow="Decision Dossier"
      headline="Politische und gesellschaftliche Themen strukturiert analysieren."
      intro="Wenn ein Thema komplex, widersprüchlich oder politisch aufgeladen ist, bringt eDebatte die entscheidungsrelevanten Informationen in eine nachvollziehbare Struktur – ohne eine gewünschte Schlussfolgerung vorzugeben."
      bullets={[
        "Ausgangslage und zentrale Fragestellung verständlich zusammenführen.",
        "Quellen, belastbare Belege, Positionen und Gegenpositionen sichtbar trennen.",
        "Alternativen, mögliche Auswirkungen und offene Unsicherheiten strukturiert darstellen.",
        "Handlungsoptionen als Entscheidungsgrundlage aufbereiten, nicht als automatisierte Entscheidung.",
      ]}
      useCases={[
        "Vorstands- oder Geschäftsführungsbriefing zu einem politischen Thema.",
        "Hintergrundrecherche für Redaktion, Verband, NGO oder Beratung.",
        "Vorbereitung einer Position, Anhörung, Strategie- oder Gremienentscheidung.",
        "Vergleich unterschiedlicher Lösungswege oder internationaler Ansätze.",
      ]}
    />
  );
}
