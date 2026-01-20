export type Lang = "de" | "en";

export function normalizeLang(input?: string | null): Lang {
  const value = (input || "").toLowerCase();
  if (value.startsWith("en")) return "en";
  return "de";
}

export const LANDING_COPY: Record<
  Lang,
  {
    brand: string;
    headline: {
      line1Lead: string;
      line1Accent: string;
      line1Tail: string;
      line2Lead: string;
      line2Accent: string;
      line2Mid: string;
      line2AccentB: string;
      line2Tail: string;
    };
    subline: string;
    inputLabel: string;
    placeholder: string;
    buttons: {
      start: string;
      starting: string;
      save: string;
      contextMore: string;
      contextLess: string;

      howItWorks: string;
      origin: string;
      dossier: string;
    };
    live: {
      scoreTitle: string;
      scoreHint: string;
      typeLabels: { question: string; vote: string; topic: string };
      stanceLabels: { pro: string; contra: string; neutral: string };
      scopeLabels: { world: string; eu: string; country: string; region: string; unknown: string };
      scoreLabels: { veryClear: string; clear: string; ok: string; unclear: string };
      hints: { empty: string; short: string; long: string };
      wordCount: (count: number) => string;
    };
    context: {
      title: string;
      description: string;
      roleLabel: string;
      levelLabel: string;
      roles: string[];
      roleOtherLabel: string;
      roleOtherPlaceholder: string;
      levels: string[];
      labelPrefix: string;
    };
    preview: {
      title: string;
      fallback: string;
      cards: { vote: string; dossier: string; questions: string };
      empty: string;
      draftStatus: string;
    };
    errors: {
      checkUnavailable: string;
      botBlocked: string;
    };
    cards: {
      participants: string;
      votes: string;
      activeAgo: (hours: number) => string;
      detailsOpen: string;
      swipe: string;
      kindVote: string;
      kindTopic: string;
    };
  }
> = {
  de: {
    brand: "eDebatte",
    headline: {
      line1Lead: "Deine",
      line1Accent: "Meinung",
      line1Tail: "zählt.",
      line2Lead: "Gib deiner",
      line2Accent: "Stimme",
      line2Mid: "ein neues",
      line2AccentB: "Gewicht",
      line2Tail: "!",
    },
    subline:
      "Teile deine Ansicht per Text, Spracheingabe oder mit Links/Anhängen. Community-getragen: Wir machen Kontext, Argumente und Evidenz sichtbar – für mehr Konsens statt Lagerdenken.",
    inputLabel: "Beschreibe dein Anliegen",
    placeholder:
      "Demo-Modus: Deine Eingabe geht aktuell direkt an unser Team (noch nicht öffentlich, da noch nicht gehostet). Formuliere eine konkrete Frage oder Aussage – gern mit Link/Quelle …",
    buttons: {
      start: "Einreichen",
      starting: "Sende …",
      save: "Speichern",
      contextMore: "Mehr Kontext",
      contextLess: "Kontext ausblenden",
      howItWorks: "So funktioniert's!",
      origin: "Woher kommt's!",
      dossier: "Das Dossier",
    },
    live: {
      scoreTitle: "Formulierungs-Score",
      scoreHint: "Je konkreter, desto höher. Bewertet die Gesamtaussage, Frage/Antrag und Begründung.",
      typeLabels: { question: "Frage", vote: "Abstimmung", topic: "Debattenpunkt" },
      stanceLabels: { pro: "Pro", contra: "Contra", neutral: "Neutral" },
      scopeLabels: { world: "Welt", eu: "EU", country: "Land", region: "Region", unknown: "nicht erkannt" },
      scoreLabels: { veryClear: "sehr klar", clear: "klar", ok: "ok", unclear: "unscharf" },
      hints: {
        empty: "Schreib eine konkrete Aussage oder Frage – dann können wir den Score einschätzen.",
        short: "Tipp: Nenne Maßnahme + Ziel (z. B. „Tempo 30 vor Schulen“).",
        long: "Tipp: Wer ist betroffen? Woran messen wir Wirkung?",
      },
      wordCount: (count) => `${count} Wörter erkannt.`,
    },
    context: {
      title: "Kontext (optional)",
      description: "Hilf uns, Sichtweisen, Adressat und Bewertung besser einzuordnen – nur wenn du möchtest.",
      roleLabel: "Rolle",
      levelLabel: "Ebene",
      roles: ["Bürger:in", "Zivilgesellschaft", "Verwaltung", "Journalismus"],
      roleOtherLabel: "Sonstiges",
      roleOtherPlaceholder: "Rolle ergänzen",
      levels: ["Kommune", "Land", "Bund", "EU", "Welt"],
      labelPrefix: "Kontext",
    },
    preview: {
      title: "Nächster Schritt",
      fallback: "Fallback-Analyse",
      cards: { vote: "Option abstimmen", dossier: "Dossier öffnen", questions: "Fragen klären" },
      empty: "Noch keine Vorschau – starte den Schnell-Check.",
      draftStatus: "Draft wird erstellt …",
    },
    errors: {
      checkUnavailable: "Check ist gerade nicht möglich.",
      botBlocked: "Bitte Feld leer lassen – Eingabe wurde blockiert.",
    },
    cards: {
      participants: "Teiln.",
      votes: "Votes",
      activeAgo: (hours) => `aktiv vor ${hours}h`,
      detailsOpen: "Details öffnen",
      swipe: "Wischen",
      kindVote: "Abstimmung",
      kindTopic: "Debattenpunkt",
    },
  },

  en: {
    brand: "eDebatte",
    headline: {
      line1Lead: "Your",
      line1Accent: "opinion",
      line1Tail: "matters.",
      line2Lead: "Give your",
      line2Accent: "voice",
      line2Mid: "new",
      line2AccentB: "weight",
      line2Tail: "!",
    },
    subline:
      "Share your view via text, voice, or by attaching links/files. Community-driven: we connect context, arguments, and evidence — aiming for consensus over polarization.",
    inputLabel: "Describe your topic",
    placeholder:
      "Demo mode: your input currently goes directly to our team (not public yet, not hosted). Write a clear question or statement — links/sources welcome …",
    buttons: {
      start: "Submit",
      starting: "Submitting …",
      save: "Save",
      contextMore: "More context",
      contextLess: "Hide context",
      howItWorks: "How it works",
      origin: "Where it comes from",
      dossier: "The dossier",
    },
    live: {
      scoreTitle: "Clarity score",
      scoreHint: "Higher is clearer. Based on the overall statement, request/question, and reasoning cues.",
      typeLabels: { question: "Question", vote: "Vote", topic: "Debate point" },
      stanceLabels: { pro: "Pro", contra: "Contra", neutral: "Neutral" },
      scopeLabels: { world: "World", eu: "EU", country: "Country", region: "Region", unknown: "unknown" },
      scoreLabels: { veryClear: "very clear", clear: "clear", ok: "ok", unclear: "unclear" },
      hints: {
        empty: "Write a concrete claim or question so we can estimate clarity.",
        short: "Tip: Name a measure + goal (e.g. “Speed limit 30 near schools”).",
        long: "Tip: Who is affected? How do we measure impact?",
      },
      wordCount: (count) => `${count} words detected.`,
    },
    context: {
      title: "Context (optional)",
      description: "Help us understand perspectives, audience, and evaluation.",
      roleLabel: "Role",
      levelLabel: "Level",
      roles: ["Citizen", "Civil society", "Administration", "Journalism"],
      roleOtherLabel: "Other",
      roleOtherPlaceholder: "Add role",
      levels: ["Municipality", "State", "Federal", "EU", "World"],
      labelPrefix: "Context",
    },
    preview: {
      title: "Next step",
      fallback: "Fallback analysis",
      cards: { vote: "Prepare vote", dossier: "Open dossier", questions: "Clarify questions" },
      empty: "No preview yet — run the quick check.",
      draftStatus: "Creating draft …",
    },
    errors: {
      checkUnavailable: "Quick check is not available right now.",
      botBlocked: "Please leave the hidden field empty. Submission blocked.",
    },
    cards: {
      participants: "Part.",
      votes: "Votes",
      activeAgo: (hours) => `active ${hours}h ago`,
      detailsOpen: "Open details",
      swipe: "Swipe",
      kindVote: "Vote",
      kindTopic: "Debate point",
    },
  },
};

