
import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
export async function GET() {
  try {
    const col = await coreCol("_health");
    await col.insertOne?.({ _t: Date.now(), ok: true }).catch(()=>{});
    const ping = await col.findOne?.({});
    return NextResponse.json({ ok: true, ping: !!ping });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
