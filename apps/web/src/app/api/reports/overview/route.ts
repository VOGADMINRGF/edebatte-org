// apps/web/src/app/api/reports/overview/route.ts
import { NextRequest } from "next/server";
import { getRegionReportOverview } from "@features/reports/service";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/config/locales";
import { resolveTimeRange, type TimeRangeKey } from "@/utils/timeRange";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

function ok(data: any, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: JSON_HEADERS,
  });
}

function err(message: string, status = 400, extra: any = {}) {
  return new Response(JSON.stringify({ ok: false, error: message, ...extra }), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "DE-BB";
  const localeParam = searchParams.get("locale");
  const locale = localeParam && isSupportedLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const timeRangeParam = (searchParams.get("timeRange") as TimeRangeKey | null) || "90d";
  const { dateFrom, dateTo } = resolveTimeRange(timeRangeParam);

  try {
    const overview = await getRegionReportOverview(region, { locale, dateFrom, dateTo });
    return ok({ overview });
  } catch (e: any) {
    console.error("GET /api/reports/overview error", e);
    return err("Could not load region overview", 500, {
      reason: e?.message ?? String(e),
    });
  }
}
