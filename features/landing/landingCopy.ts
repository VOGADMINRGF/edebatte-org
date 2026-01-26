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
    attach: string;
    voice: string;
    voiceComingSoon: string;
    voiceStart: string;
    voiceStop: string;
  };
  form: {
    attachmentsLabel: string;
    attachmentsHint?: string;
    attachmentsRules: string;
    attachmentsTotal: (size: string) => string;
    attachmentsWarn: string;
    humanLabel: string;
    humanQuestion: (a: number, b: number) => string;
    humanPlaceholder: string;
    humanRefresh: string;
    contextAny: string;
    minCharsHint: (remaining: number) => string;
    minCharsOk: string;
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
    ctaAnother: string;
    ctaMember: string;
    ctaSupport: string;
    closeLabel: string;
  };
  errors: {
    botBlocked: string;
    textTooShort: string;
    humanMissing: string;
    humanInvalid: string;
    submitFailed: string;
    attachmentsTooMany: (maxFiles: number) => string;
    attachmentsTooLarge: string;
    attachmentsFileTooLarge: (name: string) => string;
    voiceUnsupported: string;
    voiceFailed: string;
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
      "Teile deine Ansicht per Text oder mit Links/Anhängen. Aktuell prüfen wir jeden Beitrag redaktionell vor Freigabe – danke, dass du uns beim Aufbau unterstützt.",
    inputLabel: "Beschreibe dein Anliegen",
    placeholder:
      "Demo-Modus: Deine Eingabe landet direkt bei uns (noch nicht öffentlich). Formuliere eine konkrete Aussage oder Frage – gern mit Link/Quelle ...",
    buttons: {
      start: "Einreichen",
      starting: "Sendet ...",
      contextMore: "Mehr Kontext",
      contextLess: "Kontext ausblenden",
      howItWorks: "So funktioniert's",
      origin: "Die Bewegung",
      dossier: "Dossier & Faktencheck",
      attach: "Anhang",
      voice: "Stimme",
      voiceComingSoon: "Sprachaufnahme kommt bald",
      voiceStart: "Sprachaufnahme starten",
      voiceStop: "Sprachaufnahme stoppen",
    },
    form: {
      attachmentsLabel: "Anhänge",
      attachmentsHint: "Mehrere Dateien möglich.",
      attachmentsRules: "Max. 5 Dateien, je 8 MB (gesamt 20 MB).",
      attachmentsTotal: (size) => `Gesamt: ${size}`,
      attachmentsWarn: "Achtung: fast am Limit.",
      humanLabel: "Human-Check",
      humanQuestion: (a, b) => `Wie viel ist ${a} + ${b}?`,
      humanPlaceholder: "Antwort",
      humanRefresh: "Neue Aufgabe",
      contextAny: "Keine Angabe",
      minCharsHint: (remaining) => `Noch ${remaining} Zeichen`,
      minCharsOk: "Danke! Mindestlänge erreicht.",
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
    },
    modal: {
      title: "Danke! Beitrag ist eingegangen.",
      text: "Wir prüfen jeden Beitrag redaktionell vor Freigabe. (Demo-Brücke: noch ohne öffentliche Veröffentlichung.)",
      ctaAnother: "Noch einen Beitrag senden",
      ctaMember: "Mitglied werden",
      ctaSupport: "Vorbestellen / unterstützen",
      closeLabel: "Dialog schließen",
    },
    errors: {
      botBlocked: "Bitte das versteckte Feld leer lassen – Eingabe wurde blockiert.",
      textTooShort: "Bitte mindestens 20 Zeichen schreiben.",
      humanMissing: "Bitte Human-Check ausfüllen.",
      humanInvalid: "Human-Check stimmt nicht.",
      submitFailed: "Senden fehlgeschlagen. Bitte erneut versuchen.",
      attachmentsTooMany: (maxFiles) => `Bitte maximal ${maxFiles} Dateien auswählen.`,
      attachmentsTooLarge: "Anhänge zu groß (max. 20 MB gesamt).",
      attachmentsFileTooLarge: (name) => `Datei zu groß: ${name} (max. 8 MB).`,
      voiceUnsupported: "Sprachaufnahme wird in diesem Browser nicht unterstützt.",
      voiceFailed: "Sprachaufnahme ist fehlgeschlagen. Bitte erneut versuchen.",
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
      "Share your view via text or by attaching links/files. For now, we review every submission editorially before release — thanks for helping us build.",
    inputLabel: "Describe your topic",
    placeholder:
      "Demo mode: your input goes directly to our team (not public yet). Write a clear question or statement — links/sources welcome ...",
    buttons: {
      start: "Submit",
      starting: "Submitting ...",
      contextMore: "More context",
      contextLess: "Hide context",
      howItWorks: "How it works",
      origin: "The movement",
      dossier: "Dossier & fact check",
      attach: "Attach",
      voice: "Voice",
      voiceComingSoon: "Voice input coming soon",
      voiceStart: "Start voice input",
      voiceStop: "Stop voice input",
    },
    form: {
      attachmentsLabel: "Attachments",
      attachmentsHint: "Multiple files allowed.",
      attachmentsRules: "Max 5 files, 8 MB each (20 MB total).",
      attachmentsTotal: (size) => `Total: ${size}`,
      attachmentsWarn: "Warning: close to limit.",
      humanLabel: "Human check",
      humanQuestion: (a, b) => `What is ${a} + ${b}?`,
      humanPlaceholder: "Answer",
      humanRefresh: "New challenge",
      contextAny: "No preference",
      minCharsHint: (remaining) => `${remaining} characters to go`,
      minCharsOk: "Thanks! Minimum length reached.",
    },
    context: {
      title: "Context (optional)",
      description: "Help us understand perspective, audience, and evaluation (optional).",
      roleLabel: "Role",
      levelLabel: "Level",
      roles: ["Citizen", "Civil society", "Administration", "Journalism"],
      roleOtherLabel: "Other",
      roleOtherPlaceholder: "Add role",
      levels: ["Municipality", "State", "Federal", "EU", "World"],
    },
    modal: {
      title: "Thanks! Contribution received.",
      text: "We review every submission before publishing. (Demo bridge: not public yet.)",
      ctaAnother: "Send another",
      ctaMember: "Become a member",
      ctaSupport: "Pre-order / support",
      closeLabel: "Close dialog",
    },
    errors: {
      botBlocked: "Please leave the hidden field empty. Submission blocked.",
      textTooShort: "Please write at least 20 characters.",
      humanMissing: "Please fill the human check.",
      humanInvalid: "Human check is incorrect.",
      submitFailed: "Submission failed. Please try again.",
      attachmentsTooMany: (maxFiles) => `Please select no more than ${maxFiles} files.`,
      attachmentsTooLarge: "Attachments too large (max 20 MB total).",
      attachmentsFileTooLarge: (name) => `File too large: ${name} (max 8 MB).`,
      voiceUnsupported: "Voice input is not supported in this browser.",
      voiceFailed: "Voice input failed. Please try again.",
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
  HEIMATREGION: { de: "HEIMATREGION", en: "HOME REGION" },
  HOME_REGION: { de: "HEIMATREGION", en: "HOME REGION" },
  "BUNDESLAND / BUNDESSTAAT": { de: "BUNDESLAND / BUNDESSTAAT", en: "STATE / FEDERAL STATE" },
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
  HEIMATREGION: { de: "Adressat: Landesebene", en: "Scope: state" },
  HOME_REGION: { de: "Adressat: Landesebene", en: "Scope: state" },
  "BUNDESLAND / BUNDESSTAAT": { de: "Adressat: Landesebene", en: "Scope: state" },
  "WAHLKREIS / KOMMUNE": { de: "Adressat: kommunal", en: "Scope: local" },
  HOME_LOCAL: { de: "Adressat: kommunal", en: "Scope: local" },
};

export function hintForBucket(label: string, lang: Lang) {
  const entry = BUCKET_HINTS[label] || BUCKET_HINTS[label.toUpperCase()];
  return entry ? entry[lang] : "";
}
