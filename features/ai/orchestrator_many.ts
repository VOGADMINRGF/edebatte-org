import { extractCandidates } from "../../apps/web/src/modules/ai/roles/extractor";
import { orchestrateClaim } from "./orchestrator_claims";

export type OrchestratedMany = {
  statements: Awaited<ReturnType<typeof orchestrateClaim>>[];
  meta: { total:number; tookMs:number };
};

export async function orchestrateMany(input: string): Promise<OrchestratedMany>{
  const t0 = Date.now();
  const cand = await extractCandidates(input).catch(()=>[]);
  const targets = (cand.length ? cand : [input]).slice(0,8);
  const results = await Promise.all(
    targets.map(txt => orchestrateClaim(txt).catch(e => ({ error:String(e), claim:{ text:txt, readability:"B1" } as any })))
  );
  return { statements: results as any, meta: { total: results.length, tookMs: Date.now()-t0 } };
}
