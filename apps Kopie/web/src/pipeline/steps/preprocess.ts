import type { StepDefinition } from "../types";
import { extractUrls, guessLang } from "@/lib/analysis";
import { sleep } from "../util";

export const preprocess: StepDefinition = {
  id: "preprocess",
  label: "Vorverarbeitung",
  async run(ctx, send){
    const lang = guessLang(ctx.text);
    const urls = extractUrls(ctx.text);
    send("data", { kind: "pre", lang, urls });
    await sleep(80);
    return { lang, urls };
  }
};
