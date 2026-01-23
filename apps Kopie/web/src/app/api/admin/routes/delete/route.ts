// apps/web/src/app/api/admin/routes/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const CONFIG_PATH = path.resolve(process.cwd(), "config/routeAccess.json");
const APP_ROOT = path.resolve(process.cwd(), "src/app");

type RouteAccess = "public" | "auth" | "admin" | "system";

type RouteAccessConfig = Record<
  string,
  {
    access: RouteAccess;
    comment?: string;
  }
>;

async function readConfig(): Promise<RouteAccessConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as RouteAccessConfig;
  } catch {
    return {};
  }
}

async function writeConfig(cfg: RouteAccessConfig) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const relFile = typeof body?.file === "string" ? body.file : null;
  const route = typeof body?.route === "string" ? body.route : null;

  if (!relFile) {
    return NextResponse.json(
      { ok: false, error: "Feld 'file' fehlt." },
      { status: 400 },
    );
  }

  const fullPath = path.resolve(process.cwd(), relFile);

  if (!fullPath.startsWith(APP_ROOT)) {
    return NextResponse.json(
      { ok: false, error: "Pfad liegt außerhalb von src/app." },
      { status: 400 },
    );
  }

  try {
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.rm(fullPath);

      // leere Ordner nach oben hin aufräumen
      let dir = path.dirname(fullPath);
      while (dir.startsWith(APP_ROOT) && dir !== APP_ROOT) {
        try {
          const contents = await fs.readdir(dir);
          if (contents.length === 0) {
            await fs.rmdir(dir);
            dir = path.dirname(dir);
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }
  } catch (e: any) {
    if (e?.code === "ENOENT") {
      return NextResponse.json(
        { ok: false, error: "Datei nicht gefunden." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Fehler beim Löschen." },
      { status: 500 },
    );
  }

  // Access-Config aufräumen
  if (route) {
    const cfg = await readConfig();
    if (cfg[route]) {
      delete cfg[route];
      await writeConfig(cfg);
    }
  }

  return NextResponse.json({ ok: true });
}
