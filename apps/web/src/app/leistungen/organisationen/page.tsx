import type { Metadata } from "next";
import ProfessionalServiceDetail from "@/features/home/ProfessionalServiceDetail";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "Politische Analyse für Verbände, Redaktionen & Organisationen | eDebatte";
const DESCRIPTION =
  "Strukturierte politische Analyse, Decision Dossiers, Themenmonitoring und individuelle Workflows für Redaktionen, Verbände, NGOs, Agenturen und Organisationen.";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/leistungen/organisationen",
  title: TITLE,
  description: DESCRIPTION,
});

export default function OrganisationenPage() {
  return (
    <ProfessionalServiceDetail
      serviceId="white-label"
      eyebrow="Für Organisationen"
      headline="Decision Intelligence in bestehende Arbeitsabläufe integrieren."
      intro="Für Redaktionen, Agenturen, Verbände und größere Organisationen lässt sich eDebatte als individuell abgestimmte Analyse- und Beteiligungsleistung einsetzen – mit menschlicher Freigabe und nachvollziehbarem Evidenzstand."
      bullets={[
        "Themenumfang, Team-Workflow und Ausgabefrequenz gemeinsam festlegen.",
        "Decision Dossiers und Topic Intelligence in bestehende Briefing- und Review-Prozesse einpassen.",
        "Exporte, Partnerdarstellung und wiederkehrende Auswertungen abgestimmt bereitstellen.",
        "Quellen- und Evidenzstandard unabhängig von gewünschter Position oder Auftraggeberinteresse erhalten.",
      ]}
      useCases={[
        "Redaktionelle Recherche- und Hintergrundprozesse.",
        "Public-Affairs- und Stakeholder-Monitoring.",
        "Verbandsarbeit mit mehreren Fachthemen und Gremien.",
        "Agentur- oder Beratungskontexte mit wiederkehrenden Kundenbriefings.",
      ]}
    />
  );
}
