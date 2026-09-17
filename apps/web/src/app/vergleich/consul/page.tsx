import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. CONSUL Democracy – Wo demokratische Beteiligung beginnt";
const DESCRIPTION = "CONSUL ermöglicht Debatten, Bürgerproposals und partizipative Prozesse. eDebatte setzt noch früher an: beim ungeklärten Anliegen, Evidenzbedarf und gemeinsamen Problemverständnis.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/consul", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Startpunkt", platform: "Debatte, Bürgerproposal oder eingerichteter Beteiligungsprozess", edebatte: "Anliegen, Problem, Beobachtung, offene Frage oder Quelle – auch ohne fertigen Vorschlag" },
  { dimension: "Bürgerinitiative", platform: "Bürger können eigene Proposals und Debatten einbringen und Unterstützung mobilisieren", edebatte: "Ebenso citizen-first; zusätzlich soll die Phase vor dem Proposal strukturiert werden können" },
  { dimension: "Problemdefinition", platform: "Gegenstand oder Vorschlag ist typischerweise bereits als Debatte oder Proposal benannt", edebatte: "Problem, Ursachen, Quellenbedarf und offene Fragen dürfen selbst Teil der gemeinsamen Klärung sein" },
  { dimension: "Evidenz", platform: "Informationen und Diskussionen können den Beteiligungsprozess begleiten", edebatte: "Claims, Quellen, Evidenzen, Widersprüche und Unsicherheiten sollen als persistenter Debattenstand verbunden bleiben" },
  { dimension: "Anschluss", platform: "Stark für formelle und kommunale bzw. institutionelle Partizipationsmechanismen", edebatte: "Soll Themen von lokal bis global an unterschiedliche Institutionen und Verfahren anschlussfähig machen" },
];

export default function ConsulComparisonPage() {
  return <ComparisonPage platformName="CONSUL Democracy" eyebrow="Open-source participatory democracy" headline="eDebatte vs. CONSUL Democracy: Der Unterschied beginnt vor dem Proposal." intro="CONSUL Democracy ist weit mehr als ein Umfragetool. Bürgerinnen und Bürger können Debatten eröffnen, Proposals einbringen und in partizipativen Prozessen mitwirken. eDebatte darf deshalb nicht behaupten, nur hier könnten Themen aus der Gesellschaft kommen." fairNote="CONSUL besitzt bereits echte Bottom-up-Mechanismen. Die belastbare Differenzierung liegt darin, dass eDebatte auch ein noch ungeklärtes Signal aufnehmen und Problemdefinition, Evidenzbedarf und Alternativenbildung selbst zum demokratischen Prozess machen will." rows={rows} coreQuestion="Was passiert, bevor jemand schon weiß, welches Proposal er stellen möchte?" coreExplanation="Viele gesellschaftliche Probleme beginnen nicht als sauber formulierte Forderung. Vielleicht gibt es nur eine Beobachtung, widersprüchliche Daten oder das Gefühl, dass bestehende Optionen am Problem vorbeigehen. eDebatte soll genau diesen Vorraum strukturieren, ohne daraus automatisch eine Forderung oder Wahrheit zu machen." closingHeadline="CONSUL demokratisiert Proposals und Beteiligungsprozesse. eDebatte will zusätzlich den öffentlichen Problem- und Evidenzraum vor dem Proposal organisieren." closingBody="Ein gesellschaftlich gereiftes Thema kann anschließend in CONSUL, ein parlamentarisches Verfahren, eine Verwaltung, eine Initiative oder einen anderen institutionellen Prozess übergehen. Der Anschluss ist Teil des Zielbilds, nicht ein Wettbewerbsbruch." />;
}