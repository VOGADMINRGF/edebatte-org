import type {
  EditorialAudit,
  EditorialSourceBalance,
  EditorialAgencyFlag,
  EditorialTermFlag,
  EditorialPowerFlag,
  EuphemismFinding,
} from "./schemas";
import { EDITORIAL_SOURCE_CLASSES } from "./schemas";
import type { AnySource } from "./editorialSourceClassifier";
import { classifySource, hostFromUrl, pickUrl, getPublisherKey } from "./editorialSourceClassifier";
import { canonicalizeUrl } from "./urlCanonical";
import { computeInternationalContrast } from "./editorialContrast";
import { getPolicyPack } from "./editorialPolicyPack";
import { requiredVoicesFor, type VoiceRole } from "./voiceRegistry";
import { computeContextGaps } from "./contextGaps";
import { getContextPacksByIds, suggestContextPacks } from "./contextPacks";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normalizeAscii(text: string): string {
  return text
    .replace(/[\u00e4\u00c4]/g, "ae")
    .replace(/[\u00f6\u00d6]/g, "oe")
    .replace(/[\u00fc\u00dc]/g, "ue")
    .replace(/\u00df/g, "ss");
}

function computeBalanceScore(counts: Record<string, number>): number {
  const vals = Object.values(counts).filter((n) => Number.isFinite(n) && n > 0);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const n of vals) {
    const p = n / total;
    h += -p * Math.log(p);
  }
  const maxH = Math.log(Math.max(vals.length, 1));
  return maxH > 0 ? Math.max(0, Math.min(1, h / maxH)) : 0;
}

function splitSentencesDe(text: string): string[] {
  const t = text
    .replace(/\s+/g, " ")
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return t.length ? t : [];
}

function agencyOpacityFlagsDe(text: string): EditorialAgencyFlag[] {
  const flags: EditorialAgencyFlag[] = [];
  const sentences = splitSentencesDe(text);
  for (const s of sentences) {
    const normalized = normalizeAscii(s.toLowerCase());
    const hasPassive =
      /\b(wurde|wurden|ist|sind)\b.*\b(getoetet|verletzt|zerstoert|bombardiert|angegriffen|festgenommen|erschossen)\b/.test(
        normalized,
      );
    const hasAgent =
      /\b(durch|von)\b\s+[a-z]/.test(normalized) ||
      /\b(israel|hamas|russland|ukraine|usa|nato|polizei|bundeswehr)\b/.test(normalized);
    const vagueAttack = /\b(bei einem|durch einen|infolge eines)\b\s+(luftschlag|angriff|beschuss|einsatz)\b/.test(
      normalized,
    );

    if ((hasPassive && !hasAgent) || vagueAttack) {
      flags.push({
        sentence: s,
        reason: "Moegliche Verschleierung der Taeterschaft/Agency (Passiv oder unklarer Akteur).",
        suggestion:
          "Falls bekannt: Akteur explizit nennen oder klar markieren, dass der Akteur unbestaetigt/unklar ist.",
        severity: "medium",
      });
    }
  }
  return flags.slice(0, 12);
}

function euphemismFlagsDe(text: string): EditorialTermFlag[] {
  const flags: EditorialTermFlag[] = [];
  const lex: Array<{ term: RegExp; suggestion?: string; rationale: string; severity: "low" | "medium" | "high" }> = [
    {
      term: /\bEvakuierung(en)?\b/i,
      suggestion: "Umsiedlung/Vertreibung (kontextabhaengig)",
      rationale: "\"Evakuierung\" kann beschoenigend wirken, wenn Bewegung nicht freiwillig/sicher ist. Kontext pruefen.",
      severity: "low",
    },
    {
      term: /\bZwischen die Fronten geraten\b/i,
      suggestion: "gezielt / unbeabsichtigt (konkretisieren)",
      rationale: "Kann Verantwortlichkeit verwischen. Wenn moeglich: Art des Ereignisses praezisieren.",
      severity: "low",
    },
    {
      term: /\bLuftschlag\b/i,
      suggestion: "Angriff (mit Akteur/Quelle)",
      rationale: "Ohne Akteur/Quelle kann \"Luftschlag\" agency-unklar bleiben.",
      severity: "low",
    },
  ];

  for (const item of lex) {
    const m = text.match(item.term);
    if (m?.[0]) {
      flags.push({
        term: m[0],
        matchedText: m[0],
        suggestion: item.suggestion,
        rationale: item.rationale,
        severity: item.severity,
      });
    }
  }
  return flags.slice(0, 12);
}

