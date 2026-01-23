import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest){
  const text = String(req.nextUrl.searchParams.get("text")||"").toLowerCase();
  if(/tourist|touristen|abzocke/.test(text)){
    return NextResponse.json({ kind:"verified", stmt:{ id:"stmt-verified-001", title:"Faire Preise in Tourismuslagen der EU", trust:0.92, version:3, evidenceCount:7, sim:0.91 }});
  }
  if(/öpnv|tram|straßenbahn|nahverkehr|bvg|köpenick/.test(text)){
    return NextResponse.json({ kind:"cluster", clusterId:"clu-berlin-tram", top:[
      { id:"stmt-berlin-tram-a", title:"Straßenbahn Ostkreuz–Köpenick ausbauen", trust:0.62, evidenceCount:2, sim:0.82 },
      { id:"stmt-berlin-tram-b", title:"Kostenloser ÖPNV in Berlin", trust:0.55, evidenceCount:1, sim:0.78 }
    ]});
  }
  return NextResponse.json({ kind:"none" });
}
