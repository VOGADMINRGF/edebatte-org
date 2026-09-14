import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. Go Vocal / CitizenLab – Community Engagement neu gedacht";
const DESCRIPTION = "Go Vocal ist stark in Community Engagement und öffentlicher Entscheidungsbeteiligung. eDebatte beginnt davor: bei gesellschaftlicher Problemklärung, Evidenz und Agenda-Entstehung.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/govocal", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Primärer Betreiber", platform: "Regierungen, Kommunen und Organisationen organisieren Engagement-Initiativen und Projekte", edebatte: "Der einzelne Mensch und sein Anliegen bilden den öffentlichen Ausgangspunkt; Institutionen können später anschließen" },
  { dimension: "Startpunkt", platform: "Projekt, Policy-Frage, Engagement-Initiative, Umfrage oder Beteiligungsformat", edebatte: "Noch ungeklärtes Problem, Beobachtung, Frage, Erfahrung oder Quelle" },
  { dimension: "Stärke", platform: "Community Engagement, Co-Creation, Surveys, Mapping, Priorisierung und Auswertung", edebatte: "Problemdefinition, Evidenzbezug, Alternativenbildung, Debattenstand und institutionenübergreifende Anschlussfähigkeit" },
  { dimension: "Skalierung", platform: "Globale GovTech-/Community-Engagement-Plattform mit starkem institutionellem Einsatz", edebatte: "Themen sollen sachlich von lokal bis global skalieren können, unabhängig davon, wer einen Beteiligungsraum beauftragt" },
  { dimension: "Gedächtnis", platform: "Engagement wird im Kontext von Projekten und Entscheidungsprozessen verwaltet", edebatte: "Ziel ist ein persistenter gesellschaftlicher Wissens- und Debattenstand über Projekte und Wahlperioden hinweg" },
];

export default function GoVocalComparisonPage() {
  return <ComparisonPage platformName="Go Vocal / CitizenLab" eyebrow="Community & government engagement" headline="eDebatte vs. Go Vocal: Nicht nur Menschen in Entscheidungen einbeziehen – sondern gesellschaftliche Fragen früher entstehen lassen." intro="Go Vocal ist international stark darin, Regierungen und Organisationen mit Communities zu verbinden und Beteiligung in reale Entscheidungsprozesse einzubauen. Genau deshalb wäre es falsch, den Unterschied an Umfragen, Ideen oder KI festzumachen." fairNote="Go Vocal ist ein reifes Engagement-Produkt mit globaler Reichweite. eDebatte setzt einen anderen öffentlichen Ausgangspunkt: Die gesellschaftliche Problemklärung soll nicht erst als Projekt einer Institution beginnen müssen." rows={rows} coreQuestion="Wer muss zuerst ein Projekt eröffnen, damit aus einem Problem Beteiligung wird?" coreExplanation="eDebatte soll die Abhängigkeit vom institutionellen Projektstart reduzieren. Ein Thema kann aus der Gesellschaft entstehen, strukturiert werden und erst später mit der zuständigen Kommune, Regierung, Organisation oder anderen Akteuren verbunden werden." closingHeadline="Go Vocal verbindet Institutionen mit Communities. eDebatte will zusätzlich Communities befähigen, die Agenda selbst vorzubereiten." closingBody="Das ist kein Entweder-oder. Eine institutionelle Engagement-Plattform kann ein hervorragender Anschlusskanal sein, wenn Problem, Evidenz, Alternativen und gesellschaftliche Prioritäten zuvor bereits nachvollziehbar entstanden sind." />;
}