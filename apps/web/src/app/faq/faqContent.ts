export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  label: string;
  faqs: FaqItem[];
};

export const FAQ_HOW_IT_WORKS_STEPS = [
  {
    title: "Frage verstehen",
    subtitle: "Worum geht es?",
    description: "Du siehst die konkrete Frage und den bekannten Kontext. Kommst du über einen Link oder QR-Code, landest du direkt dort.",
    badge: "1",
  },
  {
    title: "Mitmachen",
    subtitle: "Was möchtest du beitragen?",
    description: "Je nach Frage kannst du abstimmen, eine eigene Perspektive ergänzen, Gründe nennen, Erfahrungen teilen oder eine Quelle beitragen.",
    badge: "2",
  },
  {
    title: "Gemeinsames Bild",
    subtitle: "Was ist klar, strittig oder noch offen?",
    description: "eDebatte soll nicht bei Prozentzahlen enden. Beiträge, Quellen, Widersprüche und offene Punkte helfen beim nächsten sinnvollen Schritt.",
    badge: "3",
  },
];

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "grundlagen",
    label: "Grundlagen",
    faqs: [
      {
        id: "grundlagen-1",
        question: "Was ist eDebatte?",
        answer: "eDebatte ist ein Werkzeug, mit dem Menschen Fragen gemeinsam klären können. Der Einstieg ist bewusst einfach: mitmachen oder selbst etwas starten. Danach können neben Stimmen auch Gründe, neue Vorschläge, Erfahrungen, Quellen und offene Fragen sichtbar werden.",
      },
      {
        id: "grundlagen-2",
        question: "Ist eDebatte nur ein Umfrage-Tool?",
        answer: "Nein. Eine Abstimmung ist der einfachste Einstieg. Entscheidend ist, dass danach sichtbar werden kann, warum Menschen so antworten, welche Alternativen fehlen, welche Quellen vorliegen und was noch ungeklärt ist.",
      },
      {
        id: "grundlagen-3",
        question: "Ist eDebatte eine Partei?",
        answer: "Nein. eDebatte ist eine Beteiligungs- und Wissensinfrastruktur. Sie soll von unterschiedlichen Menschen, Gruppen und Organisationen genutzt werden können, ohne deren politische Position vorzugeben.",
      },
      {
        id: "grundlagen-4",
        question: "Was passiert, wenn ich über einen QR-Code oder Link komme?",
        answer: "Wenn der Link bereits zu einer konkreten Frage oder einem Thema gehört, sollst du direkt dort landen und sofort sehen, was du tun kannst. Ein unnötiger Umweg über eine allgemeine Startseite ist nicht das Ziel.",
      },
    ],
  },
  {
    id: "mitmachen",
    label: "Mitmachen",
    faqs: [
      {
        id: "mitmachen-1",
        question: "Was kann ich beitragen?",
        answer: "Je nach Kontext kannst du abstimmen, eine eigene Antwort oder Alternative vorschlagen, einen Grund nennen, Erfahrung teilen, eine Quelle oder einen Hinweis einreichen, eine offene Frage beantworten oder auf einen möglichen Fehler hinweisen.",
      },
      {
        id: "mitmachen-2",
        question: "Muss ich dafür angemeldet sein?",
        answer: "Lesen und öffentliche Beteiligung sollen dort, wo es der jeweilige Kontext erlaubt, möglichst niedrigschwellig sein. Für Beiträge, die dauerhaft deinem Arbeitsstand zugeordnet oder weiterbearbeitet werden müssen, kann eine Anmeldung erforderlich sein. Danach sollst du in denselben Kontext zurückkehren.",
      },
      {
        id: "mitmachen-3",
        question: "Was mache ich, wenn eine Quelle fehlt?",
        answer: "Genau dafür soll eDebatte direkte Mitwirkung ermöglichen. Wenn eine Lücke sichtbar ist, soll die passende Handlung ebenfalls sichtbar sein – zum Beispiel Quelle hinzufügen, Erfahrung beitragen oder offene Frage beantworten.",
      },
      {
        id: "mitmachen-4",
        question: "Kann ich widersprechen oder eine andere Perspektive ergänzen?",
        answer: "Ja. Unterschiedliche Perspektiven und begründete Gegenpositionen gehören zum Kern. Das Ziel ist nicht, Widerspruch wegzumoderieren, sondern ihn nachvollziehbar einzuordnen.",
      },
    ],
  },
  {
    id: "starten",
    label: "Etwas starten",
    faqs: [
      {
        id: "starten-1",
        question: "Wie starte ich eine eigene Frage?",
        answer: "Du formulierst zuerst nur die Frage. Danach wählst du, wie Menschen antworten sollen, legst bei Bedarf Startantworten fest und entscheidest bewusst, ob Voxy unterstützen soll. Weitere Einstellungen kommen erst danach.",
      },
      {
        id: "starten-2",
        question: "Muss ich feste Antwortmöglichkeiten vorgeben?",
        answer: "Für klassische Abstimmungen kannst du feste Antworten vorgeben und eigene Beiträge zulassen. Ein eigener Modus für vollständig offene Beiträge ist als nächster Produktschritt vorgesehen und wird nicht als fertig behauptet, solange der öffentliche Vertrag dafür noch nicht vollständig umgesetzt ist.",
      },
      {
        id: "starten-3",
        question: "Wird etwas automatisch veröffentlicht?",
        answer: "Nein. Das Erstellen einer Frage oder die Unterstützung durch Voxy bedeutet nicht, dass etwas automatisch öffentlich wird. Veröffentlichung und Freigaben bleiben bewusste Schritte.",
      },
    ],
  },
  {
    id: "wissen",
    label: "Quellen & Wissen",
    faqs: [
      {
        id: "wissen-1",
        question: "Was zeigt ein Dossier?",
        answer: "Ein Dossier bündelt den aktuellen Stand zu einer Frage: Was wissen wir schon? Woher wissen wir das? Welche Erfahrungen und Gegenpositionen gibt es? Was ist noch offen?",
      },
      {
        id: "wissen-2",
        question: "Entscheidet eDebatte, was wahr ist?",
        answer: "Nein. Tatsachen werden nicht per Abstimmung wahr oder falsch. eDebatte soll Quellen, Unsicherheiten und Widersprüche sichtbar machen, damit Menschen nachvollziehen können, worauf eine Aussage beruht.",
      },
      {
        id: "wissen-3",
        question: "Was macht Voxy?",
        answer: "Voxy kann optional dabei helfen, vorhandenes Wissen, wiederkehrende Perspektiven oder offene Punkte sichtbar zu machen. Voxy soll nicht selbst veröffentlichen oder für Menschen entscheiden.",
      },
    ],
  },
  {
    id: "datenschutz",
    label: "Datenschutz & Kontrolle",
    faqs: [
      {
        id: "datenschutz-1",
        question: "Entstehen persönliche politische Profile?",
        answer: "Das ist nicht das Ziel. Gemeinsames Lernen soll anonymisiert und zusammengefasst erfolgen. Persönliche Rohantworten sollen nicht zu individuellen politischen Profilen zusammengeführt werden.",
      },
      {
        id: "datenschutz-2",
        question: "Kann KI meine Inhalte automatisch verändern oder veröffentlichen?",
        answer: "Nein. KI-Unterstützung ist optional. Vorschläge müssen nachvollziehbar bleiben und Veröffentlichung bleibt eine bewusste menschliche Entscheidung.",
      },
    ],
  },
  {
    id: "kosten",
    label: "Kosten",
    faqs: [
      {
        id: "kosten-1",
        question: "Kann ich eDebatte kostenlos nutzen?",
        answer: "Der öffentliche Einstieg und kleine echte Beteiligungen sollen kostenlos möglich sein. Kostenpflichtige Angebote sollen zusätzliche professionelle Arbeitsleistung finanzieren – nicht Wahrheit, Sichtbarkeit, Stimmengewicht oder bessere politische Ergebnisse.",
      },
      {
        id: "kosten-2",
        question: "Wofür kann es später kostenpflichtige Angebote geben?",
        answer: "Zum Beispiel für umfangreichere professionelle Arbeitsabläufe, Organisationen oder die strukturierte Verarbeitung großer Dokumente. Technische Anbieter-, Token- oder interne Kostenlogik ist dabei nicht die Sprache, die normale Nutzer verstehen müssen.",
      },
    ],
  },
];
