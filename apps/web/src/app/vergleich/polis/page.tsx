import type { Metadata } from "next";
import ComparisonPage from "@/features/comparison/ComparisonPage";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte vs. Polis – Computational Democracy und öffentlicher Debattenstand";
const DESCRIPTION = "Polis macht Meinungslandschaften und Konsens in großen Gruppen sichtbar. eDebatte setzt davor und danach an: Problemklärung, Evidenz, Optionen und institutioneller Anschluss.";

export const metadata: Metadata = { ...buildPublicPageMetadata({ path: "/vergleich/polis", title: TITLE, description: DESCRIPTION, ogType: "website" }), title: { absolute: TITLE } };

const rows = [
  { dimension: "Startpunkt", platform: "Eine Conversation wird mit einem Prompt/Thema eröffnet und wächst durch Statements und Reaktionen", edebatte: "Auch der Prompt selbst darf Gegenstand der Klärung sein: Anliegen, Problem, Quelle oder offene Frage können davor liegen" },
  { dimension: "Kernstärke", platform: "Computational mapping von Meinungsgruppen, Konsens und Differenzen bei sehr großer Beteiligung", edebatte: "Verknüpfung von Meinungsbild mit Quellen, Claims, Evidenz, Unsicherheit, Optionen und langfristigem Debattenstand" },
  { dimension: "Deliberation", platform: "Teilnehmende reagieren auf Statements; Muster und gemeinsame Positionen werden sichtbar", edebatte: "Teilnehmende sollen zusätzlich Problemdefinition, Evidenzlage und Lösungsalternativen nachvollziehen und weiterentwickeln können" },
  { dimension: "Output", platform: "Meinungslandschaft, Gruppen, Konsenspunkte und Zusammenfassungen", edebatte: "Öffentlicher Reasoning-Pfad von Signal über Evidenz und Optionen bis Priorisierung und Anschluss" },
  { dimension: "Zeit", platform: "Conversations können lange offen bleiben und dynamisch wachsen", edebatte: "Ziel ist zusätzlich ein themenübergreifendes demokratisches Gedächtnis mit Quellen- und Entscheidungsverlauf" },
];

export default function PolisComparisonPage() {
  return <ComparisonPage platformName="Polis" eyebrow="Computational democracy" headline="eDebatte vs. Polis: Nicht nur sichtbar machen, wo Menschen stehen – sondern auch, wie die Frage, Evidenz und Optionen entstanden sind." intro="Polis ist ein international prägender Ansatz für Computational Democracy: große Gruppen können Statements bewerten, während das System Meinungslandschaften, Gruppen und Konsenspunkte sichtbar macht." fairNote="Polis löst ein anderes und sehr wichtiges Problem: skalierbares Verstehen großer Meinungsräume. eDebatte sollte diese Stärke nicht imitieren, sondern einen breiteren Reasoning-Lebenszyklus darum herum anbieten." rows={rows} coreQuestion="Ist der gesetzte Gesprächsrahmen selbst schon Teil demokratischer Deliberation?" coreExplanation="eDebatte soll vor dem eigentlichen Meinungsraum beginnen können. Wenn noch unklar ist, welches Problem vorliegt, welche Quellen relevant sind oder welche Alternativen fehlen, soll genau diese Klärung öffentlich und nachvollziehbar stattfinden." closingHeadline="Polis kartiert kollektive Meinung. eDebatte will kollektive Problemklärung, Evidenz und Handlungsmöglichkeiten davor und danach verbinden." closingBody="Eine starke Zukunft könnte beide Logiken kombinieren: computational deliberation zur Erkennung gesellschaftlicher Muster – eingebettet in einen persistenten, evidenzbezogenen Debatten- und Entscheidungskontext." />;
}