import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. wer|denkt|was – Vor dem Beteiligungsverfahren beginnen";
const DESCRIPTION = "wer|denkt|was unterstützt Kommunen und Institutionen bei Bürgerbeteiligung. eDebatte beginnt früher: beim gesellschaftlichen Anliegen, bevor Verfahren und Lösungsrahmen feststehen.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/werdenktwas", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Ausgangspunkt", platform: "Institutionelles Beteiligungsvorhaben, Konsultation, Befragung, Bürgerbudget oder anderes Verfahren", edebatte: "Anliegen, Frage, Missstand, Beobachtung oder Quelle aus der Gesellschaft" },
  { dimension: "Rolle der Bürger", platform: "Teilnehmende innerhalb eines angebotenen Beteiligungsraums; je nach Verfahren auch mit Vorschlägen und Bewertungen", edebatte: "Mitinitiierende der Problemdefinition, Evidenzsuche, Alternativenbildung und späteren Priorisierung" },
  { dimension: "Dienstleistung", platform: "Software, Konzeption, Moderation, Aktivierung und Auswertung für Institutionen", edebatte: "Öffentliche Infrastruktur mit professionellen institutionellen Anschluss- und Operatorpfaden" },
  { dimension: "Open Source", platform: "Arbeitet unter anderem mit CONSUL und weiteren Open-Source-Lösungen", edebatte: "Differenzierung liegt nicht im verwendeten Beteiligungsframework, sondern im citizen-first Reasoning-Lebenszyklus" },
  { dimension: "Ergebnis", platform: "Aufbereitete Ergebnisse für Verwaltung, Politik oder Auftraggeber", edebatte: "Nachvollziehbarer gesellschaftlicher Debattenstand plus mögliche Übergabe an zuständige Institutionen" },
];

export default function WerdenktwasComparisonPage() {
  return <ComparisonPage platformName="wer|denkt|was" eyebrow="Institutional participation services" headline="eDebatte vs. wer|denkt|was: Der entscheidende Unterschied liegt vor dem Beteiligungsverfahren." intro="wer|denkt|was verbindet Beteiligungssoftware mit Beratung und Umsetzung für Kommunen, Länder und Institutionen. Das ist ein anderer Ausgangspunkt als eine öffentliche Infrastruktur, die beim einzelnen gesellschaftlichen Anliegen beginnt." fairNote="Auch klassische Beteiligungsdienstleister können Bürgerideen, Kommentare und Abstimmungen ermöglichen. eDebatte darf seinen Unterschied deshalb nicht an diesen Funktionen festmachen, sondern an Problemklärung, Evidenz, Alternativen und der institutionenunabhängigen Entstehung einer Agenda." rows={rows} coreQuestion="Wer definiert den Beteiligungsraum – und was geschieht, bevor er existiert?" coreExplanation="Bei eDebatte soll eine gesellschaftliche Frage bereits vor einem beauftragten oder administrativ eingerichteten Prozess strukturiert werden können. Erst danach muss entschieden werden, welcher institutionelle, politische oder zivilgesellschaftliche Anschluss sinnvoll ist." closingHeadline="wer|denkt|was baut starke Brücken zwischen Institutionen und Bürgern. eDebatte will zusätzlich den öffentlichen Raum bauen, aus dem gesellschaftliche Agenden überhaupt erst entstehen können." closingBody="Gerade deshalb muss der Markt nicht nur als Konkurrenz betrachtet werden. Institutionelle Beteiligungsdienstleister können später genau dort relevant werden, wo ein gesellschaftlich entwickeltes Thema in ein formelles Verfahren überführt werden soll." />;
}