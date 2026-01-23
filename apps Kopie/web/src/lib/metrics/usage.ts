import fs from "node:fs";
import path from "node:path";

export type UsageEvent = {
  ts: number;
  route: string;
  userId: string | null;
  model: string | null;
  totalTokens: number | null;
  ms: number;
  ok: boolean;
  err: string | null;
  meta?: any;
};

export async function recordUsage(e: UsageEvent){
  try{
    const base = process.env.VOG_USAGE_FILE || ".next/vog_usage.jsonl";
    const f = path.isAbsolute(base) ? base : path.join(process.cwd(), base);
    const line = JSON.stringify(e) + "\n";
    await fs.promises.mkdir(path.dirname(f), { recursive: true }).catch(()=>{});
    await fs.promises.appendFile(f, line).catch(()=>{});
  }catch{ /* niemals crashen */ }
}
