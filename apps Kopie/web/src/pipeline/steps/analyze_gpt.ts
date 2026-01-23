import type { StepDefinition } from "../types";
import { analyzeWithGptJSON } from "@/lib/llm";
import { pipeResult } from "../util";
import { putCache } from "./cache";

export const analyzeGpt: StepDefinition = {
  id: "gpt",
  label: "Analyse (GPT)",
  when(ctx){ return !ctx.data?.cached; },
  async run(ctx, send){
    try{
      const r = await analyzeWithGptJSON(ctx.text);
      if (r && (Array.isArray(r.topics)||Array.isArray(r.theses))){
        const normalized = pipeResult(send, r);
        if (ctx.data?.cacheKey) putCache(ctx.data.cacheKey, normalized);
        return { result: normalized };
      }
    }catch{}
    return {};
  }
};
