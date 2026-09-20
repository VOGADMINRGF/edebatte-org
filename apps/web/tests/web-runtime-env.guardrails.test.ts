import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { GET as getDebugEnvironment } from "@/app/api/debug/env/route";
import {
  CriticalProductionWebRuntimeEnvError,
  assertCriticalProductionWebRuntimeEnv,
  CANONICAL_MAIL_FROM,
  CANONICAL_MAIL_REPLY_TO,
  resolveCanonicalMailEnvelope,
  resolveCanonicalMailFrom,
  resolveCanonicalWebDatabaseUrl,
  resolveMailFromForRuntime,
  resolveMailEnvelopeForRuntime,
  shouldValidateProductionStartupEnv,
  validateProductionStartupEnv,
} from "@/lib/server/webRuntimeEnv";

const repositoryRoot = path.resolve(process.cwd(), "../..");

function readRepositoryFile(relativePath: string) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function debugRouteTemplate(source: string, endMarker: string) {
  const start = source.indexOf("/api/debug/env");
  const end = source.indexOf(endMarker, start);

  return source.slice(start, end === -1 ? undefined : end);
}

describe("web runtime env guardrails", () => {
  it("uses MAIL_FROM as canonical sender and allows SMTP_FROM only as a legacy alias", () => {
    expect(
      resolveCanonicalMailFrom({
        MAIL_FROM: "canonical@example.org",
        SMTP_FROM: "legacy@example.org",
      }),
    ).toMatchObject({
      value: "canonical@example.org",
      source: "MAIL_FROM",
      usesLegacyAlias: false,
    });

    expect(
      resolveCanonicalMailFrom({
        SMTP_FROM: "legacy@example.org",
      }),
    ).toMatchObject({
      value: "legacy@example.org",
      source: "SMTP_FROM",
      usesLegacyAlias: true,
    });
  });

  it("resolves the canonical eDebatte sender and reply-to identity", () => {
    expect(
      resolveCanonicalMailEnvelope({
        MAIL_FROM: CANONICAL_MAIL_FROM,
        MAIL_REPLY_TO: CANONICAL_MAIL_REPLY_TO,
        SMTP_FROM: CANONICAL_MAIL_FROM,
      }),
    ).toMatchObject({
      from: CANONICAL_MAIL_FROM,
      replyTo: CANONICAL_MAIL_REPLY_TO,
      usesLegacyAlias: false,
      issues: [],
    });
  });

  it("flags conflicting mail sender values", () => {
    const result = resolveCanonicalMailFrom({
      MAIL_FROM: "one@example.org",
      SMTP_FROM: "two@example.org",
    });

    expect(result.issues.map((issue) => issue.code)).toContain("mail_from_conflict");
  });

  it.each([
    "VoiceOpenGov <members@voiceopengov.org>",
    "eDebatte <no-reply@edebatte.org>",
    "eDebatte <noreply@edebatte.org>",
    "eDebatte <mail@example.org>",
  ])("rejects forbidden sender identities: %s", (mailFrom) => {
    expect(() =>
      resolveMailEnvelopeForRuntime({
        NODE_ENV: "production",
        MAIL_FROM: mailFrom,
        MAIL_REPLY_TO: CANONICAL_MAIL_REPLY_TO,
        JWT_SECRET: "secret",
      }),
    ).toThrow(CriticalProductionWebRuntimeEnvError);
  });

  it("fails closed when the production reply-to configuration is missing", () => {
    expect(() =>
      resolveMailEnvelopeForRuntime({
        NODE_ENV: "production",
        MAIL_FROM: CANONICAL_MAIL_FROM,
      }),
    ).toThrow(CriticalProductionWebRuntimeEnvError);
  });

  it("accepts only WEB_DATABASE_URL as canonical web database source", () => {
    expect(
      resolveCanonicalWebDatabaseUrl({
        WEB_DATABASE_URL: "postgresql://web",
      }),
    ).toMatchObject({
      value: "postgresql://web",
      issues: [],
    });

    expect(
      resolveCanonicalWebDatabaseUrl({
        DATABASE_URL: "postgresql://foreign",
      }).issues.map((issue) => issue.code),
    ).toEqual(["database_url_without_web_database_url"]);
  });

  it("flags conflicting WEB_DATABASE_URL and DATABASE_URL values", () => {
    const result = resolveCanonicalWebDatabaseUrl({
      WEB_DATABASE_URL: "postgresql://web",
      DATABASE_URL: "postgresql://foreign",
    });

    expect(result.issues.map((issue) => issue.code)).toContain("web_database_url_conflict");
  });

  it("asserts critical production env requirements without exposing secrets", () => {
    expect(() =>
      assertCriticalProductionWebRuntimeEnv({
        NODE_ENV: "production",
        JWT_SECRET: "secret",
        WEB_DATABASE_URL: "postgresql://web",
      }),
    ).not.toThrow();

    expect(() =>
      assertCriticalProductionWebRuntimeEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://foreign",
      }),
    ).toThrow(CriticalProductionWebRuntimeEnvError);
  });

  it("does not couple production startup to optional mail configuration", () => {
    expect(() =>
      validateProductionStartupEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-server",
        JWT_SECRET: "secret",
        WEB_DATABASE_URL: "postgresql://web",
        MAIL_FROM: "VoiceOpenGov <no-reply@voiceopengov.org>",
      }),
    ).not.toThrow();
  });

  it("loads the general production env module without mail configuration", async () => {
    const originalEnv = process.env;
    process.env = {
      NODE_ENV: "production",
      JWT_SECRET: "preview-build-secret",
      CORE_DB_NAME: "core",
      CORE_MONGODB_URI: "mongodb://localhost/core",
      VOTES_DB_NAME: "votes",
      VOTES_MONGODB_URI: "mongodb://localhost/votes",
      PII_DB_NAME: "pii",
      PII_MONGODB_URI: "mongodb://localhost/pii",
      AI_CORE_READER_DB_NAME: "core",
      AI_CORE_READER_MONGODB_URI: "mongodb://localhost/core",
      NEO4J_URI: "bolt://localhost:7687",
      NEO4J_USER: "neo4j",
      NEO4J_PASSWORD: "password",
      ARANGO_URL: "http://localhost:8529",
      ARANGO_DB: "edebatte",
      ARANGO_USER: "root",
      ARANGO_ROOT_PASSWORD: "password",
      MEMGRAPH_URI: "bolt://localhost:7688",
    };

    try {
      vi.resetModules();
      const module = await import("@/utils/env");
      expect(module.env.NODE_ENV).toBe("production");
      expect(module.env).not.toHaveProperty("MAIL_FROM");
      expect(module.env).not.toHaveProperty("MAIL_REPLY_TO");
    } finally {
      process.env = originalEnv;
    }
  });

  it("skips startup enforcement during the production build phase but not at runtime", () => {
    expect(
      shouldValidateProductionStartupEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      }),
    ).toBe(false);
    expect(
      shouldValidateProductionStartupEnv({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-server",
      }),
    ).toBe(true);
  });

  it("uses only the safe canonical fallback outside production", () => {
    expect(resolveMailFromForRuntime({ NODE_ENV: "test" })).toBe(
      CANONICAL_MAIL_FROM,
    );
  });

  it("makes the former debug environment route an empty, non-cacheable 404", async () => {
    const response = await getDebugEnvironment();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("");
  });

  it("keeps the route and fallback reporting free of environment inspection", () => {
    const debugRoute = readRepositoryFile("apps/web/src/app/api/debug/env/route.ts");
    const fallback = readRepositoryFile("apps/web/src/ui/AnalysisFallbackNotice.tsx");
    const supportReport = readRepositoryFile("apps/web/src/app/api/support/report/route.ts");

    expect(debugRoute).not.toMatch(/process\.env|keyPreview|hasKey/);
    expect(fallback).not.toContain("/api/debug/env");
    expect(supportReport).not.toContain("env: body?.env");
  });

  it("keeps repository patch scripts from recreating an environment disclosure route", () => {
    const templates = [
      debugRouteTemplate(
        readRepositoryFile("scripts/vog_full_wiring.sh"),
        "# /api/health",
      ),
      debugRouteTemplate(
        readRepositoryFile("scripts/vog_repo_patch_full.sh"),
        'if [[ ! -f "$WEB/src/app/api/health/route.ts"',
      ),
      debugRouteTemplate(
        readRepositoryFile("scripts/vog_super_bundle.sh"),
        "# --- 4)",
      ),
    ];

    for (const template of templates) {
      expect(template).toMatch(/status:\s*404/);
      expect(template).toContain("cache-control");
      expect(template).not.toMatch(/process\.env|OPENAI_API_KEY|hasOpenAI|mask\(/);
    }
  });
});
