// apps/web/src/app/api/editor/items/export.csv/route.ts
export const runtime = "nodejs";

import { prisma } from "@db/web";

/**
 * GET /api/editor/items/export.csv
 * Optional query:
 *   - take: number (max 10_000)
 */
export async function GET(req: Request) {
  // ---- Query-Params ----
  const { searchParams } = new URL(req.url);
  const take = Math.min(
    Math.max(parseInt(searchParams.get("take") || "1000", 10), 1),
    10_000,
  );

  // ---- Daten ziehen ----
  const items = await prisma.contentItem.findMany({
    include: {
      regionEffective: { select: { code: true } },
      topic: { select: { slug: true } },
      answerOptions: {
        orderBy: { sortOrder: "asc" },
        select: { label: true, value: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });

  // ---- CSV aufbauen ----
  const header = [
    "id",
    "kind",
    "status",
    "locale",
    "topicSlug",
    "title",
    "text",
    "publishAt",
    "expireAt",
    "regionCode",
    "answerOptions",
  ];

  const esc = (s: unknown) => {
    const v = s == null ? "" : String(s);
    return v.includes(",") || v.includes("\n") || v.includes('"')
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  };

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const it of items) {
    const row = [
      it.id,
      it.kind, // Prisma-Enums -> als String
      it.status,
      it.locale,
      it.topic?.slug ?? "",
      it.title ?? "",
      (it.text ?? "").replace(/\s+/g, " ").slice(0, 500),
      it.publishAt?.toISOString() ?? "",
      it.expireAt?.toISOString() ?? "",
      it.regionEffective?.code ?? "",
      (it.answerOptions ?? []).map((o) => `${o.label}:${o.value}`).join("|"),
    ].map(esc);

    lines.push(row.join(","));
  }

  // BOM + CRLF für Excel
  const EOL = "\r\n";
  const csv = "\uFEFF" + lines.join(EOL) + EOL;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="items_export.csv"',
      "cache-control": "no-store",
    },
  });
}
