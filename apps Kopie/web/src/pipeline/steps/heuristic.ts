import type { StepDefinition } from "../types";
import { heuristicAnalyze } from "@/lib/analysis";
import { pipeResult } from "../util";
import { putCache } from "./cache";

export const heuristic: StepDefinition = {
  id: "heuristic",
  label: "Fallback-Heuristik",
  when(ctx){ return !ctx.result; },
  async run(ctx, send){
    const r = heuristicAnalyze(ctx.text);
    const normalized = pipeResult(send, r);
    if (ctx.data?.cacheKey) putCache(ctx.data.cacheKey, normalized);
    return { result: normalized };
  }
};
