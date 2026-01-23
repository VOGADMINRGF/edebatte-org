import type { StepDefinition } from "../types";
import { pipeResult } from "../util";
import { sha256 } from "@/lib/analysis";

const mem = new Map<string, any>();
const keyOf = (text:string)=> sha256(text + "|" + (process.env.OPENAI_MODEL||"gpt-5.0"));

export const cacheStep: StepDefinition = {
  id: "cache",
  label: "Cache prüfen",
  async run(ctx, send){
    const key = keyOf(ctx.text);
    if (mem.has(key)){
      const r = mem.get(key);
      send("status", { step: "cache", msg: "Treffer – nutze Cache" });
      pipeResult(send, r);
      return { result: r, data: { cacheKey: key, cached: true } };
    }
    return { data: { cacheKey: key, cached: false } };
  }
};

export function putCache(key:string, value:any){ mem.set(key, value); }
