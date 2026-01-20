import { DebateFrameSchema, type DebateFrame, type DebateLevel, type PolicyDomain, type StatementRecord } from "./schemas";

const POLICY_DECISION_RE =
  /\b(soll|sollen|sollte|sollten|muss|m\u00fcssen|muessen|darf|d\u00fcrfen|duerfen|pflicht|verbot|sanktion|should|must|ban|banned|require|mandatory|allow|permit)\b/i;
const TRADEOFF_RE = /\b(aber|jedoch|hingegen|trade[- ]?off|abw[a\u00e4]gung|versus|gegen\u00fcber)\b/i;
const SCAPEGOAT_RE = /\b(s\u00fcndenbock|s\u00fcndenb\u00f6cke|schuld sind|blame|scapegoat)\b/i;
const PERSON_TARGET_RE = /@\w+/;

const POLICY_DOMAIN_BY_DOMAIN: Record<string, PolicyDomain> = {
  gesellschaft: "social",
  nachbarschaft: "social",
  innenpolitik: "governance",
  wirtschaft: "economy",
  bildung: "education",
  gesundheit: "health",
  sicherheit: "security",
  klima_umwelt: "infrastructure",
  digitales: "governance",
  infrastruktur: "infrastructure",
  justiz: "justice",
  kultur_medien: "social",
  sonstiges: "governance",
  aussenbeziehungen_nachbarlaender: "trade",
  aussenbeziehungen_eu: "trade",
  aussenbeziehungen_schengen: "security",
  aussenbeziehungen_g7: "trade",
  aussenbeziehungen_g20: "trade",
  aussenbeziehungen_un: "governance",
  aussenbeziehungen_nato: "security",
  aussenbeziehungen_oecd: "trade",
  aussenbeziehungen_global: "trade",
};

const POLICY_DOMAIN_BY_TEXT: Array<{ re: RegExp; domain: PolicyDomain }> = [
  { re: /\b(miete|mieten|wohnung|wohnen|housing|rent)\b/i, domain: "housing" },
  { re: /\b(gesundheit|krankenhaus|pflege|health|hospital)\b/i, domain: "health" },
  { re: /\b(bildung|schule|schulen|universit\u00e4t|education|school)\b/i, domain: "education" },
  { re: /\b(migration|fl\u00fcchtling|asyl|refugee)\b/i, domain: "migration" },
  { re: /\b(integration|integrations)\b/i, domain: "integration" },
  { re: /\b(handel|zoll|tarif|tariff|trade)\b/i, domain: "trade" },
  { re: /\b(arbeitsrecht|lohn|labor|gewerkschaft|worker)\b/i, domain: "labor" },
  { re: /\b(justiz|gericht|strafrecht|justice|court)\b/i, domain: "justice" },
  { re: /\b(sicherheit|polizei|terror|security)\b/i, domain: "security" },
  { re: /\b(wirtschaft|wirtschaftlich|unternehmen|economy|economic)\b/i, domain: "economy" },
  { re: /\b(infrastruktur|stra\u00dfe|br\u00fccke|bahn|infrastructure)\b/i, domain: "infrastructure" },
];

function guessLevel(text: string, responsibility?: string | null): DebateLevel {
  const resp = responsibility?.toLowerCase() ?? "";
  if (resp === "eu") return "eu";
  if (resp === "bund" || resp === "federal") return "national";
  if (resp === "land" || resp === "state") return "local";
  if (resp === "kommune" || resp === "municipality" || resp === "district") return "local";
  if (resp === "unknown" || resp === "unbestimmt") return "national";

  const lower = text.toLowerCase();
  if (/\b(eu|europa|br\u00fcssel|brussel|europe|european)\b/.test(lower)) return "eu";
  if (/\b(global|welt|international|un|vereinte nationen|united nations)\b/.test(lower)) return "global";
  if (/\b(nachbar|neighbour|neighbor|grenz|grenznah|cross-border)\b/.test(lower)) return "neighbour";
  if (/\b(stadt|kommune|gemeinde|bezirk|kreis|landkreis|wahlkreis|bundesland|stadtteil|local|district)\b/.test(lower)) {
    return "local";
  }
  if (/\b(bund|bundes|deutschland|national|staat|federal|country)\b/.test(lower)) return "national";
  return "national";
}

