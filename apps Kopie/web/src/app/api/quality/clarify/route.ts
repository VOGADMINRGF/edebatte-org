import { NextRequest, NextResponse } from "next/server";

// ——— Simple LRU mit TTL, um Tippen-Spitzen abzupuffern ————————————————
type CacheRec = { value:any; exp:number };
const LRU = new Map<string,CacheRec>();
const MAX=200, TTL=5*60*1000;
function getK(k:string){ const r = LRU.get(k); if(!r) return null; if(Date.now()>r.exp){ LRU.delete(k); return null; } return r.value; }
function setK(k:string,v:any){ if(LRU.size>MAX){ const first = LRU.keys().next().value; if(first) LRU.delete(first); } LRU.set(k,{value:v,exp:Date.now()+TTL}); }

// ——— Heuristiken: schneller, deterministischer „First Guess“ ————————————
function heuristic(text:string){
  const t = text.toLowerCase();
  const hints:any = { level:"unsicher", region:null, timeframe:"unsicher", audience:"unsicher", stance:"unsicher", other:{} };

  // Ebene/Zuständigkeit
  if(/\beu(ropa)?\b/.test(t) || /kommission|parlament\s+der\s+eu/i.test(text)) hints.level="eu";
  else if(/\bbund(es)?\b/.test(t) || /bundesregierung|bundestag/i.test(text)) hints.level="bund";
  else if(/\bland\b|\blandes\b|bayern|nrw|baden[-\s]?württemberg|sachsen|berlin/i.test(text)) hints.level="land";
  else if(/\bkommune\b|\bstadt\b|\bbezirk\b|\bgemeinde\b|\brathaus\b/i.test(text)) hints.level="kommune";

  // Region
  const mCity = text.match(/\b(Berlin|Hamburg|München|Köln|Frankfurt|Stuttgart|Dresden|Leipzig|Düsseldorf|Bremen|Essen)\b/i);
  if(mCity) hints.region = mCity[0];

  // Zeitraum
  if(/letzte(n|r)?\s+12\s*mon/i.test(t)) hints.timeframe="letzte_12m";
  else if(/letzte(n|r)?\s+5\s*jahr/i.test(t)) hints.timeframe="letzte_5y";
  else if(/seit\s*1990/i.test(t)) hints.timeframe="seit_1990";
  else if(/aktuell|derzeit|momentan/i.test(t)) hints.timeframe="aktuell";

  // Audience
  if(/jugend|schüler|student/i.test(t)) hints.audience="jugend";
  else if(/unternehmen|wirtschaft|betrieb/i.test(t)) hints.audience="unternehmen";
  else if(/amt|behörde|verwaltung|staat/i.test(t)) hints.audience="staat";
  else if(/rentner|senior/i.test(t)) hints.audience="senioren";

  // Haltung (naiv)
  if(/\bgegen\b|lehne|ablehne|keine?\s+steigerung|kritisch/i.test(t)) hints.stance="contra";
  else if(/\bfür\b|unterstütze|befürworte/i.test(t)) hints.stance="pro";
  else if(/\bneutral\b|abwägen|beide seiten/i.test(t)) hints.stance="neutral";

  return hints;
}

// ——— Mini-LLM (OpenAI) mit kurzer Deadline ————————————
async function llmRefine(text:string){
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_FAST_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  if(!key) return null;

  const sys = [
    "Analysiere sehr schnell und antworte NUR als kompaktes JSON.",
    `Schema: {"hints":{"level":"eu|bund|land|kommune|unsicher","region":string|null,"timeframe":"aktuell|letzte_12m|letzte_5y|seit_1990|unsicher","audience":"jugend|unternehmen|staat|senioren|unsicher","stance":"pro|contra|neutral|unsicher"}}`
  ].join("\n");
  const body:any = { model, input: `Text:\n"""${text.slice(0,2000)}"""\nNur JSON.`, instructions: sys, text:{format:{type:"json_object"}} };

  const ctrl = AbortSignal.timeout(1500); // harte 1.5s
  const r = await fetch("https://api.openai.com/v1/responses",{
    method:"POST", headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body: JSON.stringify(body), signal: ctrl
  });
  if(!r.ok) return null;
  const j = await r.json().catch(()=> ({}));
  try{
    const parsed = JSON.parse(j?.text ?? j?.output_text ?? "{}");
    return parsed?.hints || null;
  }catch{ return null; }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req:NextRequest){
  const t0=Date.now();
  const b = await req.json().catch(()=> ({}));
  const text = String(b?.text ?? "").trim();
  if(!text) return NextResponse.json({ ok:true, tookMs:0, hints:{} },{status:200});

  const ck = "clarify:"+text.slice(0,512);
  const cached = getK(ck);
  if(cached) return NextResponse.json({ ok:true, cached:true, tookMs: 0, hints: cached }, {status:200});

  const base = heuristic(text);

  // LLM parallel, aber capped via Promise.race gegen 1.6s Timer
  let refined:any = null;
  try { refined = await Promise.race([
    llmRefine(text),
    new Promise(res=> setTimeout(()=>res(null), 1600))
  ]);}catch{}

  const merged = { ...base, ...(refined||{}) };
  setK(ck, merged);
  return NextResponse.json({ ok:true, tookMs: Date.now()-t0, hints: merged }, {status:200});
}
