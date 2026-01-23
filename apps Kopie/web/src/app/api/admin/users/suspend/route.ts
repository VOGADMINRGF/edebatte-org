/* @ts-nocheck */
import { NextRequest, NextResponse } from "next/server";
// hier später: runOrchestratedTask(task, vars)
export async function POST(req: NextRequest) {
  const { task, draftId, vars } = await req.json().catch(()=>({}));
  if (!task || !draftId) {
    return NextResponse.json({ ok:false, error:"task/draftId missing" }, { status:400 });
  }
  console.log("[ai.run]", { task, draftId, vars });
  // TODO: echte Orchestrator-Anbindung
  return NextResponse.json({ ok:true, task, draftId, status:"accepted" });
}
