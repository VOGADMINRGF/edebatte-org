import { NextResponse } from "next/server";
import {
  VOG_PROGRAMME_FEED_CONTRACT_VERSION,
  getMandateRuntimeRepo,
  toPublicVoiceOpenGovMandate,
} from "@features/mandate/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mandates = await getMandateRuntimeRepo().listPublicBinding();

    return NextResponse.json(
      {
        ok: true,
        source: "runtime",
        contractVersion: VOG_PROGRAMME_FEED_CONTRACT_VERSION,
        generatedAt: new Date().toISOString(),
        mandates: mandates.map(toPublicVoiceOpenGovMandate),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.warn("[public-vog-mandate-feed] runtime unavailable", {
      code:
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code ?? "unknown").slice(0, 48)
          : "unknown",
    });

    return NextResponse.json(
      {
        ok: false,
        source: "runtime",
        contractVersion: VOG_PROGRAMME_FEED_CONTRACT_VERSION,
        error: "mandate_runtime_unavailable",
        mandates: [],
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
