import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({ q:"", limit:5 }));
  const items = [
    { title:"Stub-News 1", url:"#", ts: Date.now(), relevance:0.9 },
    { title:"Stub-News 2", url:"#", ts: Date.now()-3600_000, relevance:0.7 }
  ];
  return NextResponse.json({ ok:true, items, echo:body }, { status: 200 });
}
