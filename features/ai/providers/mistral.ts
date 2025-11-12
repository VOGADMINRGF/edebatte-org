import type { AskArgs, AskResult } from "./types";
export async function ask(_args: AskArgs): Promise<AskResult> {
  throw new Error("Provider not configured");
}
