import { AnalyzeResult } from "./schemas";

type LangKey = "de" | "en";

function normalizeLang(locale?: string): LangKey {
  const value = (locale || "").toLowerCase();
  if (value.startsWith("en")) return "en";
  return "de";
}

const DIMENSION_HINTS: Record<LangKey, Record<string, string>> = {
  de: {
    kosten: "Finanzen",
    euro: "Finanzen",
    steuer: "Finanzen",
    gebuehr: "Finanzen",
    recht: "Recht",
    gesetz: "Recht",
    verbot: "Recht",
    zulassung: "Recht",
    klima: "Klima/Umwelt",
    umwelt: "Klima/Umwelt",
    emission: "Klima/Umwelt",
    betroffene: "Betroffene",
    buerger: "Betroffene",
    schule: "Betroffene",
    pflege: "Betroffene",
    umsetzung: "Umsetzung",
    personal: "Umsetzung",
    team: "Umsetzung",
    werte: "Werte/Fairness",
    gerecht: "Werte/Fairness",
  },
  en: {
    cost: "Finance",
    costs: "Finance",
    tax: "Finance",
    fee: "Finance",
    budget: "Finance",
    law: "Law",
    legal: "Law",
    regulation: "Law",
    ban: "Law",
    climate: "Climate/Environment",
    environment: "Climate/Environment",
    emission: "Climate/Environment",
    affected: "Affected groups",
    citizens: "Affected groups",
    school: "Affected groups",
    care: "Affected groups",
    implementation: "Implementation",
    staff: "Implementation",
    team: "Implementation",
    fairness: "Fairness",
    justice: "Fairness",
    equity: "Fairness",
  },
};

const PARTICIPATION_TEMPLATES: Record<LangKey, Array<(focus: string) => string>> = {
  de: [
    (focus: string) => `Option: Maßnahme umsetzen (${focus || "neutral"})`,
    (focus: string) => `Option: Variante testen (${focus || "Pilot"})`,
    () => "Option: Entscheidung vertagen und Daten sammeln",
    () => "Option: In kleiner Runde erproben",
  ],
  en: [
    (focus: string) => `Option: Implement the measure (${focus || "neutral"})`,
    (focus: string) => `Option: Test a variant (${focus || "pilot"})`,
    () => "Option: Delay the decision and gather data",
    () => "Option: Pilot on a smaller scale",
  ],
};

