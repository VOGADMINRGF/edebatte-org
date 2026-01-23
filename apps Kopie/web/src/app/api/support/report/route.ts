// apps/web/src/app/api/support/report/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// weich einbinden: niemals die API crashen, wenn metrics fehlt
async function recordUsageSafe(e:any){
  try{
    const m = await import("@/lib/metrics/usage");
    const f = (m as any)?.recordUsage;
    if (typeof f === "function") await f(e);
  }catch{}
}

export async function POST(req: NextRequest){
  const t0 = Date.now();
  try{
    const body = await req.json().catch(()=> ({}));
    const id = `sr_${t0}_${Math.random().toString(36).slice(2,8)}`;

    // einfache Protokollierung (Serverlog)
    console.warn("[support-report]", id, JSON.stringify({
      source: body?.source, tookMs: body?.tookMs, meta: body?.meta, textLen: body?.textLen, env: body?.env
    }));

    // optional: Usage protokollieren (non-blocking)
    recordUsageSafe({
      ts: Date.now(),
      route: "/api/support/report",
      userId: null,
      model: null,
      totalTokens: null,
      ms: Date.now()-t0,
      ok: true,
      err: null,
      meta: { source: body?.source||null, tookMs: body?.tookMs||null }
    }).catch(()=>{});

    return NextResponse.json({ ok:true, id }, { status: 200 });
  }catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 200 });
  }
}
