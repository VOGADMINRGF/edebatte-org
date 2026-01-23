// Finale Version 04.August 2025
// apps/web/src/utils/aiProviders.ts
import { v4 as uuidv4 } from "uuid";

// ⚠️ Diese Imports setzen voraus, dass die Pfad-Aliase für "@/lib/*" existieren.
// Falls eure libs als "@lib/*" gemappt sind, ersetze "@/lib/" unten durch "@lib/".
import {
  saveProvenance,
  saveAuditLog,
  saveAnalysisResult,
  saveMetaLayerLog,
} from "@/lib/audit";
import { callOpenAIJson } from "@features/ai/providers/openai";
import { youcomResearch as callARIAPI } from "@features/ai";
import { getPolicyRules, getImpactScoring } from "@/lib/policy";
import { findCrossRefs, runFactCheck } from "@/lib/factcheck";

// ---------- kleine Helfer ----------
function safeJSON<T = any>(raw: string, fallback: T = {} as any): T {
  try { return JSON.parse(raw); } catch { return fallback; }
}

// internes Meta-LLM für Erklärungen/Bias-Check (nutzt den gleichen OpenAI-JSON-Call)
async function callMetaLLM(opts: { input: any; instruction: string }) {
  const prompt =
    `Du bist ein Erklär-Modul. Liefere strikt JSON.\n` +
    `Anweisung:\n${opts.instruction}\n---\nEingabe:\n${JSON.stringify(opts.input)}`;
  const { text } = await callOpenAIJson(prompt);
  return safeJSON(text, { layman: "", bias: "", raw: text });
}

// ---------- 1. Metadaten / Provenance ----------
export async function extractMetadata(input: any, userContext: any) {
  const id = uuidv4();
  const meta = {
    id,
    timestamp: new Date().toISOString(),
    user: userContext?.id ?? null,
    input,
    step: "metadata",
    source: input?.url ?? null,
    ip: userContext?.ip ?? null,
    device: userContext?.device ?? null,
  };
  await saveProvenance?.(meta);
  return meta;
}

// ---------- 2. GPT-Analyse (Claims, Themen, Struktur) ----------
export async function callGPTAPI({ text, context }: { text: string; context?: any }) {
  const prompt =
    `Analysiere folgenden Bürgerbeitrag und gib strikt JSON zurück.\n` +
    `Text:\n${text}\n\nKontext:\n${JSON.stringify(context ?? {}, null, 2)}\n\n` +
    `Erwarte Schema:\n` +
    `{\n` +
    `  "region": string|null,\n` +
    `  "topics": [{"name": string, "confidence": number}],\n` +
    `  "statements": [{"text": string, "type": "ja/nein"|"skala"|"frei", "polarity": "niedrig"|"mittel"|"hoch"}],\n` +
    `  "suggestions": string[],\n` +
    `  "isNewContext": boolean\n` +
    `}`;
  const { text: out } = await callOpenAIJson(prompt);
  const gptResult = safeJSON(out, {});
  await saveAuditLog?.({ step: "gpt-analysis", payload: gptResult, timestamp: new Date().toISOString() });
  return gptResult;
}

// ---------- 3. ARI-Analyse (Research/Orchestrator) ----------
export async function runARIAnalysis({ text, gptData, meta, context }: any) {
  // youcomResearch erwartet normalerweise eine Query (string).
  // Wir hängen die GPT-Struktur komprimiert an, damit der Research zielgerichtet ist.
  const query = `${text}\n\nHINTS:${JSON.stringify({
    topics: gptData?.topics?.slice?.(0, 5) ?? [],
    statements: (gptData?.statements ?? []).slice(0, 5),
    region: gptData?.region ?? null,
  })}`;
  const ariRaw = await callARIAPI(query).catch(() => null);
  await saveAuditLog?.({ step: "ari-analysis", payload: ariRaw, timestamp: new Date().toISOString() });
  return { ariRaw };
}

// ---------- 4. Policy/Impact-Kontext ----------
export async function runContextualization({ gptData, ariData, meta }: any) {
  const policy = (await getPolicyRules?.(gptData, ariData)) ?? {};
  const impact = (await getImpactScoring?.(gptData, ariData)) ?? {};
  return { policy, impact };
}

// ---------- 5. Meta-Layer (CrossRefs, Factcheck, Erklärung, Bias) ----------
export async function runMetaLayer({ gptData, ariData, meta }: any) {
  const statements = gptData?.statements ?? [];
  const crossRefs = (await findCrossRefs?.(statements)) ?? [];
  const factCheck = (await runFactCheck?.(statements)) ?? [];
  const explain = await callMetaLLM({
    input: { gptData, ariData, meta, crossRefs, factCheck },
    instruction: "Erkläre die KI-Entscheidungen für Laien, prüfe auf Bias/Ethik/Policy und liefere JSON-Felder: { layman, bias }.",
  });
  await saveMetaLayerLog?.({
    step: "meta-layer",
    crossRefs,
    factCheck,
    explain,
    timestamp: new Date().toISOString(),
  });
  return { crossRefs, factCheck, explain };
}

// ---------- 6. Audit / Chain-of-Trust ----------
export async function finalizeAuditTrail(
  meta: any,
  gptData: any,
  ariData: any,
  metaResult: any,
  context: any,
) {
  const audit = {
    meta,
    gptData,
    ariData,
    metaResult,
    timestamp: new Date().toISOString(),
    user: context?.user ?? null,
  };
  await saveAnalysisResult?.(audit);
  return audit;
}

// ---------- 7. Main Orchestrator ----------
export async function analyzeContributionE120(input: any, userContext: any) {
  // 1) Metadata
  const meta = await extractMetadata(input, userContext);

  // 2) GPT (Claims, Topics, Structure)
  const gptData = await callGPTAPI({ text: input.text, context: userContext });

  // 3) ARI (Research / Orchestrator)
  const ariData = await runARIAnalysis({ text: input.text, gptData, meta, context: userContext });

  // 4) Policy/Impact
  const contextResult = await runContextualization({ gptData, ariData, meta });

  // 5) Meta-Layer (Bias, Ethics, Factcheck, Erklärungen)
  const metaResult = await runMetaLayer({ gptData, ariData, meta });

  // 6) Audit Trail
  const audit = await finalizeAuditTrail(meta, gptData, ariData, metaResult, userContext);
  const gptAny = gptData as any;
  const statements = Array.isArray(gptAny?.statements)
    ? gptAny.statements.slice(0, 10)
    : [];
  const topics = Array.isArray(gptAny?.topics) ? gptAny.topics : [];

  // 7) Compose Ergebnis
  return {
    ...audit,
    statements,
    topics,
    level: gptAny?.level ?? null,
    context: contextResult ?? null,
    suggestions: gptAny?.suggestions ?? [],
    translations: gptAny?.translations ?? {},
    policy: contextResult?.policy ?? null,
    impact: contextResult?.impact ?? null,
    crossRefs: metaResult?.crossRefs ?? [],
    factCheck: metaResult?.factCheck ?? [],
    laymanExplanation: metaResult?.explain?.layman ?? "",
    biasCheck: metaResult?.explain?.bias ?? "",
    provenance: meta,
    ariRaw: ariData?.ariRaw ?? null,
    gptRaw: input?.debugRaw === true ? gptData : null,
    metaLayerRaw: input?.debugRaw === true ? metaResult?.explain ?? null : null,
  };
}
