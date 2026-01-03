import { NextRequest, NextResponse } from "next/server";
import { feedStatementsCol } from "@features/feeds/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy SwipeDeck (apps/web/src/app/swipe) erwartet ein simples Array:
 * [{ id, title, text, createdAt }]
 *
 * Früher: Dummy Mongoose Model "@/models/core/Statement"
 * Jetzt: triMongo core -> feed_statements (Status: "readyForLive")
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);

  const col = await feedStatementsCol();
  const items = await col
    .find(
      { status: "readyForLive" },
      { projection: { title: 1, summary: 1, claims: { $slice: 1 }, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const data = items.map((d: any) => ({
    id: d._id ? String(d._id) : d.id,
    title: d.title ?? "",
    // "text" ist im alten UI der Fließtext. Wir nehmen Summary oder Claim #1.
    text: d.summary ?? d.claims?.[0]?.text ?? "",
    createdAt: d.createdAt,
  }));

  return NextResponse.json(data);
}
