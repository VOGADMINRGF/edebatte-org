// apps/web/src/app/api/export/items/route.ts
export const runtime = "nodejs";

export async function GET() {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return new Response("export_disabled", {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

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
    take: 1000,
  });

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
    // CSV escaping nach RFC 4180
    return v.includes(",") || v.includes("\n") || v.includes('"')
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  };

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const it of items) {
    const row = [
      it.id,
      it.kind, // Prisma-Enums → stringified
      it.status,
      it.locale,
      it.topic?.slug ?? "",
      it.title ?? "",
      (it.text ?? "").replace(/\s+/g, " ").slice(0, 500),
      it.publishAt?.toISOString() ?? "",
      it.expireAt?.toISOString() ?? "",
      it.regionEffective?.code ?? "",
      (it.answerOptions ?? []).map((o: any) => `${o.label}:${o.value}`).join("|"),
    ].map(esc);

    lines.push(row.join(","));
  }

  // BOM + CRLF für Excel-Kompatibilität
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

async function getPrismaClient() {
  if (!process.env.WEB_DATABASE_URL) return null;
  const mod = await import("@/lib/prisma");
  return mod.prisma;
}