function detectPowerStenographyFlags(text: string, sources: AnySource[]): EditorialPowerFlag[] {
  const flags: EditorialPowerFlag[] = [];
  const t = normalizeAscii(text.toLowerCase());
  const hasAuthorityClaim =
    /\b(laut|nach angaben|sagte|erklaerte|teilte mit)\b/.test(t) &&
    /\b(regierung|ministerium|militaer|polizei|sprecher|verteidigungsministerium)\b/.test(t);

  const total = sources.length;
  const classified = sources.map(classifySource);
  const powerCount = classified.filter((c) => c === "gov" || c === "military").length;
  const powerShare = total > 0 ? powerCount / total : 0;

  if (hasAuthorityClaim && powerShare >= 0.6) {
    flags.push({
      snippet: "Der Text stuetzt sich stark auf Regierungs-/Militaerkommunikation (heuristisch erkannt).",
      reason:
        "Risiko von Stenografie/PR-Uebernahme: hoher Anteil machtnahe Quellen + berichtende Verben (\"laut/teilte mit\").",
      suggestion:
        "Gegencheck: unabhaengige Belege/Experten/Betroffene ergaenzen oder klar als unbestaetigte Behauptung kennzeichnen.",
      severity: "medium",
    });
  }

  return flags.slice(0, 6);
}

function extractClaimTexts(claims: unknown): string[] {
  if (!Array.isArray(claims)) return [];
  const texts: string[] = [];
  for (const c of claims) {
    if (!c || typeof c !== "object") continue;
    const anyC = c as any;
    const t =
      safeStr(anyC.text) ||
      safeStr(anyC.claim) ||
      safeStr(anyC.statement) ||
      safeStr(anyC.content) ||
      safeStr(anyC.title);
    if (t) texts.push(t);
  }
  return texts;
}

