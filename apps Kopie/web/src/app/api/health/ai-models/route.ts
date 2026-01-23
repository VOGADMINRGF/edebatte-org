export const runtime = "nodejs";
import { NextResponse } from "next/server";

async function listOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    return { provider: "openai", skipped: true, models: [] as string[] };
  const r = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!r.ok)
    return {
      provider: "openai",
      error: `HTTP ${r.status}`,
      models: [] as string[],
    };
  const j = await r.json();
  const names = Array.isArray(j?.data)
    ? j.data.map((m: any) => m.id).slice(0, 200)
    : [];
  return { provider: "openai", models: names };
}

async function listAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return { provider: "anthropic", skipped: true, models: [] as string[] };
  const r = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    cache: "no-store",
  });
  if (!r.ok)
    return {
      provider: "anthropic",
      error: `HTTP ${r.status}`,
      models: [] as string[],
    };
  const j = await r.json();
  const names = Array.isArray(j?.data)
    ? j.data.map((m: any) => m.id).slice(0, 200)
    : [];
  return { provider: "anthropic", models: names };
}

async function listMistral() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key)
    return { provider: "mistral", skipped: true, models: [] as string[] };
  const r = await fetch("https://api.mistral.ai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!r.ok)
    return {
      provider: "mistral",
      error: `HTTP ${r.status}`,
      models: [] as string[],
    };
  const j = await r.json();
  const names = Array.isArray(j?.data)
    ? j.data.map((m: any) => m.id).slice(0, 200)
    : [];
  return { provider: "mistral", models: names };
}

async function listGemini() {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key)
    return { provider: "gemini", skipped: true, models: [] as string[] };
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`,
    { cache: "no-store" },
  );
  if (!r.ok)
    return {
      provider: "gemini",
      error: `HTTP ${r.status}`,
      models: [] as string[],
    };
  const j = await r.json();
  const names = Array.isArray(j?.models)
    ? j.models.map((m: any) => m.name).slice(0, 200)
    : [];
  return { provider: "gemini", models: names };
}

async function listAri() {
  const base = process.env.ARI_BASE_URL;
  const key = process.env.ARI_API_KEY;
  if (!base) return { provider: "ari", skipped: true, models: [] as string[] };
  // z.B. eigenes /v1/models oder /health/models Endpoint in ARI
  const u = `${base.replace(/\/+$/, "")}/v1/models`;
  const r = await fetch(u, {
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    cache: "no-store",
  });
  if (!r.ok)
    return {
      provider: "ari",
      error: `HTTP ${r.status}`,
      models: [] as string[],
    };
  const j = await r.json().catch(() => ({}));
  const names = (
    Array.isArray(j?.data)
      ? j.data.map((m: any) => m.id)
      : Array.isArray(j?.models)
        ? j.models.map((m: any) => m.id || m.name)
        : []
  ).slice(0, 200);
  return { provider: "ari", models: names };
}

export async function GET() {
  const [openai, anthropic, mistral, gemini, ari] = await Promise.all([
    listOpenAI(),
    listAnthropic(),
    listMistral(),
    listGemini(),
    listAri(),
  ]);
  return NextResponse.json({
    ts: new Date().toISOString(),
    providers: [openai, anthropic, mistral, gemini, ari],
  });
}
