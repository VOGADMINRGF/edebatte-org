import { NextRequest, NextResponse } from "next/server";
import { getGraphDriver } from "@core/graph/driver";
import { getStaffContext } from "../../../eventualities/helpers";
import { logger } from "@core/observability/logger";
import { maskUserId } from "@core/pii/redact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const staff = await getStaffContext(req);
  if (staff.response) return staff.response;
  const ctx = staff.context;
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const driver = getGraphDriver();
  if (!driver) {
    return NextResponse.json({ ok: false, error: "graph_unavailable" }, { status: 503 });
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `
      CALL { MATCH (s:Statement) RETURN count(DISTINCT s) AS totalStatements }
      CALL { MATCH (e:Eventuality) RETURN count(DISTINCT e) AS totalEventualities }
      CALL { MATCH (c:Consequence) RETURN count(DISTINCT c) AS totalConsequences }
      CALL { MATCH (r:Responsibility) RETURN count(DISTINCT r) AS totalResponsibilities }
      CALL { MATCH (rp:ResponsibilityPath) RETURN count(DISTINCT rp) AS totalResponsibilityPaths }
      CALL {
        MATCH (resp:Responsibility)
        WITH coalesce(resp.level, "unknown") AS level, count(resp) AS responsibilityCount
        RETURN collect({ level, responsibilityCount }) AS responsibilitiesByLevel
      }
      CALL {
        MATCH (step:ResponsibilityStep)
        WITH coalesce(step.level, "unknown") AS level, count(step) AS pathCount
        RETURN collect({ level, pathCount }) AS stepsByLevel
      }
      RETURN totalStatements, totalEventualities, totalConsequences, totalResponsibilities, totalResponsibilityPaths,
             responsibilitiesByLevel, stepsByLevel
      `,
    );

    const record = result.records[0];
    const summary = {
      totalStatements: record?.get("totalStatements") ?? 0,
      totalEventualities: record?.get("totalEventualities") ?? 0,
      totalConsequences: record?.get("totalConsequences") ?? 0,
      totalResponsibilities: record?.get("totalResponsibilities") ?? 0,
      totalResponsibilityPaths: record?.get("totalResponsibilityPaths") ?? 0,
      byLevel: mergeLevels(
        (record?.get("responsibilitiesByLevel") as Array<any>) ?? [],
        (record?.get("stepsByLevel") as Array<any>) ?? [],
      ),
    };

    logger.info(
      {
        zone: "PII_ZONES_E150",
        action: "graph_impact_summary",
        userIdMasked: maskUserId(ctx.userId),
      },
      "Admin fetched graph impact summary",
    );

    return NextResponse.json({ ok: true, summary });
  } catch (error: any) {
    logger.error(
      {
        zone: "PII_ZONES_E150",
        action: "graph_impact_summary_error",
        userIdMasked: maskUserId(ctx.userId),
        reason: error?.message ?? String(error),
      },
      "Failed to fetch graph impact summary",
    );
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  } finally {
    await session.close();
  }
}

function mergeLevels(
  responsibilitiesByLevel: Array<{ level: string; responsibilityCount: number }> = [],
  stepsByLevel: Array<{ level: string; pathCount: number }> = [],
) {
  const map = new Map<string, { level: string; responsibilityCount: number; pathCount: number }>();

  responsibilitiesByLevel.forEach((entry) => {
    const level = entry.level ?? "unknown";
    map.set(level, {
      level,
      responsibilityCount: entry.responsibilityCount ?? 0,
      pathCount: 0,
    });
  });

  stepsByLevel.forEach((entry) => {
    const level = entry.level ?? "unknown";
    const existing = map.get(level) ?? { level, responsibilityCount: 0, pathCount: 0 };
    existing.pathCount = entry.pathCount ?? 0;
    map.set(level, existing);
  });

  return [...map.values()].sort((a, b) => b.responsibilityCount + b.pathCount - (a.responsibilityCount + a.pathCount));
}
