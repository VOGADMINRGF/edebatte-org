import { NextRequest } from "next/server";
import OpenAI from "openai";
export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-2024-08-06";

function chunk(event:string,data:any){return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`}

export async function POST(req: NextRequest) {
  const { text="", locale="de", maxClaims=12 } = await req.json().catch(()=>({}));
  const src = String(text).slice(0, 8000);
  if(!src.trim()){
    return new Response(chunk("error",{reason:"EMPTY_TEXT"}),{headers:{ "content-type":"text/event-stream" }});
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e:string,d:any)=>controller.enqueue(enc.encode(chunk(e,d)));

      try {
        // 1) Outline (Kontext-Notizen links)
        const outlineResp = await openai.responses.create({
          model: MODEL,
          input: [
            { role:"system", content:"Gliedere den Text in Abschnitte (id,label,summary,start,end). Antworte NUR als JSON: { outline: [...] }" },
            { role:"user", content:[{ type:"input_text", text: src }] }
          ],
          text:{ format:{ type:"json_schema", name:"OutlineResult", schema:{
            type:"object",additionalProperties:false,properties:{
              outline:{type:"array",items:{type:"object",additionalProperties:false,properties:{
                id:{type:"string"},label:{type:"string"},summary:{type:"string"},start:{type:"integer"},end:{type:"integer"}
              },required:["id","label","summary","start","end"]}}
            },required:["outline"]
          } as any, strict:true } }
        });
        const oRaw = (outlineResp as any).output_text;
        const outline = oRaw ? JSON.parse(oRaw).outline ?? [] : [];
        send("outline",{ outline });

        // 2) Progress (Journey: alles als "in Arbeit" → "done")
        const ids = outline.map((o:any)=>o.id);
        send("progress",{ processedIds: ids });

        // 3) Claims (Knotenbasis)
        const claimsResp = await openai.responses.create({
          model: MODEL,
          input: [
            { role:"system", content:`Extrahiere bis zu ${Math.min(20,Math.max(1,Number(maxClaims)))} atomare, neutrale Statement-Kandidaten (1 Satz, ${locale}). JSON nur { claims:[{text,title?,summary?,zustaendigkeit?,zeitraum?,ort?,sources?:string[]}] }` },
            { role:"user", content:[{ type:"input_text", text: src }] }
          ],
          text:{ format:{ type:"json_schema", name:"ClaimsResult", schema:{
            type:"object",additionalProperties:false,properties:{claims:{type:"array",items:{type:"object",additionalProperties:true,properties:{
              text:{type:"string"},title:{type:["string","null"]},summary:{type:["string","null"]},
              zustaendigkeit:{type:["string","null"]},zeitraum:{type:["string","null"]},ort:{type:["string","null"]},
              sources:{type:"array",items:{type:"string"}}
            },required:["text"]}}},required:["claims"]
          } as any, strict:true } }
        });
        const cRaw = (claimsResp as any).output_text;
        const claims = cRaw ? JSON.parse(cRaw).claims ?? [] : [];
        send("claims",{ claims });

        // 4) Questions (rechts): aus Lücken ableiten
        const questions = [];
        for(const c of claims){
          if(!c.ort || c.ort === "-") questions.push({ id: crypto.randomUUID(), text:"Für welche Region gilt das (Welt/EU/DE/Bundesland/Kommunale Ebene)?", start: outline[0]?.start ?? 0 });
          if(!c.zeitraum || c.zeitraum === "-") questions.push({ id: crypto.randomUUID(), text:"Welcher Zeitraum ist gemeint (z. B. bis 2030 / ab sofort / Stichtag)?", start: outline[0]?.start ?? 0 });
          if(!c.zustaendigkeit || c.zustaendigkeit === "-") questions.push({ id: crypto.randomUUID(), text:"Welche Zuständigkeit (EU/Bund/Land/Kommune) trifft zu?", start: outline[0]?.start ?? 0 });
        }
        if(questions.length) send("questions",{ questions });

        // 5) Knots (ganz rechts): aus Claims kurz übernehmen
        const knots = claims.slice(0,12).map((c:any,i:number)=>({ id:`k${i}`, text:String(c.title ?? c.text ?? "").slice(0,160) }));
        if(knots.length) send("knots",{ knots });

        send("done",{ ok:true });
      } catch (err:any) {
        send("error",{ reason: err?.message || "AI_ERROR" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers:{ "content-type":"text/event-stream","cache-control":"no-store","connection":"keep-alive" }});
}
