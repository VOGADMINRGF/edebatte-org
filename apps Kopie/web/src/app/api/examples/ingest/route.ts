import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createExampleIngest } from "@/server/exampleIngestStore";

type IngestBody = {
  exampleId: string;
  lang?: string;
  title: string;
  kind?: string;
  scope?: string;
  topics?: string[];
  country?: string;
  region?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IngestBody;
    if (!body?.exampleId || !body?.title) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const ingest = await createExampleIngest({
      exampleId: String(body.exampleId),
      lang: String(body.lang || "de"),
      title: String(body.title),
      kind: String(body.kind || ""),
      scope: String(body.scope || ""),
      topics: Array.isArray(body.topics) ? body.topics.map(String) : [],
      country: body.country ? String(body.country) : undefined,
      region: body.region ? String(body.region) : undefined,
      ua: req.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, id: ingest.id });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "unknown" }, { status: 500 });
  }
}
