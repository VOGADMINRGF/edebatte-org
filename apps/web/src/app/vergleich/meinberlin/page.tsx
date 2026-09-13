import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. meinBerlin – Verwaltungsprojekte und citizen-first Agenda-Setting";
const DESCRIPTION =
  "meinBerlin bündelt digitale Beteiligungsprojekte des Landes Berlin. eDebatte will zusätzlich dort beginnen, wo noch kein Verwaltungsprojekt und keine fertige Fragestellung existiert.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/vergleich/meinberlin",
    title: TITLE,
    description: DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

const rows = [
  {
    dimension: "Startpunkt",
    platform: "Beteiligungsprojekt oder Vorhaben, das von Verwaltung bzw. verantwortlichen Projektstellen angelegt wurde",
    edebatte: "Auch ein noch ungeklärtes Anliegen aus der Gesellschaft soll ohne vorhandenes Verfahren starten können",
  },
  {
    dimension: "Mitwirkung",
    platform: "Angemeldete Nutzer können je nach Projekt Ideen einreichen, kommentieren, bewerten, abstimmen, Umfragen beantworten oder Texte bearbeiten",
    edebatte: "Mitwirkung soll zusätzlich Problemdefinition, Evidenzbedarf, Widersprüche und Alternativen vor einer fertigen Fragestellung umfassen",
  },
  {
    dimension: "Agenda",
    platform: "Der Beteiligungskontext wird durch konkrete Berliner Projekte und Verfahren vorstrukturiert",
    edebatte: "Citizen-led Agenda-Setting soll selbst Teil der Plattformlogik sein, ohne Verwaltung als notwendigen Startknopf",
  },
  {
    dimension: "Evidenz",
    platform: "Projektinformationen, Unterlagen, Beiträge und Ergebnisrückmeldungen sind innerhalb des Verfahrens sichtbar",
    edebatte: "Claims, Quellen, Gegenbelege, offene Fragen und Unsicherheiten sollen als dauerhafter Debattenstand miteinander verknüpft werden",
  },
  {
    dimension: "Nach dem Verfahren",
    platform: "Projektstände und Ergebnisse zeigen, was aus Beteiligungsbeiträgen wurde",
    edebatte: "Zusätzlich soll ein institutionsübergreifendes demokratisches Gedächtnis über Projekte und Wahlperioden hinweg entstehen",
  },
];

export default function MeinBerlinComparisonPage() {
  return (
    <ComparisonPage
      platformName="meinBerlin"
      eyebrow="Öffentliche Beteiligungsplattform des Landes Berlin"
      headline="eDebatte vs. meinBerlin: Beteiligung im Verfahren trifft Agenda-Setting vor dem Verfahren."
      intro="meinBerlin ist eine starke öffentliche Beteiligungsplattform: Berlinerinnen und Berliner können sich an konkreten Projekten beteiligen, Ideen einreichen, diskutieren, bewerten, abstimmen und je nach Verfahren weitere Formate nutzen. Genau deshalb sollte eDebatte die Differenz nicht bei klassischen Beteiligungsfunktionen suchen."
      fairNote="meinBerlin macht Beteiligung an Verwaltungsprojekten sichtbar und nachvollziehbar. Der belastbare White Space für eDebatte liegt davor: Ein gesellschaftliches Problem soll schon dann strukturiert werden können, wenn Verwaltung noch kein Projekt, keine Frage und keinen Beteiligungszeitraum definiert hat."
      rows={rows}
      coreQuestion="Was passiert mit einem Berliner Anliegen, bevor es überhaupt ein offizielles Berliner Beteiligungsprojekt gibt?"
      coreExplanation="meinBerlin bündelt und öffnet konkrete Verwaltungsprojekte für Beteiligung. eDebatte will die davorliegende Phase produktisieren: Bürgerinnen und Bürger bringen ein Signal ein, das System hilft bei Thema, Region und Zuständigkeit, verbindet Quellen und Gegenpositionen und entwickelt mit der Gesellschaft mögliche Handlungsoptionen. Ein gereifter Debattenstand kann anschließend an meinBerlin oder andere institutionelle Verfahren anschließen."
      closingHeadline="meinBerlin ist stark im offiziellen Beteiligungsraum. eDebatte will den gesellschaftlichen Klärungsraum davor und dazwischen besetzen."
      closingBody="Gerade im Berliner Kontext ist diese Unterscheidung wichtig: eDebatte sollte meinBerlin nicht ersetzen oder nachbauen. Die Chance liegt darin, offene gesellschaftliche Anliegen früh zu strukturieren und später als nachvollziehbaren, evidenzgebundenen Input an passende Verwaltungs- oder Politikprozesse anschlussfähig zu machen."
    />
  );
}
