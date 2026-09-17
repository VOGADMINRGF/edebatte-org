import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { listCanonicalNewsletterSubscribers } from "@features/notifications/newsletterSubscriptions";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const subscribers = await listCanonicalNewsletterSubscribers();
  const items = subscribers.map((entry) => ({
    email: entry.email,
    name: entry.name,
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
    locale: entry.locale,
    briefingLevel: entry.briefingLevel,
    sources: entry.sources,
  }));

  const format = req.nextUrl.searchParams.get("format");
  if (format === "csv") {
    const rows = [
      ["email", "name", "createdAt", "locale", "briefingLevel", "sources"],
      ...items.map((i) => [
        i.email,
        i.name ?? "",
        i.createdAt ?? "",
        i.locale ?? "",
        i.briefingLevel,
        i.sources.join(","),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=newsletter.csv",
      },
    });
  }

  return NextResponse.json({ items });
}
