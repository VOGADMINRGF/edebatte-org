import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type Stance='<<'|'<'|'~'|'>'|'>>';
export async function POST(req: NextRequest){
  const _ = await req.json().catch(()=>({text:""}));
  // Demo: generische, aber plausible Stance-Varianten
  const v = (s:Stance, thesis:string, verified=false)=>({
    stance:s, thesis, proposals:["Maßnahme A","Maßnahme B"], tradeoffs:["Kosten","Zielkonflikt"],
    evidence:[{title:"Pressebericht",url:"#",kind:"press"},{title:"Offizielles Dokument",url:"#",kind:"official"}],
    status: verified? "verified" : "fragment", trust: verified? 0.88 : 0.58
  });
  const variants = [
    v('<<',"Maximaler Eingriff / radikale Änderung", false),
    v('<',"Moderate Reform / gezielte Steuerung", true),
    v('~',"Kompromiss-Variante / abgestuft", true),
    v('>',"Moderates Bewahren / marktnahe Lösung", false),
    v('>>',"Konservativ / keine Änderung, Alternativen prüfen", false),
  ];
  const coverage = variants.filter(x=>!!x).length/5;
  const symmetry = 0.72;
  return NextResponse.json({ coverageScore: coverage, symmetry, variants, missing: [] });
}
