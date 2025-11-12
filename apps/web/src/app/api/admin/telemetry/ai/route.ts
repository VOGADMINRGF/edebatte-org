import { NextResponse } from "next/server";
import { providerEntries, type ProviderName } from "@features/ai/providers";

type ProvRow = {
  name: ProviderName;
  label: string;
  ok: boolean;
  skipped?: boolean;
  code: number;
  note?: string;
};

const META: Record<ProviderName, { label: string; envKeys: string[]; note?: string }> = {
  openai:    { label: "OpenAI",    envKeys: ["OPENAI_API_KEY"] },
  anthropic: { label: "Anthropic", envKeys: ["ANTHROPIC_API_KEY"] },
  mistral:   { label: "Mistral",   envKeys: ["MISTRAL_API_KEY"] },
  gemini:    { label: "Gemini",    envKeys: ["GOOGLE_GENERATIVE_AI_API_KEY","GEMINI_API_KEY"] },
};

export async function GET() {
  const providers: ProvRow[] = providerEntries.map(([name]) => {
    const meta = META[name];
    const hasKey = (meta?.envKeys ?? []).some((k) => !!process.env[k]);
    return hasKey
      ? { name, label: meta?.label ?? name, ok: true, code: 200, note: meta?.note ?? "Key vorhanden" }
      : { name, label: meta?.label ?? name, ok: false, skipped: true, code: 202, note: "Kein API-Key gesetzt" };
  });

  return NextResponse.json({ providers, ts: new Date().toISOString() });
}
