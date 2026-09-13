import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. Make.org – Mass Participation und gesellschaftliche Agenda";
const DESCRIPTION = "Make.org skaliert Konsultationen und Vorschläge auf Millionen. eDebatte setzt früher an: bei der offenen Problemklärung und einem persistenten gesellschaftlichen Debattenstand.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/make-org", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Startpunkt", platform: "Große Konsultation oder Dialog mit einer gesetzten Leitfrage", edebatte: "Anliegen oder Signal kann vor einer gemeinsamen Leitfrage entstehen" },
  { dimension: "Massenskalierung", platform: "Sehr starke Sammlung, Voting- und Priorisierungsmechanik für große Teilnehmerzahlen", edebatte: "Skalierung soll mit Evidenz, Problemstruktur und nachvollziehbarem Debattenstand verbunden werden" },
  { dimension: "Output", platform: "Prioritäten, Konsens- und Konfliktfelder sowie konkrete Vorschläge", edebatte: "Problemdefinition, Quellenlage, Widersprüche, Optionen, Prioritäten und institutioneller Anschluss als zusammenhängender Lebenszyklus" },
  { dimension: "Projektlogik", platform: "Konsultationen und Dialoge sind typischerweise thematisch oder organisatorisch eingerahmt", edebatte: "Themen sollen institutionenübergreifend persistent weiterleben können" },
  { dimension: "Rolle der Institution", platform: "Öffentliche Institutionen, NGOs oder Partner initiieren und nutzen groß angelegte Beteiligungsprojekte", edebatte: "Institutionen sind wichtige Partner, aber nicht zwingend Voraussetzung für den ersten gesellschaftlichen Impuls" },
];

export default function MakeOrgComparisonPage() {
  return <ComparisonPage platformName="Make.org" eyebrow="Mass participation & collective priorities" headline="eDebatte vs. Make.org: Nicht nur Millionen Antworten strukturieren – sondern früher klären, welche Frage gesellschaftlich trägt." intro="Make.org gehört zu den international sichtbarsten Plattformen für großflächige Konsultationen, Vorschläge und Priorisierung. Seine Stärke ist Reichweite und das Erkennen dessen, was Menschen verbindet oder trennt." fairNote="Make.org ist kein einfaches Umfragetool und arbeitet ebenfalls an KI, Deliberation und demokratischen Commons. eDebatte differenziert sich deshalb über den früheren, persistenten Problem- und Evidenzraum – nicht über Voting oder KI." rows={rows} coreQuestion="Was passiert, bevor eine millionenfach skalierte Leitfrage gestellt wird?" coreExplanation="Eine große Konsultation kann nur so gut sein wie ihr Framing. eDebatte soll es ermöglichen, dieses Framing selbst gesellschaftlich zu entwickeln: Problem, Evidenz, Gegenperspektiven und Alternativen werden sichtbar, bevor eine einzelne Leitfrage den Raum vorgibt." closingHeadline="Make.org skaliert Beteiligung. eDebatte will zusätzlich das gesellschaftliche Framing davor und das Wissen danach dauerhaft verbinden." closingBody="Damit entsteht perspektivisch eine komplementäre Rolle: offene gesellschaftliche Problemklärung vor einer groß angelegten Konsultation – und ein nachvollziehbares demokratisches Gedächtnis nach ihr." />;
}