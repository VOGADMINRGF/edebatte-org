import { NextRequest } from "next/server";
import { prisma } from "@db/web";
import { ok, err } from "src/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const take = Math.min(parseInt(searchParams.get("take") || "50", 10), 100);

    const where = q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

    const regions = await prisma.region.findMany({
      where,
      orderBy: [{ level: "asc" }, { code: "asc" }],
      take,
      select: { id: true, code: true, name: true, level: true },
    });

    return ok(regions, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    console.error("GET /api/editor/regions failed:", e);
    return err(500, "Failed");
  }
}
