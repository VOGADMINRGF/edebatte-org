import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. CrowdInsights – Beteiligungsprojekt oder gesellschaftliche Willensbildung?";
const DESCRIPTION = "CrowdInsights organisiert Beteiligungsprojekte für Kommunen und Organisationen. eDebatte setzt früher an: bei gesellschaftlichen Anliegen, Evidenz, Optionen und Agenda-Entstehung.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/crowdinsights", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Startpunkt", platform: "Kommune oder Organisation eröffnet ein Beteiligungsprojekt mit Thema und Format", edebatte: "Gesellschaftliches Anliegen oder offene Frage kann vor einem institutionellen Projekt entstehen" },
  { dimension: "Kernstärke", platform: "Projektkonfiguration, Beiträge, Karten, Umfragen, Voting, Moderation, Auswertung und Ergebnisdarstellung", edebatte: "Problemdefinition, Evidenz, Widersprüche, Alternativen, Priorisierung und anschlussfähiger Debattenstand" },
  { dimension: "KI", platform: "Nachvollziehbare Analyse, Extraktion, Clustering und Insights für Beteiligungsbeiträge", edebatte: "KI soll zusätzlich bei Research, Quellenbezug, Problemstruktur und Lösungsalternativen unterstützen – menschlich kontrolliert" },
  { dimension: "Rolle der Verwaltung", platform: "Typischer Betreiber und Auswerter des Beteiligungsraums", edebatte: "Wichtiger Wissens- und Umsetzungspartner, aber nicht zwingend Initiator des Themas" },
  { dimension: "Lebenszyklus", platform: "Beteiligungsprojekt und dessen Ergebnisse", edebatte: "Persistenter gesellschaftlicher Themen- und Debattenstand über einzelne Verfahren hinaus" },
];

export default function CrowdInsightsComparisonPage() {
  return <ComparisonPage platformName="CrowdInsights" eyebrow="Participation project platform" headline="eDebatte vs. CrowdInsights: Beteiligung organisieren oder schon davor gesellschaftliche Fragen entwickeln?" intro="CrowdInsights ist eine leistungsfähige Plattform für Kommunen und Organisationen, die konkrete Beteiligungsprojekte planen, durchführen, moderieren und auswerten wollen. Gerade deshalb ist die Abgrenzung zu eDebatte weniger eine Feature-Frage als eine Frage des Startpunkts." fairNote="CrowdInsights deckt viele Funktionen ab, die eDebatte nicht als USP reklamieren sollte: Ideen, Kommentare, Voting, Karten, Auswertung und nachvollziehbare KI-Unterstützung. Der Unterschied muss vor dem Projekt beginnen." rows={rows} coreQuestion="Muss zuerst ein institutionelles Beteiligungsprojekt existieren?" coreExplanation="eDebatte soll ein gesellschaftliches Anliegen bereits davor aufnehmen können. Problem, Quellenlage und mögliche Lösungsräume können gemeinsam entstehen, bevor eine Kommune oder Organisation daraus ein formelles Beteiligungsverfahren macht." closingHeadline="CrowdInsights digitalisiert Beteiligungsprojekte. eDebatte will zusätzlich gesellschaftliche Problem- und Willensbildung vor und zwischen solchen Projekten verbinden." closingBody="Damit können die Systeme langfristig sogar komplementär sein: eDebatte als gesellschaftlicher Problem- und Evidenzraum, eine etablierte Beteiligungsplattform als institutioneller Prozess- und Umsetzungskanal." />;
}