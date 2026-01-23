import { NextResponse } from "next/server";
import { prisma } from "@db/web";

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { slug: "asc" } });
  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = String(body.slug ?? "").trim();
    const label = String(body.label ?? "").trim();
    if (!slug || !label)
      return NextResponse.json(
        { error: "slug und label erforderlich" },
        { status: 400 },
      );

    const created = await prisma.tag.create({ data: { slug, label } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Create tag failed" }, { status: 500 });
  }
}
