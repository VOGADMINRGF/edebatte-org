import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. adhocracy+ – Beteiligungsprojekte und öffentlicher Problemraum";
const DESCRIPTION =
  "adhocracy+ bietet Organisationen modulare Beteiligungsprojekte für Ideen, Debatten, Umfragen und Priorisierung. eDebatte will zusätzlich gesellschaftliche Anliegen vor einem bereits eingerichteten Projekt strukturieren.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/vergleich/adhocracy-plus",
    title: TITLE,
    description: DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

const rows = [
  {
    dimension: "Startpunkt",
    platform: "Eine Organisation richtet einen Bereich und ein Beteiligungsprojekt ein und wählt passende Module",
    edebatte: "Auch ein einzelnes ungeklärtes gesellschaftliches Signal soll der Startpunkt sein können, bevor ein Projekt existiert",
  },
  {
    dimension: "Bürgerideen",
    platform: "Teilnehmende können in mehreren Modulen eigene Ideen einbringen, diskutieren und bewerten",
    edebatte: "Ebenso citizen-first; zusätzlich soll die Phase vor der Idee als Problemklärung demokratisch strukturiert werden",
  },
  {
    dimension: "Prozesslogik",
    platform: "Starke modulare Werkzeuge für Brainstorming, Debatte, Textreview, Umfragen, Challenges, Budgets und Priorisierung",
    edebatte: "Ein durchgängiger Lebenszyklus soll Signal, Sensemaking, Evidenz, Optionen, Deliberation, Anschluss und Erinnerung verbinden",
  },
  {
    dimension: "Evidenz",
    platform: "Informationen, Texte und Diskussionen können Teil des Projekts sein; Claim-/Quelle-/Gegenbeleg-Logik ist nicht der zentrale Kern",
    edebatte: "Aussagen, Quellen, Gegenbelege, Unsicherheiten und offene Fragen sollen als persistente Wissensobjekte verbunden bleiben",
  },
  {
    dimension: "Dauerhaftigkeit",
    platform: "Mehrere Beteiligungsprojekte können in einem Organisationsbereich kombiniert und betrieben werden",
    edebatte: "Debattenwissen soll zusätzlich über einzelne Projekte, Institutionen, Regionen und Wahlperioden hinweg anschlussfähig bleiben",
  },
];

export default function AdhocracyPlusComparisonPage() {
  return (
    <ComparisonPage
      platformName="adhocracy+"
      eyebrow="Open-source participation projects"
      headline="eDebatte vs. adhocracy+: Nicht mehr Beteiligungsmodule – sondern ein anderer Anfangspunkt."
      intro="adhocracy+ deckt viele klassische Beteiligungsformate bereits sehr breit ab: Ideen, strukturierte Debatten, Textkommentierung, Umfragen, Priorisierung und Bürgerhaushalte. eDebatte sollte deshalb nicht über eine längere Feature-Liste positioniert werden."
      fairNote="adhocracy+ erlaubt echte Ideenbeteiligung und komplexe Prozesse. Die belastbare Abgrenzung liegt nicht bei Diskussion oder Voting, sondern darin, dass eDebatte den öffentlichen Problem- und Evidenzraum bereits vor einem eingerichteten Organisationsprojekt zum Produktkern machen will."
      rows={rows}
      coreQuestion="Was passiert mit einem Anliegen, wenn noch niemand ein Beteiligungsprojekt dafür eingerichtet hat?"
      coreExplanation="adhocracy+ ist stark, sobald eine Organisation weiß, welchen Beteiligungsprozess sie durchführen möchte. eDebatte will früher ansetzen: Ein Mensch soll ein Anliegen einbringen können, während Thema, Problemdefinition, Zuständigkeit, Quellenlage und mögliche Optionen noch offen sind. Erst danach muss entschieden werden, welcher Beteiligungs- oder institutionelle Prozess sinnvoll ist."
      closingHeadline="adhocracy+ organisiert Beteiligungsprojekte. eDebatte will zusätzlich den öffentlichen Reasoning-Layer vor und zwischen solchen Projekten bilden."
      closingBody="Der White Space ist damit kein weiteres Modul, sondern die persistente Verbindung von Anliegen, Problemklärung, Evidenz, Alternativen und späterem institutionellen Anschluss. Gerade weil adhocracy+ die klassischen Beteiligungsformate bereits gut abdeckt, muss eDebatte diese andere Schicht konsequent sichtbar machen."
    />
  );
}
