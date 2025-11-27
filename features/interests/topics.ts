export type TopicKey =
  | "democracy"
  | "budget"
  | "economy"
  | "social"
  | "education"
  | "health"
  | "climate"
  | "energy"
  | "mobility"
  | "interior"
  | "justice"
  | "migration"
  | "digital"
  | "europe"
  | "local";

export type TopicChoice = { key: TopicKey; label: string };

export const TOPIC_CHOICES: TopicChoice[] = [
  { key: "democracy", label: "Demokratie & Wahlen" },
  { key: "budget", label: "Haushalt & Finanzen" },
  { key: "economy", label: "Wirtschaft & Arbeit" },
  { key: "social", label: "Soziales & Familie" },
  { key: "education", label: "Bildung & Forschung" },
  { key: "health", label: "Gesundheit & Pflege" },
  { key: "climate", label: "Klima & Umwelt" },
  { key: "energy", label: "Energie & Infrastruktur" },
  { key: "mobility", label: "Mobilität & Stadtentwicklung" },
  { key: "interior", label: "Inneres & Sicherheit" },
  { key: "justice", label: "Justiz & Recht" },
  { key: "migration", label: "Migration & Integration" },
  { key: "digital", label: "Digitalisierung & Medien" },
  { key: "europe", label: "Europa & Außenpolitik" },
  { key: "local", label: "Kommunales & Lebensumfeld" },
];

export const TOPIC_LABEL_BY_KEY: Record<TopicKey, string> = Object.fromEntries(
  TOPIC_CHOICES.map((topic) => [topic.key, topic.label]),
) as Record<TopicKey, string>;
