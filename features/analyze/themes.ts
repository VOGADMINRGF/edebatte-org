// features/analyze/themes.ts
// Zweck: leichte, schnelle Themenzuordnung (Hauptthema → Unterthema) für Claims.
// Keine externen Abhängigkeiten. Funktioniert auch ohne die übrigen Analyzer-Typen.

export type ThemeId =
  | "agrar" | "agrar.tierhaltung" | "agrar.massentierhaltung"
  | "politik" | "politik.verwaltung"
  | "staat.beamte.respekt"
  | "sicherheit" | "sicherheit.polizei" | "sicherheit.feuerwehr" | "sicherheit.ausstattung";

export type Theme = {
  id: ThemeId;
  label: string;
  parent?: ThemeId;
};

export const THEMES: Theme[] = [
  { id: "agrar", label: "Agrar & Ernährung" },
  { id: "agrar.tierhaltung", label: "Tierhaltung", parent: "agrar" },
  { id: "agrar.massentierhaltung", label: "Massentierhaltung", parent: "agrar.tierhaltung" },

  { id: "politik", label: "Politik & Gesellschaft" },
  { id: "politik.verwaltung", label: "Verwaltung / Ministerien", parent: "politik" },

  { id: "staat.beamte.respekt", label: "Respekt gegenüber Beamten", parent: "politik" },

  { id: "sicherheit", label: "Innere Sicherheit" },
  { id: "sicherheit.polizei", label: "Polizei", parent: "sicherheit" },
  { id: "sicherheit.feuerwehr", label: "Feuerwehr / Rettung", parent: "sicherheit" },
  { id: "sicherheit.ausstattung", label: "Ausstattung & Personal", parent: "sicherheit" },
];

const THEME_INDEX: Record<ThemeId, Theme> =
  Object.fromEntries(THEMES.map(t => [t.id, t])) as Record<ThemeId, Theme>;

export type ThemeHit = {
  id: ThemeId;
  label: string;
  score: number;        // 0..1
  path: { id: ThemeId; label: string }[];
};

// Mini-Typ, damit das File “stand-alone” ist
export type AtomicLike = { text: string; zustaendigkeit?: string; ort?: string };

// —— einfache Lexika (Regex) pro Thema ——
const LEXICON: Record<ThemeId, RegExp[]> = {
  "agrar": [
    /\bagrar/i, /\blandwirtschaft/i, /\bba(u|ä)uern?/i, /\bern(ährung|te)/i,
  ],
  "agrar.tierhaltung": [
    /\btierhaltung/i, /\btierschutz/i, /\bkäfighaltung/i, /\bstall\w*/i, /\bnutztier/i
  ],
  "agrar.massentierhaltung": [
    /\bmassentierhaltung/i, /\bindustrie\w* tier\w*/i, /\bgroßstall/i, /\bmega\w*stall/i
  ],

  "politik": [
    /\bpolitik/i, /\bpolitiker/i, /\babgeordnete?n?\b/i, /\bgesellschaft/i,
  ],
  "politik.verwaltung": [
    /\bministerium|\bministerien|\bbehörde|\bverwaltung\b/i, /\bressort/i,
    /\bamt\b|\bämter\b/i
  ],

  "staat.beamte.respekt": [
    /\bbeam(t|tinnen)|\bstaatsdiener/i, /\brespekt|wertschätzung|achtung/i,
    /\bumgang mit (beamten|beamten\w+)/i
  ],

  "sicherheit": [
    /\bsicherheits?lage\b/i, /\binnere sicherheit/i,
  ],
  "sicherheit.polizei": [
    /\bpolizei\b|\bpolizist/i, /\bordnungskräfte/i
  ],
  "sicherheit.feuerwehr": [
    /\bfeuerwehr\b|\bretter?ungs?dienst|\bnotarzt/i
  ],
  "sicherheit.ausstattung": [
    /\bausstattung|\bausrüstung|\bfahrzeuge|\bfunk|\bpersonal(stand)?/i,
    /\bunterbesetzt|\büberlastet/i
  ],
};

// kleines Gewichtungsmodell
const WEIGHT: Partial<Record<ThemeId, number>> = {
  "agrar.massentierhaltung": 1.15,
  "sicherheit.ausstattung": 1.1,
};

function scoreText(theme: ThemeId, text: string): number {
  const src = text.toLowerCase();
  const rules = LEXICON[theme] || [];
  if (!rules.length) return 0;
  let hits = 0;
  for (const rx of rules) if (rx.test(src)) hits++;
  if (!hits) return 0;
  const base = Math.min(1, hits / Math.max(2, rules.length)); // 0..1
  const w = WEIGHT[theme] ?? 1;
  return Math.max(0, Math.min(1, base * w));
}

function pathFor(id: ThemeId): { id: ThemeId; label: string }[] {
  const out: { id: ThemeId; label: string }[] = [];
  let cur: Theme | undefined = THEME_INDEX[id];
  while (cur) { out.unshift({ id: cur.id, label: cur.label }); cur = cur.parent ? THEME_INDEX[cur.parent] : undefined; }
  return out;
}

export function detectThemes(text: string, opts?: { topK?: number; minScore?: number }): ThemeHit[] {
  const topK = opts?.topK ?? 3;
  const minScore = opts?.minScore ?? 0.35;

  const scores: ThemeHit[] = THEMES.map(t => ({
    id: t.id,
    label: t.label,
    score: scoreText(t.id, text),
    path: pathFor(t.id),
  }))
  .filter(h => h.score >= minScore)
  .sort((a, b) => b.score - a.score);

  // wenn ein Kindthema stark ist → Elternteil optional ausblenden
  const pruned: ThemeHit[] = [];
  const seenParent = new Set<string>();
  for (const h of scores) {
    const parent = THEME_INDEX[h.id]?.parent;
    if (parent && scores.find(x => x.id === parent && x.score >= h.score * 0.92)) {
      // Eltern ist fast gleich gut → Kind behalten, Eltern droppen
      continue;
    }
    if (!seenParent.has(h.id)) pruned.push(h);
    seenParent.add(h.id);
  }
  return pruned.slice(0, topK);
}

// Multi-Zuordnung für eine Liste von Claims
export function assignThemesForItems(items: AtomicLike[], opts?: { perItemTopK?: number; minScore?: number }) {
  const perItemTopK = opts?.perItemTopK ?? 2;
  const minScore = opts?.minScore ?? 0.35;

  return items.map((it) => {
    const hits = detectThemes(it.text, { topK: perItemTopK, minScore });
    return { ...it, themes: hits };
  });
}

// Hilfslabel: „Agrar & Ernährung › Tierhaltung › Massentierhaltung“
export function themeBreadcrumb(id: ThemeId): string {
  return pathFor(id).map(p => p.label).join(" › ");
}
