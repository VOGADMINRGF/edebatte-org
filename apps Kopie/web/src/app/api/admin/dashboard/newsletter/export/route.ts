import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

type UserDoc = {
  email: string;
  name?: string | null;
  createdAt?: Date;
  settings?: { newsletterOptIn?: boolean | null };
  newsletterOptIn?: boolean | null;
};

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const users = await getCol<UserDoc>("users");
  const docs = await users
    .find(
      {
        $or: [
          { "settings.newsletterOptIn": true },
          { newsletterOptIn: true },
        ],
      },
      { projection: { email: 1, name: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .toArray();

  const items = docs.map((d) => ({
    email: d.email,
    name: d.name ?? null,
    createdAt: d.createdAt ? d.createdAt.toISOString() : null,
  }));

  const format = req.nextUrl.searchParams.get("format");
  if (format === "csv") {
    const rows = [["email", "name", "createdAt"], ...items.map((i) => [i.email, i.name ?? "", i.createdAt ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
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