function guessPolicyDomain(statement: StatementRecord): PolicyDomain {
  const rawDomain = typeof statement.domain === "string" ? statement.domain.toLowerCase() : "";
  if (rawDomain && POLICY_DOMAIN_BY_DOMAIN[rawDomain]) {
    return POLICY_DOMAIN_BY_DOMAIN[rawDomain];
  }

  const text = statement.text ?? "";
  for (const rule of POLICY_DOMAIN_BY_TEXT) {
    if (rule.re.test(text)) return rule.domain;
  }
  return "governance";
}

function regionForLevel(level: DebateLevel) {
  if (level === "eu") return "EU";
  if (level === "global") return "Global";
  if (level === "neighbour") return "Neighbors";
  return undefined;
}

function computeAntiPopulism(frame: DebateFrame, text: string) {
  const hasOptions = (frame.options?.length ?? 0) >= 2;
  const hasMetrics = (frame.metrics?.length ?? 0) > 0;
  const hasRightsDuties = (frame.rights?.length ?? 0) > 0 && (frame.duties?.length ?? 0) > 0;
  const hasStagedSanctions = (frame.enforcement?.stages?.length ?? 0) > 0;
  const definesTerms = (frame.minimumStandards?.length ?? 0) > 0;
  const policyDecision = POLICY_DECISION_RE.test(text);
  const showsTradeoffs = TRADEOFF_RE.test(text);
  const noScapegoat = !SCAPEGOAT_RE.test(text);
  const noPersonTargeting = !PERSON_TARGET_RE.test(text);

  const gates = [
    { id: "no_scapegoat", pass: noScapegoat },
    { id: "policy_decision", pass: policyDecision },
    { id: ">=2_options", pass: hasOptions },
    { id: "has_metrics", pass: hasMetrics },
    { id: "shows_tradeoffs", pass: showsTradeoffs },
    { id: "rights_duties_symmetry", pass: hasRightsDuties },
    { id: "sanctions_are_staged", pass: hasStagedSanctions },
    { id: "defines_terms", pass: definesTerms },
    { id: "no_person_targeting", pass: noPersonTargeting },
    { id: "dossier_required", pass: true },
  ] as const;

  const total = gates.length;
  const passed = gates.filter((g) => g.pass).length;
  const score = total ? Math.round((passed / total) * 100) / 100 : 0;
  let status: "pass" | "fail" | "needs_review" = "needs_review";
  if (!noScapegoat || !noPersonTargeting) status = "fail";
  else if (passed === total) status = "pass";

  const missing = gates.filter((g) => !g.pass).map((g) => g.id);
  const notes = missing.length
    ? `Auto-generated. Missing gates: ${missing.join(", ")}.`
    : "Auto-generated. All gates passed.";

  return { score, gates: [...gates], status, notes };
}

export function buildDebateFrame(statement: StatementRecord): DebateFrame {
  const text = statement.text ?? "";
  const level = guessLevel(text, statement.responsibility ?? undefined);
  const policyDomain = guessPolicyDomain(statement);
  const frame: DebateFrame = {
    version: "v1",
    level,
    policyDomain,
    jurisdiction: {
      actors: [],
      region: regionForLevel(level),
    },
    objective: undefined,
    rights: [],
    duties: [],
    minimumStandards: [],
    enforcement: {
      stages: [],
      humanitarianExceptions: true,
      legalSafeguards: [],
    },
    metrics: [],
    options: [],
    antiPopulism: {
      score: 0,
      gates: [],
      status: "needs_review",
      notes: "Auto-generated.",
    },
  };

  frame.antiPopulism = computeAntiPopulism(frame, text);
  return frame;
}

export function ensureDebateFrame(statement: StatementRecord): DebateFrame {
  if (statement.debateFrame) {
    const parsed = DebateFrameSchema.safeParse(statement.debateFrame);
    if (parsed.success) return parsed.data;
  }
  return buildDebateFrame(statement);
}
