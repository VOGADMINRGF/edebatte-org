import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function POST(req: NextRequest){
  const { text } = await req.json().catch(()=>({text:""}));
  const base = new URL(req.url);

  const similarUrl = new URL("/api/statements/similar", base);
  similarUrl.searchParams.set("text", String(text||""));

  const [similarRes, polishRes] = await Promise.all([
    fetch(similarUrl, { cache:"no-store" }).then(r=>r.json()).catch(()=>({ kind:"none" })),
    fetch(new URL("/api/quality/polish", base), {
      method:"POST", headers:{ "content-type":"application/json" }, cache:"no-store",
      body: JSON.stringify({ text })
    }).then(r=>r.json()).catch(()=>({ improved:String(text||""), notes:[], claimsHint:null }))
  ]);

  return NextResponse.json({ similar: similarRes, polish: polishRes });
}
