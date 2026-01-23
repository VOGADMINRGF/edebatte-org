
import { NextResponse } from "next/server";
export async function GET() {
  // Upstash REST (falls Keys fehlen, liefern wir ok:false)
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ ok:false, reason:"missing upstash env" }, { status: 200 });
  try {
    const res = await fetch(url + "/GET/health-key", { headers: { Authorization: `Bearer ${token}` } });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
