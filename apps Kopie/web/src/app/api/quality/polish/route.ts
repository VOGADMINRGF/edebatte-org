import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type PolishOut = { improved: string; notes: string[]; claimsHint: { count: number; split?: string[] } | null; };

export async function POST(req: NextRequest){
  const { text } = await req.json().catch(()=>({text:""}));
  const t = String(text||"").trim();
  if(!t) return NextResponse.json({ improved:"", notes:["Kein Text."], claimsHint:null });

  try{
    const mod = await import("@/core/gpt").catch(()=>null) as any;
    const callOpenAIJson = mod?.callOpenAIJson;
    if(callOpenAIJson){
      const prompt = String.raw`You are a careful German editor.
Return STRICT JSON: {"improved":string,"notes":string[],"claimsHint":{"count":number,"split":string[]}}
Tasks:
1) Rewrite input for clarity/grammar without changing meaning.
2) Give 3-6 short notes how to tighten the statement (focus, terms, measurable).
3) Estimate how many distinct claims the text contains and suggest a split as bullet strings (max 5).
TEXT:
<<<${t}>>>`;
      const { text: out } = await callOpenAIJson(prompt, 700);
      const j = JSON.parse(out||"{}");
      const safe: PolishOut = {
        improved: String(j?.improved||t),
        notes: Array.isArray(j?.notes)? j.notes.slice(0,6) : [],
        claimsHint: j?.claimsHint && typeof j.claimsHint==="object"
          ? { count: Number(j.claimsHint.count||0), split: Array.isArray(j.claimsHint.split)? j.claimsHint.split.slice(0,5):[] }
          : { count: 1, split: [t] }
      };
      return NextResponse.json(safe);
    }
  }catch(_e){}
  const sentences = t.split(/[.!?]\s+/).filter(Boolean);
  const improved = t.replace(/\s+/g," ").trim();
  const notes = [
    "Konkreter werden (Ort/Zeitraum/Betroffene).",
    "Begriffe schärfen (was genau ist gemeint?).",
    "Falls mehrere Punkte: in getrennte Aussagen teilen.",
  ];
  return NextResponse.json({ improved, notes, claimsHint: { count: sentences.length, split: sentences.slice(0,5) } });
}
