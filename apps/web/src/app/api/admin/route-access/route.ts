// apps/web/src/app/api/admin/route-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type RouteAccess = "public" | "auth" | "admin" | "system";

type RouteAccessConfig = Record<
  string,
  {
    access: RouteAccess;
    comment?: string;
  }
>;

const CONFIG_PATH = path.resolve(process.cwd(), "config/routeAccess.json");

async function readConfig(): Promise<RouteAccessConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as RouteAccessConfig;
  } catch {
    return {};
  }
}

async function writeConfig(config: RouteAccessConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export async function GET() {
  const cfg = await readConfig();
  return NextResponse.json({ ok: true, data: cfg });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const rows = Array.isArray(body?.routes) ? body.routes : [];
  const nextCfg: RouteAccessConfig = {};

  for (const row of rows) {
    if (!row || typeof row.route !== "string") continue;
    const route = row.route.trim();
    if (!route) continue;

    const access = (row.access || "public") as RouteAccess;
    const comment =
      typeof row.comment === "string" && row.comment.trim().length > 0
        ? row.comment.trim()
        : undefined;

    nextCfg[route] = { access, ...(comment ? { comment } : {}) };
  }

  await writeConfig(nextCfg);

  return NextResponse.json({ ok: true });
}
