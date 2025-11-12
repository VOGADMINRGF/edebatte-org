// features/ai/roles/rater.ts
// Kombi-BEST-Version: V2 bevorzugt (Single & Multi), V1 als Legacy/Fallback.
// Einheitliche Multi-Rückgabe: Record<canonical_id, ScoreSet>

import { runLLMJson } from "../providers";
import { runOpenAI } from "@features/ai/providers/openai";
import {
  RATER_SYSTEM,
  RATER_USER,
  RATER_MULTI_V2, // falls deine Prompts anders liegen, ggf. aus @features/ai/prompts/rater importieren
  EDITOR_RATER_V1,
} from "@features/ai/prompts/editor_rater";
import {
  ScoreSchema,
  type ScoreSet,
  type AtomicClaim,
  upgradeLegacyScore,
} from "./shared_types";

// ———————————————————————————————————————————————————————————
// V2: Single-Claim – bevorzugter Pfad
// ———————————————————————————————————————————————————————————

export async function rateDraft(
  claimText: string,
  opts?: { timeoutMs?: number; model?: string }
): Promise<ScoreSet> {
  const { data } = await runLLMJson({
    system: RATER_SYSTEM,
    user: RATER_USER({ claim: claimText }),
    model: opts?.model ?? "gpt-4o-mini-json",
    timeoutMs: opts?.timeoutMs ?? 1600,
  });
  return ScoreSchema.parse(data);
}

// ———————————————————————————————————————————————————————————
// V2: Multi-Claim – map by canonical_id
// ———————————————————————————————————————————————————————————

export async function rateClaimsV2(
  claims: AtomicClaim[],
  opts?: { timeoutMs?: number; model?: string }
): Promise<Record<string, ScoreSet>> {
  if (!claims.length) return {};

  const items = claims.map((c) => ({
    claim_canonical_id: c.canonical_id,
    claim: c.text,
  }));

  const user = RATER_MULTI_V2.replace("<<<ITEMS>>>", JSON.stringify(items, null, 2));

  const { data } = await runLLMJson({
    system: RATER_SYSTEM,
    user,
    model: opts?.model ?? "gpt-4o-mini-json",
    timeoutMs: opts?.timeoutMs ?? 2200,
  });

  const out: Record<string, ScoreSet> = {};
  const rows = Array.isArray((data as any)?.ratings) ? (data as any).ratings : [];
  for (const row of rows) {
    const cid = String(row?.claim_canonical_id || "").trim();
    if (!cid) continue;

    // Direkt in V2-Score parsen
    const parsed = ScoreSchema.safeParse({
      präzision: row?.["präzision"],
      prüfbarkeit: row?.["prüfbarkeit"],
      relevanz: row?.["relevanz"],
      lesbarkeit: row?.["lesbarkeit"],
      ausgewogenheit: row?.["ausgewogenheit"],
      begründung: {
        präzision: String(row?.begründung?.["präzision"] ?? ""),
        prüfbarkeit: String(row?.begründung?.["prüfbarkeit"] ?? ""),
        relevanz: String(row?.begründung?.["relevanz"] ?? ""),
        lesbarkeit: String(row?.begründung?.["lesbarkeit"] ?? ""),
        ausgewogenheit: String(row?.begründung?.["ausgewogenheit"] ?? ""),
      },
    });
    if (parsed.success) out[cid] = parsed.data;
  }
  return out;
}

// ———————————————————————————————————————————————————————————
// V1: Multi-Claim (Legacy) – map by claim text → anschließend Upgrade zu V2
// ———————————————————————————————————————————————————————————

export async function rateEditorialV1(
  claims: AtomicClaim[],
  timeoutMs = 8000
): Promise<{ ratings: Record<string, ScoreSet> }> {
  if (!claims.length) return { ratings: {} };

  const payload = { claims: claims.map((c) => ({ text: c.text })) };
  const prompt = EDITOR_RATER_V1.replace("<<<CLAIMS>>>", JSON.stringify(payload, null, 2));

  const r = await runOpenAI(prompt, { json: true, timeoutMs });
  if (!r.ok) return { ratings: {} };

  let json: any = null;
  try {
    json = JSON.parse(r.text || "{}");
  } catch {
    return { ratings: {} };
  }

  const mapTextToScore: Record<string, ScoreSet> = {};
  const arr = Array.isArray(json?.ratings) ? json.ratings : [];
  for (const row of arr) {
    const t = String(row?.claim || "").trim();
    if (!t) continue;

    // Legacy-Werte einsammeln und in V2-ScoreSet heben
    const legacy = {
      praezision: Number(row?.praezision ?? 0),
      pruefbarkeit: Number(row?.pruefbarkeit ?? 0),
      relevanz: Number(row?.relevanz ?? 0),
      lesbarkeit: Number(row?.lesbarkeit ?? 0),
      ausgewogenheit: Number(row?.ausgewogenheit ?? 0),
      gruende: Array.isArray(row?.gruende) ? row.gruende.slice(0, 5) : [],
      total: 0,
    };
    // total (legacy) ist egal – ScoreSchema besitzt kein total
    mapTextToScore[t] = upgradeLegacyScore(legacy);
  }

  return { ratings: mapTextToScore };
}

// ———————————————————————————————————————————————————————————
// Unified: Multi-Claim Best-Effort – bevorzugt V2; Fallback V1→V2
// Rückgabe: Record<canonical_id, ScoreSet>
// ———————————————————————————————————————————————————————————

export async function rateClaims(
  claims: AtomicClaim[],
  opts?: { timeoutMs?: number; model?: string; prefer?: "v2" | "v1" | "auto" }
): Promise<Record<string, ScoreSet>> {
  const prefer = opts?.prefer ?? "auto";
  if (!claims.length) return {};

  if (prefer === "v2") {
    return rateClaimsV2(claims, opts);
  }

  if (prefer === "v1") {
    const legacy = await rateEditorialV1(claims, opts?.timeoutMs ?? 20000);
    const map: Record<string, ScoreSet> = {};
    for (const c of claims) {
      const s = legacy.ratings[c.text];
      if (s) map[c.canonical_id] = ScoreSchema.parse(s);
    }
    return map;
  }

  // auto
  const v2 = await rateClaimsV2(claims, opts);
  const hasAny = Object.keys(v2).length > 0;
  if (hasAny) return v2;

  const legacy = await rateEditorialV1(claims, opts?.timeoutMs ?? 20000);
  const map: Record<string, ScoreSet> = {};
  for (const c of claims) {
    const s = legacy.ratings[c.text];
    if (s) map[c.canonical_id] = ScoreSchema.parse(s);
  }
  return map;
}
