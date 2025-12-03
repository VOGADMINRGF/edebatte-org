// apps/web/src/app/dashboard/admin/routes/page.tsx
import fs from "node:fs/promises";
import path from "node:path";
import RoutesTableClient from "./RoutesTableClient";

export const runtime = "nodejs";

type RouteAccess = "public" | "auth" | "admin" | "system";

type RouteInfo = {
  route: string;
  file: string;
  depth: number;
  outgoing: string[];
};

type RouteAccessConfig = Record<
  string,
  {
    access: RouteAccess;
    comment?: string;
  }
>;

type RouteRow = {
  route: string;
  file: string;
  depth: number;
  access: RouteAccess;
  comment: string;
  isOverride: boolean;
  outgoing: string[];
  incoming: string[];
  outgoingCount: number;
  incomingCount: number;
};

const CONFIG_PATH = path.resolve(process.cwd(), "config/routeAccess.json");
const APP_ROOT = path.resolve(process.cwd(), "src/app");

// ---------- Helpers: Config ----------

async function readConfig(): Promise<RouteAccessConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as RouteAccessConfig;
  } catch {
    return {};
  }
}

function inferAccess(route: string): RouteAccess {
  if (route.startsWith("/dashboard/admin")) return "admin";
  if (route.startsWith("/dashboard")) return "auth";
  if (route.startsWith("/api")) return "system";
  return "public";
}

// ---------- Helpers: Routing & Links ----------

function extractLinksFromSource(source: string): string[] {
  const result = new Set<string>();

  // href="/foo" oder href='/foo' oder href={`/foo`}
  const hrefRegex = /href\s*=\s*["'`](\/[^"'`>\s]*)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(source))) {
    const target = m[1].trim();
    if (target.startsWith("/")) {
      result.add(target.replace(/\/+$/, "") || "/");
    }
  }

  return [...result];
}

async function scanRoutes(
  dir: string,
  segments: string[] = [],
): Promise<RouteInfo[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const files = entries.filter((e) => e.isFile());
  const dirs = entries.filter((e) => e.isDirectory());

  const results: RouteInfo[] = [];

  const pageFile = files.find(
    (f) => f.name === "page.tsx" || f.name === "page.ts",
  );

  if (pageFile) {
    const pagePath = path.join(dir, pageFile.name);
    const relFile = path.relative(process.cwd(), pagePath);

    const rawRoute = "/" + segments.join("/");
    const route = rawRoute === "/" ? "/" : rawRoute.replace(/\/+/g, "/");

    let outgoing: string[] = [];
    try {
      const src = await fs.readFile(pagePath, "utf8");
      outgoing = extractLinksFromSource(src);
    } catch {
      outgoing = [];
    }

    results.push({
      route,
      file: relFile,
      depth: segments.length,
      outgoing,
    });
  }

  for (const sub of dirs) {
    let name = sub.name;

    if (name.startsWith("_")) continue;
    if (name.startsWith("(") && name.endsWith(")")) continue;

    const nextDir = path.join(dir, name);
    const nextSegments = [...segments];

    if (name.startsWith("@")) {
      name = name.slice(1);
    }
    if (name.startsWith("[") && name.endsWith("]")) {
      name = ":" + name.slice(1, -1);
    }

    nextSegments.push(name);

    const subRoutes = await scanRoutes(nextDir, nextSegments);
    results.push(...subRoutes);
  }

  return results;
}

// ---------- Page (Server Component) ----------

export default async function RoutesDashboardPage() {
  const [routes, cfg] = await Promise.all([
    scanRoutes(APP_ROOT),
    readConfig(),
  ]);

  const byRoute = new Map<string, RouteInfo>();
  for (const r of routes) byRoute.set(r.route, r);

  // Incoming Links berechnen
  const incomingMap = new Map<string, string[]>();
  for (const r of routes) {
    for (const target of r.outgoing) {
      if (!byRoute.has(target)) continue;
      const arr = incomingMap.get(target) ?? [];
      arr.push(r.route);
      incomingMap.set(target, arr);
    }
  }

  const rows: RouteRow[] = routes
    .map((r) => {
      const override = cfg[r.route];
      const access = override?.access ?? inferAccess(r.route);
      const comment = override?.comment ?? "";

      const outgoing = r.outgoing.filter((t) => byRoute.has(t));
      const incoming = incomingMap.get(r.route) ?? [];

      return {
        route: r.route,
        file: r.file,
        depth: r.depth,
        access,
        comment,
        isOverride: !!override,
        outgoing,
        incoming,
        outgoingCount: outgoing.length,
        incomingCount: incoming.length,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Routen-Übersicht &amp; Zugriffsrechte
          </h1>
          <p className="text-sm text-slate-600">
            Alle <code>page.tsx</code>-Routen werden dynamisch aus{" "}
            <code>src/app</code> gelesen. Access, Kommentare und Link-Infos
            werden hier verwaltet. Löschen entfernt die entsprechende{" "}
            <code>page.tsx</code>-Datei.
          </p>
        </header>

        <RoutesTableClient initialRows={rows} appRoot={APP_ROOT} />
      </section>
    </main>
  );
}