function normalizeText(t: string): string {
  const ascii = normalizeAscii((t || "").toLowerCase());
  return ascii.replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function hash32(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function tokenize(t: string): string[] {
  const stop = new Set([
    "der",
    "die",
    "das",
    "und",
    "oder",
    "aber",
    "ein",
    "eine",
    "einer",
    "eines",
    "im",
    "in",
    "am",
    "an",
    "auf",
    "aus",
    "zu",
    "von",
    "fuer",
    "mit",
    "ohne",
    "nicht",
    "kein",
    "keine",
    "als",
    "dass",
    "ist",
    "sind",
    "war",
    "waren",
    "the",
    "and",
    "or",
    "but",
    "a",
    "an",
    "to",
    "from",
    "for",
    "with",
    "without",
    "not",
    "no",
    "that",
    "is",
    "are",
    "was",
    "were",
    "be",
  ]);
  return normalizeText(t)
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length >= 4 && !stop.has(x));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni > 0 ? inter / uni : 0;
}

function scoreClaimToSource(claim: string, s: AnySource): number {
  const blob = `${s.title ?? ""} ${s.snippet ?? ""}`.trim();
  const cToks = new Set(tokenize(claim));
  const sToks = new Set(tokenize(blob));
  const base = jaccard(cToks, sToks);

  const ent = (claim.match(/\b[A-Z][A-Za-z-]{3,}\b/g) ?? []).slice(0, 10);
  let bonus = 0;
  if (ent.length > 0) {
    const lowBlob = blob.toLowerCase();
    const hit = ent.filter((e) => lowBlob.includes(e.toLowerCase())).length;
    bonus = Math.min(0.25, hit * 0.05);
  }

  const url = pickUrl(s);
  const host = hostFromUrl(url);
  const hostBonus = host ? 0.05 : 0;

  const pubKey = getPublisherKey(s);
  const pubBonus = pubKey !== "unknown" ? 0.06 : 0;

  return Math.max(0, Math.min(1, base + bonus + hostBonus + pubBonus));
}

function computeBurdenOfProofLinked(claimTexts: string[], sources: AnySource[]) {
  const notes: string[] = [];
  if (claimTexts.length === 0) {
    return { unmetClaims: [], claimEvidence: [], notes: ["Keine Claims erkannt -> keine Beweislastbewertung moeglich."] };
  }
  if (sources.length === 0) {
    return {
      unmetClaims: claimTexts.slice(0, 8),
      claimEvidence: claimTexts.slice(0, 8).map((c) => ({ claim: c, evidenceScore: 0, linkedSources: [] })),
      notes: ["Keine Quellen im Ergebnis -> Claims sind (noch) unbelegt."],
    };
  }

  const deduped: AnySource[] = [];
  const seen = new Set<string>();
  sources.forEach((s, idx) => {
    const url = pickUrl(s);
    const key = url ? canonicalizeUrl(url).key : "";
    const fallback = [
      safeStr((s as any).publisher ?? (s as any).source),
      safeStr((s as any).title),
      safeStr((s as any).domain),
      safeStr((s as any).snippet).slice(0, 120),
    ]
      .join("::")
      .trim();
    const fallbackKey = fallback ? `fb:${hash32(fallback.toLowerCase())}` : `idx:${idx}`;
    const k = key ? `url:${key}` : fallbackKey;
    if (seen.has(k)) return;
    seen.add(k);
    deduped.push(s);
  });

  const claimEvidence = claimTexts.slice(0, 12).map((claim) => {
    const scored = deduped
      .map((s) => {
        const score = scoreClaimToSource(claim, s);
        return { s, score };
      })
      .filter((x) => x.score > 0.18)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const linkedSources = scored.map(({ s, score }) => ({
      url: pickUrl(s) || undefined,
      title: (s.title ?? "").slice(0, 180) || undefined,
      publisher: (s.publisher ?? (s as any).source ?? "").toString().slice(0, 80) || undefined,
      sourceClass: classifySource(s),
      score: Number(score.toFixed(2)),
    }));
    const evidenceScore = linkedSources.length ? Math.max(...linkedSources.map((x) => x.score)) : 0;
    return { claim, evidenceScore, linkedSources };
  });

  const unmetClaims = claimEvidence.filter((c) => (c.linkedSources?.length ?? 0) === 0).map((c) => c.claim).slice(0, 8);

  const ratio = deduped.length / Math.max(1, claimTexts.length);
  if (ratio < 0.5) notes.push("Wenige Quellen im Verhaeltnis zur Anzahl der Claims. Pruefe, ob einzelne Claims explizite Belege bekommen.");
  if (unmetClaims.length > 0)
    notes.push("Einige Claims konnten keiner Quelle zugeordnet werden (heuristisch) -> zusaetzliche Belege/Quellen suchen oder Claim praezisieren.");

  return { unmetClaims, claimEvidence, notes };
}

export function computeEditorialAudit(args: {
  inputText: string;
  sources?: AnySource[];
  claims?: unknown;
  language?: "de" | "en";
  enableInternationalContrast?: boolean;
  domains?: string[];
  contextPackIds?: string[];
}): EditorialAudit {
  const inputText = safeStr(args.inputText);
  const sources = Array.isArray(args.sources) ? args.sources : [];
  const claimTexts = extractClaimTexts(args.claims);
  const domains = Array.isArray(args.domains) && args.domains.length ? args.domains : undefined;

  const attachedContextPacks = (() => {
    const out = [] as ReturnType<typeof suggestContextPacks>;
    const seen = new Set<string>();
    const add = (p: (typeof out)[number]) => {
      if (!p || seen.has(p.id)) return;
      seen.add(p.id);
      out.push(p);
    };
    getContextPacksByIds(args.contextPackIds).forEach(add);
    suggestContextPacks(domains).forEach(add);
    return out;
  })();

  const countsByClass: Record<string, number> = {};
  for (const k of EDITORIAL_SOURCE_CLASSES) countsByClass[k] = 0;
  for (const s of sources) {
    const c = classifySource(s);
    countsByClass[c] = (countsByClass[c] ?? 0) + 1;
  }

  const total = sources.length;
  const dominant =
    total > 0 ? Object.entries(countsByClass).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
  const balanceScore = total > 0 ? computeBalanceScore(countsByClass) : 0;

  const missingVoices: string[] = [];
  const powerShare = total > 0 ? ((countsByClass.gov ?? 0) + (countsByClass.military ?? 0)) / total : 0;
  if (total > 0 && powerShare >= 0.6) {
    if ((countsByClass.affected_witness ?? 0) === 0) missingVoices.push("Betroffene/Zeugen");
    if ((countsByClass.independent_media ?? 0) === 0) missingVoices.push("unabhaengige Medien/Investigativ");
    if ((countsByClass.ngo ?? 0) === 0) missingVoices.push("NGO/Monitoring");
    if ((countsByClass.academic ?? 0) === 0) missingVoices.push("Wissenschaft/Methodik");
  }

  const sourceBalance: EditorialSourceBalance = {
    countsByClass,
    total,
    dominantClass: dominant,
    balanceScore,
    missingVoices,
  };

  const isEnglish = args.language === "en";
  const agencyOpacityFlags: EditorialAgencyFlag[] = isEnglish ? [] : agencyOpacityFlagsDe(inputText);
  const euphemismTermFlags: EditorialTermFlag[] = isEnglish ? [] : euphemismFlagsDe(inputText);
  const powerStenographyFlags: EditorialPowerFlag[] = detectPowerStenographyFlags(inputText, sources);
  const burdenOfProof = computeBurdenOfProofLinked(claimTexts, sources);

  const policy = getPolicyPack();
  const normalizedText = normalizeAscii(inputText);
  const euphemismFindings: EuphemismFinding[] = [];

  for (const e of policy.euphemismLexicon) {
    if (!e.term) continue;
    const term = normalizeAscii(e.term);
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    const m = normalizedText.match(re);
    if (m) {
      euphemismFindings.push({
        kind: "lexicon",
        key: e.term,
        severity: e.severity,
        matched: m[0],
        preferredWording: e.preferredWording,
        rationale: e.rationale,
        preferredWordingI18n: e.preferredWordingI18n,
        rationaleI18n: e.rationaleI18n,
      });
    }
  }

  for (const r of policy.euphemismPatterns) {
    const m = normalizedText.match(r.regex);
    if (m) {
      euphemismFindings.push({
        kind: "pattern",
        key: r.id,
        severity: r.severity,
        matched: m[0],
        preferredWording: r.preferredWording,
        rationale: r.rationale,
        preferredWordingI18n: r.preferredWordingI18n,
        rationaleI18n: r.rationaleI18n,
      });
    }
  }

  const required = requiredVoicesFor(domains);
  const presentSet = new Set<VoiceRole>();
  for (const s of sources) {
    const sc = classifySource(s);
    if (sc === "gov") presentSet.add("power_government");
    else if (sc === "military") presentSet.add("power_military");
    else if (sc === "ngo") presentSet.add("human_rights_monitor");
    else if (sc === "academic") presentSet.add("independent_academic");
    else if (sc === "affected_witness") presentSet.add("affected_local");
    else if (sc === "igo_un") presentSet.add("international_law");
    else if (sc === "party_political") presentSet.add("opposition_alt_position");
    else if (sc === "independent_media" || sc === "wire_service" || sc === "osint") {
      presentSet.add("on_the_ground_journalist");
    } else {
      presentSet.add("other");
    }
  }
  const present = Array.from(presentSet);
  const missing = required.filter((r) => !presentSet.has(r));
  const score = required.length
    ? Math.max(0, Math.min(1, (required.length - missing.length) / required.length))
    : 0;
  const voiceCoverage = {
    required,
    present,
    missing,
    score,
    notes: missing.length ? ["Fehlende Rollen sind Hinweise - redaktionell pruefen."] : [],
  };

  const contextGaps = computeContextGaps(inputText, sources.length > 0);

  const notesForTraining: string[] = [];
  if (total === 0) notesForTraining.push("Keine Quellen gefunden -> Quellenrecherche aktivieren oder Eingabe praezisieren.");
  if (balanceScore < 0.25 && total > 0)
    notesForTraining.push("Sehr geringe Quellendiversitaet (mono) -> Gegenquellen ergaenzen.");

  const confidence = total >= 6 ? 0.75 : total >= 2 ? 0.6 : 0.45;

  const audit: EditorialAudit = {
    sourceBalance,
    agencyOpacityFlags,
    euphemismTermFlags,
    powerStenographyFlags,
    burdenOfProof: {
      unmetClaims: burdenOfProof.unmetClaims,
      claimEvidence: burdenOfProof.claimEvidence,
      notes: burdenOfProof.notes,
    },
    policyPack: { id: policy.id, version: policy.version, updatedAt: policy.updatedAt },
    euphemismFindings,
    voiceCoverage,
    contextGaps,
    attachedContextPacks: attachedContextPacks.map((p) => ({
      id: p.id,
      version: p.version,
      title: p.title,
      scope: p.scope,
      summary: p.summary,
      titleI18n: p.titleI18n,
      summaryI18n: p.summaryI18n,
    })),
    notesForTraining,
    confidence,
  };

  if (args.enableInternationalContrast) {
    try {
      audit.internationalContrast = computeInternationalContrast({ sources });
    } catch {
      // ignore
    }
  }

  return audit;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
