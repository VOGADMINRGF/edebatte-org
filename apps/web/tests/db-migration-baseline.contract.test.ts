import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd(), "../..");
const BASELINE_DATE = "20260906";
const LEGACY_MIGRATION = "20250903104032_init_topics_statements";

function readRoot(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("split Prisma migration baseline contract", () => {
  for (const domain of ["web", "core"] as const) {
    it(`keeps ${domain} on its own PostgreSQL baseline history`, () => {
      const migrationsRoot = `prisma/${domain}/migrations`;
      const readme = readRoot(`${migrationsRoot}/README.md`);
      const lock = readRoot(`${migrationsRoot}/migration_lock.toml`);
      const baseline = readRoot(
        `${migrationsRoot}/${BASELINE_DATE}_${domain}_baseline/migration.sql`,
      );

      expect(readme).toContain(`prisma/${domain}/schema.prisma`);
      expect(readme).toContain("Do not use `prisma/migrations/`");
      expect(lock).toMatch(/^provider = "postgresql"$/m);
      expect(baseline).toMatch(/^CREATE TABLE /m);
      expect(baseline).not.toMatch(/\b(?:DROP|TRUNCATE)\b/i);
      expect(baseline).not.toContain(LEGACY_MIGRATION);
    });
  }

  it("keeps the root migration history explicitly non-canonical", () => {
    const legacyMarker = readRoot(
      "prisma/migrations/LEGACY_DO_NOT_USE_FOR_WEB_OR_CORE.md",
    );
    const packageJson = JSON.parse(readRoot("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(legacyMarker).toMatch(/is \*\*not\*\* the canonical deploy history/);
    expect(packageJson.scripts?.["prisma:migrate:web"]).toContain(
      "--schema=prisma/web/schema.prisma",
    );
    expect(packageJson.scripts?.["prisma:migrate:core"]).toContain(
      "--schema=prisma/core/schema.prisma",
    );
  });
});
