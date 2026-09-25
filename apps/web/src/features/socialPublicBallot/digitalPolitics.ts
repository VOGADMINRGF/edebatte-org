export const DIGITAL_POLITICS_BALLOT_ID = "social-digital-politics-01";

export type DigitalPoliticsQuestion = {
  id: string;
  title: string;
  options: string[];
  note?: string;
};

export const DIGITAL_POLITICS_QUESTIONS: DigitalPoliticsQuestion[] = [
  {
    id: "use-edebatte",
    title:
      "Würdest du eDebatte nutzen, um dich zu politischen oder gesellschaftlichen Themen zu informieren, Argumente zu vergleichen und deine eigene Position einzubringen?",
    options: [
      "Ja, regelmäßig",
      "Ja, bei Themen, die mich direkt betreffen",
      "Vielleicht, ich würde es erst ausprobieren",
      "Eher nicht",
      "Nein",
    ],
  },
  {
    id: "motivation",
    title: "Was wäre für dich der wichtigste Grund, eDebatte zu nutzen?",
    options: [
      "Eigene Stimme zu konkreten Themen sichtbar machen",
      "Argumente und Quellen vergleichen",
      "Vorschläge oder Lösungen einbringen",
      "Ergebnisse und politische Reaktionen nachvollziehen",
      "Ich sehe für mich aktuell keinen Nutzen",
    ],
  },
  {
    id: "barriers",
    title:
      "Was würde dich am ehesten davon abhalten, eine digitale Beteiligungsplattform zu nutzen?",
    options: [
      "Zweifel, ob meine Stimme wirklich etwas bewirkt",
      "Datenschutz oder Schutz meiner Identität",
      "Sorge vor Manipulation oder Mehrfachstimmen",
      "Zu viel Aufwand oder zu komplizierte Bedienung",
      "Nichts davon / andere Gründe",
    ],
  },
  {
    id: "between-elections",
    title:
      "Sollte es mehr digitale Möglichkeiten geben, politische Positionen auch zwischen Wahlen sichtbar zu machen?",
    options: [
      "Ja, deutlich mehr",
      "Ja, als Ergänzung zu bestehenden Verfahren",
      "Nur bei bestimmten Themen oder Ebenen",
      "Eher nicht",
      "Nein",
    ],
  },
  {
    id: "issues-not-camps",
    title:
      "Wie wichtig wäre es dir, bei einzelnen Sachfragen Position beziehen zu können, ohne dich dauerhaft einer politischen Richtung oder einem Gesamtprogramm zuzuordnen?",
    options: [
      "Sehr wichtig",
      "Eher wichtig",
      "Unentschieden",
      "Eher unwichtig",
      "Unwichtig",
    ],
  },
  {
    id: "trust",
    title:
      "Welche Voraussetzung wäre für dein Vertrauen in eine Plattform wie eDebatte am wichtigsten?",
    options: [
      "Transparente Regeln und nachvollziehbare Auswertung",
      "Schutz vor Manipulation und Mehrfachstimmen",
      "Nachprüfbare Quellen und sichtbare Gegenpositionen",
      "Datenschutz und Kontrolle über eigene Daten",
      "Sichtbar machen, was aus Ergebnissen tatsächlich geworden ist",
    ],
  },
  {
    id: "impact",
    title: "Was sollte mit den Ergebnissen einer solchen Beteiligung passieren?",
    options: [
      "Sie sollten zunächst nur ein öffentliches Meinungsbild zeigen",
      "Politik und Verwaltung sollten sie sichtbar zur Kenntnis nehmen",
      "Verantwortliche sollten öffentlich darauf reagieren",
      "Sie sollten bei geeigneten Themen in Entscheidungen einfließen",
      "Ich sehe keinen sinnvollen politischen Einsatz",
    ],
  },
  {
    id: "citizen-organizations",
    title:
      "Wie stehst du zu Bürgerinitiativen oder Organisationen, die ihre Positionen transparent an den Ergebnissen offener Beteiligungsplattformen wie eDebatte orientieren?",
    options: [
      "Würde ich grundsätzlich unterstützen",
      "Interessant, aber nur mit klaren Regeln und Transparenz",
      "Ich würde erst sehen wollen, wie das praktisch funktioniert",
      "Eher skeptisch",
      "Lehne ich ab",
    ],
    note:
      "VoiceOpenGov ist ein Beispiel für einen solchen Ansatz. Die Frage setzt keine Zustimmung zu VoiceOpenGov voraus.",
  },
];

export function findDigitalPoliticsQuestion(questionId: string) {
  return DIGITAL_POLITICS_QUESTIONS.find((question) => question.id === questionId) ?? null;
}
