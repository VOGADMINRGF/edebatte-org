export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

type InventoryItem = {
  path: string;
  file: string;
  kind: "page" | "api";
};

const APP_ROOT = path.resolve(process.cwd(), "apps/web/src/app");

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const items = await scanAppRoutes();
  return NextResponse.json({ ok: true, items });
}

async function scanAppRoutes(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("_")) continue;
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      if (entry.name === "page.tsx" || entry.name === "page.ts") {
        const routePath = buildRoutePath(fullPath);
        items.push({ path: routePath, file: path.relative(APP_ROOT, fullPath), kind: "page" });
      }

      if (entry.name === "route.ts") {
        const routePath = buildRoutePath(fullPath);
        if (routePath.startsWith("/api")) {
          items.push({ path: routePath, file: path.relative(APP_ROOT, fullPath), kind: "api" });
        }
      }
    }
  }

  try {
    await walk(APP_ROOT);
  } catch {
    return [];
  }

  return items.sort((a, b) => a.path.localeCompare(b.path));
}

function buildRoutePath(fullPath: string): string {
  const rel = path.relative(APP_ROOT, fullPath);
  const segments = rel.split(path.sep);
  segments.pop();

  const filtered = segments.filter((seg) => {
    if (!seg) return false;
    if (seg.startsWith("(") && seg.endsWith(")")) return false;
    if (seg.startsWith("@")) return false;
    return true;
  });

  const mapped = filtered.map((seg) => normalizeSegment(seg));
  const pathBody = mapped.filter(Boolean).join("/");
  return `/${pathBody}`.replace(/\/+/g, "/") || "/";
}

function normalizeSegment(segment: string): string {
  if (segment.startsWith("[[...") && segment.endsWith("]]")) {
    const name = segment.slice(4, -2);
    return `:${name}*`;
  }
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    const name = segment.slice(4, -1);
    return `:${name}*`;
  }
  if (segment.startsWith("[") && segment.endsWith("]")) {
    const name = segment.slice(1, -1);
    return `:${name}`;
  }
  return segment;
}
