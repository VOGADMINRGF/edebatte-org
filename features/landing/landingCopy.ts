export type Lang = "de" | "en";

export function normalizeLang(input?: string | null): Lang {
  const value = (input || "").toLowerCase();
  if (value.startsWith("en")) return "en";
  return "de";
}

type LandingCopy = {
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
    contextMore: string;
    contextLess: string;
    howItWorks: string;
    origin: string;
    dossier: string;
  };
  form: {
    attachmentsLabel: string;
    attachmentsHint?: string;
    humanLabel: string;
    humanQuestion: (a: number, b: number) => string;
    humanPlaceholder: string;
    contextAny: string;
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
  };
  modal: {
    title: string;
    text: string;
    discountHint: string;
    ctaAnother: string;
    ctaMember: string;
    ctaSupport: string;
    closeLabel: string;
  };
  errors: {
    botBlocked: string;
    textTooShort: string;
    humanInvalid: string;
    submitFailed: string;
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
};

export const LANDING_COPY: Record<Lang, LandingCopy> = {
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
      "Demo-Brücke: Reiche Themen, Fragen oder Aussagen ein (optional mit Anhängen). Wir sammeln erst einmal alles sauber ein und prüfen redaktionell — bevor später Funktionen Schritt für Schritt live gehen.",
    inputLabel: "Beschreibe dein Anliegen",
    placeholder:
      "Schreibe eine konkrete Frage oder Aussage (gern mit Kontext/Link/Quelle). Beispiel: “Soll X geändert werden — und welche Folgen hätte das?”",
    buttons: {
      start: "Kostenfrei einreichen",
      starting: "Sendet …",
      contextMore: "Mehr Kontext",
      contextLess: "Kontext ausblenden",
      howItWorks: "So funktioniert’s",
      origin: "Worum geht’s",
      dossier: "Faktencheck (Dossier)",
    },
    form: {
      attachmentsLabel: "Anhänge (optional)",
      attachmentsHint: "Mehrere Dateien möglich (Meta wird gespeichert).",
      humanLabel: "Human-Check (Spam-Schutz)",
      humanQuestion: (a, b) => `Wie viel ist ${a} + ${b}?`,
      humanPlaceholder: "Antwort",
      contextAny: "Keine Angabe",
    },
    context: {
      title: "Kontext (optional)",
      description:
        "Hilf uns, Perspektive, Adressat und Ebene besser einzuordnen (nur wenn du möchtest).",
      roleLabel: "Rolle",
      levelLabel: "Ebene",
      roles: ["Bürger:in", "Zivilgesellschaft", "Verwaltung", "Journalismus", "Organisation"],
      roleOtherLabel: "Sonstiges",
      roleOtherPlaceholder: "Rolle ergänzen",
      levels: ["Kommune", "Land", "Bund", "EU", "Welt"],
    },
    modal: {
      title: "Danke — Beitrag ist eingegangen.",
      text: "Wir prüfen redaktionell vor Freigabe. Du hilfst uns, Prioritäten sichtbar zu machen.",
      discountHint:
        "Vorbestellung: 15% Rabatt • Vorkasse: +10% • 2 Jahre: zusätzlich +5% (günstigstes Paket).",
      ctaAnother: "Noch etwas einreichen",
      ctaMember: "Mitglied werden",
      ctaSupport: "Vorbestellen / Pricing",
      closeLabel: "Dialog schließen",
    },
    errors: {
      botBlocked: "Bitte das versteckte Feld leer lassen — Eingabe wurde blockiert.",
      textTooShort: "Bitte mindestens 20 Zeichen schreiben.",
      humanInvalid: "Human-Check stimmt nicht.",
      submitFailed: "Senden fehlgeschlagen. Bitte erneut versuchen.",
    },
    cards: {
      participants: "Geteilt",
      votes: "Votes",
      activeAgo: (hours) => `aktiv vor ${hours}h`,
      detailsOpen: "Details öffnen",
      swipe: "Wischen",
      kindVote: "",
      kindTopic: "",
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
      "Demo bridge: submit topics, questions, or statements (attachments optional). We collect first, review editorially, then open features step by step.",
    inputLabel: "Describe your topic",
    placeholder:
      "Write a clear question or statement (context/links welcome). Example: “Should X change — and what would the consequences be?”",
    buttons: {
      start: "Submit for free",
      starting: "Submitting …",
      contextMore: "More context",
      contextLess: "Hide context",
      howItWorks: "How it works",
      origin: "What it is",
      dossier: "Fact check (Dossier)",
    },
    form: {
      attachmentsLabel: "Attachments (optional)",
      attachmentsHint: "Multiple files allowed (metadata stored).",
      humanLabel: "Human check (anti-spam)",
      humanQuestion: (a, b) => `What is ${a} + ${b}?`,
      humanPlaceholder: "Answer",
      contextAny: "No preference",
    },
    context: {
      title: "Context (optional)",
      description:
        "Help us understand perspective, audience, and level (only if you want).",
      roleLabel: "Role",
      levelLabel: "Level",
      roles: ["Citizen", "Civil society", "Administration", "Journalism", "Organization"],
      roleOtherLabel: "Other",
      roleOtherPlaceholder: "Add role",
      levels: ["Municipality", "State", "Federal", "EU", "World"],
    },
    modal: {
      title: "Thanks — contribution received.",
      text: "We review editorially before release. You help make priorities visible.",
      discountHint:
        "Pre-order: 15% off • Prepaid: +10% • 2 years: additional +5% (best deal).",
      ctaAnother: "Submit another",
      ctaMember: "Become a member",
      ctaSupport: "Pre-order / Pricing",
      closeLabel: "Close dialog",
    },
    errors: {
      botBlocked: "Please keep the hidden field empty. Submission blocked.",
      textTooShort: "Please write at least 20 characters.",
      humanInvalid: "Human check is incorrect.",
      submitFailed: "Submission failed. Please try again.",
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
  WORLD: { de: "WORLD ALLES RUND UMS WELTGESCHEHEN", en: "WORLD" },
  EU: { de: "EU-WEITE PERSPEKTIVE", en: "EU" },
  NACHBARLÄNDER: { de: "NACHBARLÄNDER", en: "NEIGHBORS" },
  NEIGHBORS: { de: "NACHBARLÄNDER", en: "NEIGHBORS" },
  HEIMATLAND: { de: "HEIMATLAND", en: "HOME COUNTRY" },
  HOME_COUNTRY: { de: "HEIMATLAND", en: "HOME COUNTRY" },
  "BUNDESLAND / BUNDESSTAAT": { de: "BUNDESLAND / BUNDESSTAAT", en: "STATE / FEDERAL STATE" },
  "WAHLKREIS / KOMMUNE": { de: "WAHLKREIS / KOMMUNE", en: "DISTRICT / MUNICIPALITY" },
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
  "WAHLKREIS / KOMMUNE": { de: "Adressat: kommunal", en: "Scope: local" },
};

export function hintForBucket(label: string, lang: Lang) {
  const entry = BUCKET_HINTS[label] || BUCKET_HINTS[label.toUpperCase()];
  return entry ? entry[lang] : "";
}
