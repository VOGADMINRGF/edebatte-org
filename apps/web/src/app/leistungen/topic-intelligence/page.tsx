import type { Metadata } from "next";
import ProfessionalServiceDetail from "@/features/home/ProfessionalServiceDetail";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "Politisches Themenmonitoring & Topic Intelligence | eDebatte";
const DESCRIPTION =
  "Politische und gesellschaftliche Themen fortlaufend beobachten: neue Quellen, Positionen, Entwicklungen, Gegenargumente und offene Fragen strukturiert einordnen.";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/leistungen/topic-intelligence",
  title: TITLE,
  description: DESCRIPTION,
});

export default function TopicIntelligencePage() {
  return (
    <ProfessionalServiceDetail
      serviceId="topic-intelligence"
      eyebrow="Topic Intelligence"
      headline="Politische Themen beobachten, ohne im Nachrichtenstrom unterzugehen."
      intro="eDebatte hält einen priorisierten Themenstand aktuell und ordnet neue Entwicklungen danach ein, was sich tatsächlich verändert hat: Quellen, Positionen, Argumente, politische Optionen und offene Fragen."
      bullets={[
        "Laufenden Themenstand statt lose Link- und Pressespiegel-Sammlung pflegen.",
        "Neue Quellen und Positionen in den vorhandenen Kontext einordnen.",
        "Widersprüche, Unsicherheiten und relevante Veränderungen sichtbar machen.",
        "Regelmäßige Updates als Grundlage für interne Briefings und Entscheidungen bereitstellen.",
      ]}
      useCases={[
        "Politisches Monitoring für Public Affairs, Verbände oder Geschäftsführung.",
        "Frühzeitige Einordnung regulatorischer oder gesellschaftlicher Entwicklungen.",
        "Fortlaufende redaktionelle Themenbeobachtung mit nachvollziehbarem Quellenstand.",
        "Mehrere Stakeholder-Perspektiven über längere Zeit vergleichen.",
      ]}
    />
  );
}
