import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. Decidim – Agenda-Setting, Initiativen und Evidenz";
const DESCRIPTION = "Decidim ermöglicht demokratische Prozesse und Bürgerinitiativen. eDebatte setzt noch vor der ausformulierten Initiative an: beim ungeklärten Anliegen und gemeinsamen Problemverständnis.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/decidim", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Startpunkt", platform: "Konfigurierter Beteiligungsraum, Prozess, Assembly, Proposal oder Bürgerinitiative", edebatte: "Anliegen, Beobachtung, Frage oder Quelle – noch bevor eine Initiative oder Forderung formuliert sein muss" },
  { dimension: "Agenda-Setting", platform: "Bürgerinitiativen können Themen auf die Agenda bringen und demokratische Prozesse anstoßen", edebatte: "Agenda-Setting beginnt schon bei Problemklärung: Was ist das Problem, welche Evidenz fehlt und welche Alternativen existieren?" },
  { dimension: "Wissen", platform: "Information, Diskussion, Proposals und Prozessdokumentation sind eng mit Beteiligung verbunden", edebatte: "Claims, Quellen, Evidenzen, Widersprüche und Unsicherheiten sollen als persistenter Debattenstand verbunden bleiben" },
  { dimension: "Organisation", platform: "Framework für Organisationen und Communities, die demokratische Räume und Governance konfigurieren", edebatte: "Öffentliche citizen-first Infrastruktur; institutionelle Räume sind Anschluss- und Spezialpfade, nicht notwendiger Ausgangspunkt" },
  { dimension: "Lebenszyklus", platform: "Stark in demokratischen Prozessen, Initiativen, Assemblies und Governance innerhalb eines Decidim-Kontexts", edebatte: "Signal → Sensemaking → Optionen → Deliberation → institutioneller Anschluss → nachvollziehbares demokratisches Gedächtnis" },
];

export default function DecidimComparisonPage() {
  return <ComparisonPage platformName="Decidim" eyebrow="Participatory democracy framework" headline="eDebatte vs. Decidim: Nicht ob Bürger Agenden setzen dürfen – sondern wie früh die gemeinsame Klärung beginnt." intro="Decidim gehört zu den stärksten internationalen Open-Source-Frameworks für partizipative Demokratie und kennt ausdrücklich Bürgerinitiativen und Agenda-Setting. eDebatte grenzt sich deshalb nicht mit dem falschen Versprechen ab, Bürger könnten nur hier Themen starten." fairNote="Decidim kann deutlich mehr als klassische kommunale Konsultation. Die Differenzierung liegt im Produktkern vor einer ausformulierten Initiative: ungeklärte Anliegen, Evidenzbedarf, Problemdefinition und Alternativenbildung." rows={rows} coreQuestion="Was passiert, bevor aus einem gesellschaftlichen Signal eine Initiative wird?" coreExplanation="Genau dort soll eDebatte einen eigenständigen Raum schaffen. Nicht jede Person startet mit einer fertigen Forderung. Manchmal gibt es zunächst nur einen Missstand, eine Beobachtung, eine widersprüchliche Quelle oder die Vermutung, dass die falsche Frage gestellt wird. Dieser Vorraum wird selbst Teil demokratischer Zusammenarbeit." closingHeadline="Decidim organisiert demokratische Prozesse. eDebatte will zusätzlich den öffentlichen Denk- und Klärungsraum davor persistent machen." closingBody="Beide Ansätze können sich ergänzen: Ein auf eDebatte entstandener, nachvollziehbarer Problem- und Evidenzstand kann später in einen formellen Decidim-Prozess, eine Initiative oder andere institutionelle Verfahren übergehen." />;
}