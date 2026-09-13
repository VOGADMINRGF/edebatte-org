import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. aula – Ideenbeteiligung und gesellschaftliche Problemklärung";
const DESCRIPTION =
  "aula ermöglicht Ideen, Diskussion und Abstimmung in vereinbarten Beteiligungsräumen. eDebatte will zusätzlich den offenen Problem- und Evidenzraum vor einem festgelegten Beteiligungsrahmen strukturieren.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/vergleich/aula",
    title: TITLE,
    description: DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

const rows = [
  {
    dimension: "Startpunkt",
    platform: "Idee oder Vorschlag innerhalb eines zuvor vereinbarten Beteiligungsraums",
    edebatte: "Auch Beobachtung, Problem, offene Frage oder Quelle ohne fertige Idee und ohne vorgegebenes Verfahren",
  },
  {
    dimension: "Rahmen",
    platform: "Beteiligungsvertrag und Rollen klären, worüber und mit welcher Verbindlichkeit mitentschieden werden kann",
    edebatte: "Der erste gesellschaftliche Impuls soll nicht davon abhängen, dass eine Institution bereits einen Beteiligungsraum eröffnet hat",
  },
  {
    dimension: "Gemeinsame Entwicklung",
    platform: "Nutzer können Ideen einbringen, diskutieren und in Abstimmungen entscheiden, welche weiterverfolgt werden",
    edebatte: "Problemdefinition, Evidenzbedarf, Gegenpositionen, offene Fragen und Handlungsoptionen sollen vor der Priorisierung verbunden werden",
  },
  {
    dimension: "Evidenz",
    platform: "Argumente und Diskussion können Ideen inhaltlich verbessern; ein persistenter Claim-/Quellen-/Unsicherheitsgraph ist nicht der Produktkern",
    edebatte: "Claims, Quellen, Gegenbelege und Unsicherheiten sollen als prüfbarer Debattenstand erhalten bleiben",
  },
  {
    dimension: "Anschluss",
    platform: "Stark für konkrete Gemeinschaften wie Schulen oder andere klar definierte Beteiligungsräume",
    edebatte: "Soll gesellschaftliche Themen über lokale, regionale, nationale und weitere institutionelle Ebenen hinweg anschlussfähig halten",
  },
];

export default function AulaComparisonPage() {
  return (
    <ComparisonPage
      platformName="aula"
      eyebrow="Digitale Mitbestimmung in definierten Beteiligungsräumen"
      headline="eDebatte vs. aula: Die Lücke liegt nicht bei Ideen oder Voting – sondern vor dem Beteiligungsraum."
      intro="aula ist funktional näher an eDebatte, als ein oberflächlicher Vergleich vermuten lässt: Nutzerinnen und Nutzer können Ideen einbringen, diskutieren, weiterentwickeln und darüber abstimmen. Deshalb wäre es falsch, eDebatte über diese Funktionen abzugrenzen."
      fairNote="aula besitzt echte Bottom-up-Ideenbeteiligung innerhalb eines vereinbarten Rahmens. Die belastbare Differenz liegt darin, dass eDebatte auch dort beginnen will, wo noch kein Beteiligungsvertrag, kein Projekt und noch nicht einmal ein fertiger Lösungsvorschlag existiert."
      rows={rows}
      coreQuestion="Wer eröffnet den Raum, bevor eine Idee überhaupt zur abstimmungsfähigen Idee geworden ist?"
      coreExplanation="Viele gesellschaftliche Anliegen starten als Beobachtung, Konflikt, Quelle oder diffuse Unzufriedenheit. aula organisiert sehr gut, was innerhalb eines legitimierten Beteiligungsraums mit Ideen geschieht. eDebatte will zusätzlich den vorgelagerten öffentlichen Klärungsraum strukturieren: Was ist das Problem, welche Evidenz fehlt, welche Perspektiven widersprechen sich und welche Optionen entstehen daraus?"
      closingHeadline="aula demokratisiert Entscheidungen in einem vereinbarten Beteiligungsraum. eDebatte will zusätzlich den offenen gesellschaftlichen Problemraum davor organisieren."
      closingBody="Die Systeme müssen deshalb nicht als reine Gegensätze gedacht werden. Ein in eDebatte gereiftes Thema könnte später in einen schulischen, kommunalen oder organisatorischen Beteiligungsraum übergehen. Der White Space liegt in der vorgelagerten, evidenzgebundenen Problemklärung und ihrer dauerhaften Anschlussfähigkeit."
    />
  );
}
