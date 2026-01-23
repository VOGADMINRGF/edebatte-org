import { NextRequest, NextResponse } from "next/server";
import { getGraphDriver } from "@core/graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const driver = getGraphDriver();
  if (!driver) {
    return NextResponse.json(
      { ok: false, error: "Graph backend not configured (NEO4J_* envs missing)" },
      { status: 501 },
    );
  }

  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");
  const locale = searchParams.get("locale");
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

  const session = driver.session();
  try {
    const statsResult = await session.run(
      `
      MATCH (s:Statement)
      WHERE ($topic IS NULL OR s.topic = $topic)
        AND ($locale IS NULL OR s.locale = $locale)
      WITH coalesce(s.topic, "unassigned") AS topic,
           coalesce(s.responsibility, "unknown") AS responsibility,
           count(*) AS statements
      RETURN topic, responsibility, statements
      ORDER BY statements DESC
      LIMIT $limit
      `,
      { topic, locale, limit },
    );

    const statementsResult = await session.run(
      `
      MATCH (s:Statement)
      WHERE ($topic IS NULL OR s.topic = $topic)
        AND ($locale IS NULL OR s.locale = $locale)
      RETURN s
      ORDER BY s.updatedAt DESC
      LIMIT $limit
      `,
      { topic, locale, limit },
    );

    return NextResponse.json({
      ok: true,
      filters: { topic, locale },
      stats: statsResult.records.map((record) => ({
        topic: record.get("topic"),
        responsibility: record.get("responsibility"),
        statements: record.get("statements"),
      })),
      sampleStatements: statementsResult.records.map((record) => record.get("s")),
    });
  } catch (error) {
    console.error("[reports/topic] error", error);
    return NextResponse.json({ ok: false, error: "Failed to build report" }, { status: 500 });
  } finally {
    await session.close();
  }
}
