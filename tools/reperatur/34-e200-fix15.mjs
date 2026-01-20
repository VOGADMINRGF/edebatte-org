import fs from "fs";
import path from "path";

const repo = process.cwd();
const web = path.join(repo, "apps", "web");
const rd = (p) => fs.readFileSync(p, "utf8");
const wr = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, "utf8"); console.log("✓", path.relative(repo, p)); };
const ex = (p) => fs.existsSync(p);

// 1) notify route: 4-arg -> payload object
{
  const p = path.join(web, "src", "app", "api", "admin", "alerts", "notify", "route.ts");
  if (ex(p)) {
    let s = rd(p);
    // generisch: jede Variante mit .subject/.html/.text zusammen in einen Objektaufruf verwandeln
    s = s.replace(
      /sendAlertEmail\([\s\S]*?payload\.subject[\s\S]*?payload\.html[\s\S]*?payload\.text[\s\S]*?\)/m,
      'sendAlertEmail({ subject: payload.subject, html: payload.html, text: payload.text, to: (payload as any).to })'
    );
    wr(p, s);
  }
}

// 2) gdpr/delete: db guard
{
  const p = path.join(web, "src", "app", "api", "gdpr", "delete", "route.ts");
  if (ex(p)) {
    let s = rd(p);
    if (!/db unavailable/.test(s)) {
      s = s.replace(/const\s+db\s*=\s*await\s*getDb\([^\)]*\);?/, (m) => m + '\n  if (!db) return NextResponse.json({ ok:false, error:"db unavailable" }, { status: 500 });');
      wr(p, s);
    }
  }
}

// 3) gdpr/export: db guard
{
  const p = path.join(web, "src", "app", "api", "gdpr", "export", "route.ts");
  if (ex(p)) {
    let s = rd(p);
    if (!/db unavailable/.test(s)) {
      s = s.replace(/const\s+db\s*=\s*await\s*getDb\([^\)]*\);?/, (m) => m + '\n  if (!db) return NextResponse.json({ ok:false, error:"db unavailable" }, { status: 500 });');
      wr(p, s);
    }
  }
}

// 4) statements/create: generateVOGImage expects object
{
  const p = path.join(web, "src", "app", "api", "statements", "create", "route.ts");
  if (ex(p)) {
    let s = rd(p);
    s = s.replace(
      /await\s+generateVOGImage\(\s*statement\s*,\s*["']eDebatte["']\s*\)/,
      'await generateVOGImage({ prompt: statement, fallbackText: "eDebatte" })'
    );
    wr(p, s);
  }
}

// 5) QuickSignup.ts: ensure QuickSignupSchema exists
{
  const p = path.join(web, "src", "lib", "pii", "QuickSignup.ts");
  if (ex(p)) {
    let s = rd(p);
    if (!/QuickSignupSchema/.test(s)) {
      s = `import { z } from "zod";\nconst QuickSignupSchema = z.object({ email: z.string().email().optional() });\n` + s;
      wr(p, s);
    }
  }
}

// 6) worker.ts: isDev fallback
{
  const p = path.join(web, "src", "lib", "worker.ts");
  if (ex(p)) {
    let s = rd(p);
    if (!/\bconst\s+isDev\b/.test(s)) {
      s = `const isDev = process.env.NODE_ENV !== "production";\n` + s;
      wr(p, s);
    }
  }
}

// 7) aiProviders.ts: destructured param -> : any
{
  const p = path.join(web, "src", "utils", "aiProviders.ts");
  if (ex(p)) {
    let s = rd(p);
    // function foo({ meta, gptData, ariData, metaResult, context }) -> }: any)
    s = s.replace(
      /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(\s*\{\s*meta\s*,\s*gptData\s*,\s*ariData\s*,\s*metaResult\s*,\s*context\s*\}\s*\)/g,
      'export async function $1({ meta, gptData, ariData, metaResult, context }: any)'
    );
    wr(p, s);
  }
}

console.log("→ run: pnpm run e200");