export function buildHeuristicAnalyzeResult({
  text,
  locale,
}: {
  text: string;
  locale?: string;
}): AnalyzeResult {
  const cleanText = (text || "").trim();
  const language = (locale || "de").toLowerCase();
  const lang = normalizeLang(locale);
  const baseSentences = cleanText
    ? cleanText
        .split(/[\n\r.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : ["Anliegen erfasst."];

  const claims = baseSentences.slice(0, 3).map((sentence, idx) => ({
    id: `h-claim-${idx + 1}`,
    text: normalizeSentence(sentence, lang),
    title: sentence.slice(0, 60) || `Aussage ${idx + 1}`,
    responsibility: guessResponsibility(sentence, lang),
    importance: 3,
    stance: guessStance(sentence, lang),
    domain: guessDomain(sentence, lang),
    domains: null,
    topic: guessTopic(sentence, lang),
  }));

  const questions = buildQuestions(cleanText, lang);
  const missingPerspectives = buildMissingPerspectives(cleanText, lang);
  const participationCandidates = buildParticipationCandidates(cleanText, lang);

  return {
    mode: "E150",
    sourceText: cleanText,
    language,
    claims,
    notes: [
      {
        id: "note-heuristic",
        text:
          lang === "en"
            ? "Automatic quick check (analysis temporarily limited)."
            : "Automatischer Schnell-Check (Analyse gerade eingeschränkt).",
        kind: "schnellcheck",
      },
    ],
    questions,
    missingPerspectives,
    knots: [],
    consequences: { consequences: [], responsibilities: [] },
    responsibilityPaths: [],
    eventualities: [],
    decisionTrees: [],
    impactAndResponsibility: { impacts: [], responsibleActors: [] },
    participationCandidates,
    report: {
      summary: null,
      keyConflicts: [],
      facts: { local: [], international: [] },
      openQuestions: questions.map((q) => q.text),
      takeaways: [],
    },
  };
}

function normalizeSentence(sentence: string, lang: LangKey): string {
  const trimmed = sentence.trim();
  if (!trimmed) return "Anliegen erfasst.";
  const lower = trimmed.toLowerCase();
  if (lang === "en") {
    if (lower.startsWith("i am against") || lower.startsWith("i'm against")) {
      return trimmed.replace(/i am against|i'm against/i, "Against");
    }
    if (lower.startsWith("i am for") || lower.startsWith("i'm for")) {
      return trimmed.replace(/i am for|i'm for/i, "For");
    }
    return trimmed;
  }
  if (lower.startsWith("ich bin gegen")) return trimmed.replace(/ich bin gegen/i, "Gegen");
  if (lower.startsWith("ich bin für") || lower.startsWith("ich bin fuer")) {
    return trimmed.replace(/ich bin f(ü|u)r/i, "Für");
  }
  return trimmed;
}

function guessResponsibility(sentence: string, lang: LangKey): string | null {
  const lower = sentence.toLowerCase();
  if (/\b(eu|europe|european|brussels|brüssel)\b/.test(lower)) return "eu";
  if (/\b(kommune|stadt|bezirk|gemeinde|city|municipality|district|county|local)\b/.test(lower))
    return "kommune";
  if (/\b(bund|bundestag|federal|national|country)\b/.test(lower)) return "bund";
  if (/\b(land|landtag|state)\b/.test(lower)) return "land";
  return lang === "en" ? "unspecified" : "unbestimmt";
}

function guessStance(sentence: string, _lang: LangKey): "pro" | "contra" | "neutral" {
  const lower = sentence.toLowerCase();
  if (/\bgegen\b|\bagainst\b/.test(lower)) return "contra";
  if (/\bf(ü|u)r\b|\bfor\b/.test(lower)) return "pro";
  if (/\babschaffen|verbieten|ban|prohibit|abolish|stop|reject\b/.test(lower)) return "contra";
  if (/\beinf(ü|u)hren|ausbauen|erh(ö|o)hen|introduce|expand|increase|allow|legalize\b/.test(lower))
    return "pro";
  return "neutral";
}

function guessDomain(sentence: string, lang: LangKey): string | null {
  const lower = sentence.toLowerCase();
  const hints = DIMENSION_HINTS[lang] || DIMENSION_HINTS.de;
  for (const key of Object.keys(hints)) {
    if (lower.includes(key)) return hints[key];
  }
  return null;
}

function guessTopic(sentence: string, lang: LangKey): string | null {
  const lower = sentence.toLowerCase();
  if (lang === "en") {
    if (/\b(school|education|students|children)\b/.test(lower)) return "Education";
    if (/\b(traffic|transport|road|street|speed|bike)\b/.test(lower)) return "Transport";
    if (/\b(climate|energy|co2|emission)\b/.test(lower)) return "Climate";
    if (/\b(rent|housing|tenants)\b/.test(lower)) return "Housing";
    return null;
  }
  if (lower.includes("schule")) return "Bildung";
  if (lower.includes("verkehr") || lower.includes("strasse") || lower.includes("straße")) return "Verkehr";
  if (lower.includes("klima") || lower.includes("energie")) return "Klima";
  if (lower.includes("miete") || lower.includes("wohnen")) return "Wohnen";
  return null;
}

function buildQuestions(text: string, lang: LangKey) {
  const topic = extractTopic(text, lang);
  const target = topic || (lang === "en" ? "the proposal" : "das Vorhaben");
  const topicSpecific = buildTopicQuestions(text, lang);
  const base =
    lang === "en"
      ? [
          { id: "q-1", text: `How are benefits and burdens around ${target} distributed?`, dimension: "Fairness" },
          {
            id: "q-2",
            text: `Which groups or minorities are especially affected by ${target}?`,
            dimension: "Minorities",
          },
          {
            id: "q-3",
            text: `Which side effects or trade-offs could ${target} trigger?`,
            dimension: "Side effects",
          },
          { id: "q-4", text: `How do we measure success and impact around ${target}?`, dimension: "Measurability" },
          { id: "q-5", text: `What alternatives exist to ${target}?`, dimension: "Alternatives" },
          { id: "q-6", text: `How do we ensure trust and legitimacy around ${target}?`, dimension: "Trust" },
          {
            id: "q-7",
            text: `Who implements decisions around ${target}, and how do we verify it?`,
            dimension: "Implementation",
          },
        ]
      : [
          { id: "q-1", text: `Wie wird Nutzen und Belastung rund um ${target} verteilt?`, dimension: "Gerechtigkeit" },
          {
            id: "q-2",
            text: `Welche Gruppen oder Minderheiten sind rund um ${target} besonders betroffen?`,
            dimension: "Minderheiten",
          },
          { id: "q-3", text: `Welche Nebenwirkungen oder Zielkonflikte kann ${target} auslösen?`, dimension: "Nebenwirkungen" },
          { id: "q-4", text: `Woran messen wir Erfolg und Wirksamkeit rund um ${target}?`, dimension: "Messbarkeit" },
          { id: "q-5", text: `Welche Alternativen gibt es statt ${target}?`, dimension: "Alternativen" },
          { id: "q-6", text: `Wie sichern wir Vertrauen und Legitimität rund um ${target}?`, dimension: "Vertrauen" },
          {
            id: "q-7",
            text: `Wer setzt Entscheidungen rund um ${target} um und wie überprüfen wir das?`,
            dimension: "Umsetzung",
          },
        ];
  const combined = [...base.slice(0, 5), ...topicSpecific, ...base.slice(5)];
  return combined.slice(0, 7);
}

function buildMissingPerspectives(text: string, lang: LangKey) {
  if (lang === "en") {
    return [
      { id: "mp-1", text: "Include perspectives of directly affected groups and minorities.", dimension: "Minorities" },
      { id: "mp-2", text: "Make side effects and trade-offs visible.", dimension: "Side effects" },
      { id: "mp-3", text: "Assess feasibility incl. resources and staff.", dimension: "Feasibility" },
      { id: "mp-4", text: "Compare alternatives with lower risk.", dimension: "Alternatives" },
      { id: "mp-5", text: "Secure trust, transparency, and legitimacy.", dimension: "Trust" },
    ].slice(0, 5);
  }
  return [
    { id: "mp-1", text: "Perspektive der direkt Betroffenen und Minderheiten prüfen.", dimension: "Minderheiten" },
    { id: "mp-2", text: "Nebenwirkungen und Zielkonflikte sichtbar machen.", dimension: "Nebenwirkungen" },
    { id: "mp-3", text: "Umsetzbarkeit inkl. Ressourcen und Personal einschätzen.", dimension: "Umsetzbarkeit" },
    { id: "mp-4", text: "Alternativen mit weniger Risiko vergleichen.", dimension: "Alternativen" },
    { id: "mp-5", text: "Vertrauen, Transparenz und Legitimität sichern.", dimension: "Vertrauen" },
  ].slice(0, 5);
}

function buildParticipationCandidates(text: string, lang: LangKey) {
  const lower = text.toLowerCase();
  const hints = DIMENSION_HINTS[lang] || DIMENSION_HINTS.de;
  const focus = Object.entries(hints).find(([hint]) => lower.includes(hint))?.[1] ?? "neutral";
  const templates = PARTICIPATION_TEMPLATES[lang] || PARTICIPATION_TEMPLATES.de;
  return templates.slice(0, 4).map((tpl, idx) => ({
    id: `pc-${idx + 1}`,
    text: tpl(focus),
    stance: "neutral" as const,
    dimension: focus,
  }));
}

function extractTopic(text: string, lang: LangKey) {
  const cleaned = (text || "").replace(/\s+/g, " ").replace(/[“”„"]/g, "").trim();
  if (!cleaned) return "";

  const againstMatch =
    lang === "en"
      ? cleaned.match(/\b(against|for)\b\s+([^.!?,;\n\r]+)/i)
      : cleaned.match(/\b(gegen|für|fuer)\b\s+([^.!?,;\n\r]+)/i);
  if (againstMatch?.[2]) {
    const phrase = againstMatch[2].split(/\b(und|oder|aber|weil|dass|damit)\b/i)[0];
    return stripLeadingArticle(phrase.trim(), lang);
  }

  const stopwords =
    lang === "en"
      ? new Set([
          "i",
          "we",
          "you",
          "they",
          "should",
          "please",
          "more",
          "less",
          "against",
          "for",
          "the",
          "a",
          "an",
          "and",
          "or",
          "but",
          "with",
          "without",
          "also",
          "not",
          "no",
          "to",
          "of",
          "in",
          "on",
          "at",
          "from",
          "by",
          "about",
          "as",
          "this",
          "that",
        ])
      : new Set([
          "ich",
          "wir",
          "man",
          "soll",
          "sollen",
          "bitte",
          "mehr",
          "weniger",
          "gegen",
          "fuer",
          "für",
          "der",
          "die",
          "das",
          "den",
          "dem",
          "ein",
          "eine",
          "einen",
          "einem",
          "einer",
          "und",
          "oder",
          "aber",
          "mit",
          "ohne",
          "auch",
          "noch",
          "nicht",
          "kein",
          "keine",
          "keinen",
        ]);

  const tokens = cleaned
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-zÄÖÜäöüß0-9-]/g, ""))
    .filter((word) => word.length > 3)
    .filter((word) => !stopwords.has(word.toLowerCase()));

  const nounish = lang === "de" ? tokens.filter((word) => /^[A-ZÄÖÜ]/.test(word)) : [];
  const candidates = nounish.length ? nounish : tokens;
  if (!candidates.length) return "";

  return candidates.sort((a, b) => b.length - a.length)[0];
}

function stripLeadingArticle(phrase: string, lang: LangKey) {
  if (lang === "en") {
    return phrase.replace(/^(the|a|an)\s+/i, "").trim();
  }
  return phrase.replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/i, "").trim();
}

function buildTopicQuestions(text: string, lang: LangKey) {
  const lower = (text || "").toLowerCase();
  const questions: Array<{ id: string; text: string; dimension: string }> = [];

  if (lang === "en") {
    if (/(dog tax|pet|animal)\b/.test(lower)) {
      questions.push({
        id: "q-t1",
        text: "How do we ensure social balance in fees or taxes?",
        dimension: "Fairness",
      });
    }
    if (/(speed|traffic|bike|parking|noise|street|road)\b/.test(lower)) {
      questions.push({
        id: "q-t2",
        text: "What diversion effects or side effects arise locally?",
        dimension: "Side effects",
      });
    }
    if (/(rent|housing|tenant)\b/.test(lower)) {
      questions.push({
        id: "q-t3",
        text: "How do we protect tenants without slowing new builds or renovation?",
        dimension: "Alternatives",
      });
    }
    if (/(climate|co2|energy|emission)\b/.test(lower)) {
      questions.push({
        id: "q-t4",
        text: "How do we measure climate impact and avoid greenwashing?",
        dimension: "Measurability",
      });
    }
    if (/(school|children|youth|education)\b/.test(lower)) {
      questions.push({
        id: "q-t5",
        text: "What impact does this have on children and education access?",
        dimension: "Affected groups",
      });
    }
    return questions.slice(0, 2);
  }

  if (/(hundesteuer|haustier|tier)\b/.test(lower)) {
    questions.push({
      id: "q-t1",
      text: "Wie sichern wir sozialen Ausgleich bei Gebühren oder Steuern?",
      dimension: "Gerechtigkeit",
    });
  }
  if (/(tempo|verkehr|radweg|parkplatz|lärm|strasse|straße)\b/.test(lower)) {
    questions.push({
      id: "q-t2",
      text: "Welche Ausweich- und Nebenwirkungen entstehen im Umfeld?",
      dimension: "Nebenwirkungen",
    });
  }
  if (/(miete|wohnen|miet)\b/.test(lower)) {
    questions.push({
      id: "q-t3",
      text: "Wie schützen wir Mieter, ohne Neubau oder Sanierung zu bremsen?",
      dimension: "Alternativen",
    });
  }
  if (/(klima|co2|energie|emission)\b/.test(lower)) {
    questions.push({
      id: "q-t4",
      text: "Wie messen wir Klimawirkung und vermeiden Greenwashing?",
      dimension: "Messbarkeit",
    });
  }
  if (/(schule|kinder|jugend|bildung)\b/.test(lower)) {
    questions.push({
      id: "q-t5",
      text: "Welche Auswirkungen hat es auf Kinder und Bildungschancen?",
      dimension: "Betroffene",
    });
  }

  return questions.slice(0, 2);
}