const BUCKET_LABELS: Record<string, { de: string; en: string }> = {
  WORLD: { de: "WORLD", en: "WORLD" },
  EU: { de: "EU", en: "EU" },
  NACHBARLÄNDER: { de: "NACHBARLÄNDER", en: "NEIGHBORS" },
  NEIGHBORS: { de: "NACHBARLÄNDER", en: "NEIGHBORS" },
  HEIMATLAND: { de: "HEIMATLAND", en: "HOME COUNTRY" },
  HOME_COUNTRY: { de: "HEIMATLAND", en: "HOME COUNTRY" },
  "BUNDESLAND / BUNDESSTAAT": { de: "BUNDESLAND / BUNDESSTAAT", en: "STATE / FEDERAL STATE" },
  HOME_REGION: { de: "BUNDESLAND / BUNDESSTAAT", en: "STATE / FEDERAL STATE" },
  "WAHLKREIS / KOMMUNE": { de: "WAHLKREIS / KOMMUNE", en: "DISTRICT / MUNICIPALITY" },
  HOME_LOCAL: { de: "WAHLKREIS / KOMMUNE", en: "DISTRICT / MUNICIPALITY" },
};

export function labelForBucket(label: string, lang: Lang) {
  const entry = BUCKET_LABELS[label] || BUCKET_LABELS[label.toUpperCase()];
  return entry ? entry[lang] : label;
}

const BUCKET_HINTS: Record<string, { de: string; en: string }> = {
  WORLD: { de: "Adressat: global", en: "Scope: global" },
  EU: { de: "Adressat: EU-Ebene", en: "Scope: EU level" },
  NACHBARLÄNDER: { de: "Adressat: Nachbarstaaten", en: "Scope: neighbors" },
  NEIGHBORS: { de: "Adressat: Nachbarstaaten", en: "Scope: neighbors" },
  HEIMATLAND: { de: "Adressat: Bundesebene", en: "Scope: national" },
  HOME_COUNTRY: { de: "Adressat: Bundesebene", en: "Scope: national" },
  "BUNDESLAND / BUNDESSTAAT": { de: "Adressat: Landesebene", en: "Scope: state" },
  HOME_REGION: { de: "Adressat: Landesebene", en: "Scope: state" },
  "WAHLKREIS / KOMMUNE": { de: "Adressat: kommunal", en: "Scope: local" },
  HOME_LOCAL: { de: "Adressat: kommunal", en: "Scope: local" },
};

export function hintForBucket(label: string, lang: Lang) {
  const entry = BUCKET_HINTS[label] || BUCKET_HINTS[label.toUpperCase()];
  return entry ? entry[lang] : "";
}
