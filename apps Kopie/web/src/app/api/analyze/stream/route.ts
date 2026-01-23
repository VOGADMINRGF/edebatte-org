import { NextRequest } from "next/server";
import { orchestrateMany } from '../../../../../../../features/ai/orchestrator_many';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text")||"").trim();
  const enc = new TextEncoder();

  return new Response(new ReadableStream({
    async start(controller){
      const send = (event:string, data:any)=>
        controller.enqueue(enc.encode(`event:${event}\ndata:${JSON.stringify(data)}\n\n`));
      try{
        if(!text){ send("error",{msg:"Kein Text übergeben."}); controller.close(); return; }
        send("status",{step:"extract", msg:"Extrahiere Statements…"});
        const res = await orchestrateMany(text);
        send("status",{step:"compose", msg:"Bewerte & ergänze…"});
        send("result", res);
      }catch(e:any){
        send("error",{msg:String(e?.message||e)});
      }finally{
        controller.close();
      }
    }
  }), {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" }
  });
}
