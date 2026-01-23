import { NextResponse } from "next/server";
export async function GET(){ return NextResponse.json({ ok:false, reason:"not-implemented" }, { status:501 }); }
