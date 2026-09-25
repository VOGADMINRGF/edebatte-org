import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasCoreMongoRuntimeConfig,
  resolveCoreMongoRuntimeConfig,
  resolveMongoUriForZone,
} from "@/lib/server/env/runtimeMongo";
import { classifyMongoRuntimeError } from "@/lib/server/env/runtimeMongoErrors";
import { validateProductionMongoTopology } from "@core/db/triMongo";

describe("runtime mongo env aliases", () => {
  it("prefers core-specific env keys over legacy keys", () => {
    const resolved = resolveCoreMongoRuntimeConfig({
      CORE_MONGODB_URI: "mongodb://core-uri",
      CORE_DB_NAME: "core-db",
      MONGODB_URI: "mongodb://legacy-uri",
      MONGODB_DB: "legacy-db",
    });

    expect(resolved).toMatchObject({
      uri: "mongodb://core-uri",
      dbName: "core-db",
      usedLegacyUri: false,
      usedLegacyDbName: false,
    });
  });

  it("falls back to legacy keys only outside production", () => {
    const source = {
      NODE_ENV: "development",
      MONGODB_URI: "mongodb://legacy-uri",
      MONGODB_DB: "legacy-db",
    };
    const resolved = resolveCoreMongoRuntimeConfig(source);

    expect(resolved).toMatchObject({
      uri: "mongodb://legacy-uri",
      dbName: "legacy-db",
      usedLegacyUri: true,
      usedLegacyDbName: true,
    });
    expect(hasCoreMongoRuntimeConfig(source)).toBe(true);
  });

  it("fails closed instead of using legacy keys in production", () => {
    const source = {
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://legacy-uri",
      MONGODB_DB: "legacy-db",
    };
    expect(resolveCoreMongoRuntimeConfig(source)).toMatchObject({
      uri: null,
      dbName: null,
      usedLegacyUri: false,
      usedLegacyDbName: false,
    });
    expect(hasCoreMongoRuntimeConfig(source)).toBe(false);
    expect(resolveMongoUriForZone("core", source)).toBeNull();
    expect(resolveMongoUriForZone("votes", source)).toBeNull();
    expect(resolveMongoUriForZone("pii", source)).toBeNull();
  });

  it("resolves zone URIs with zone-first and development-only legacy fallback behavior", () => {
    const source = {
      NODE_ENV: "development",
      MONGODB_URI: "mongodb://legacy-uri",
      CORE_MONGODB_URI: "mongodb://core-uri",
      VOTES_MONGODB_URI: "mongodb://votes-uri",
    };
    expect(resolveMongoUriForZone("core", source)).toBe("mongodb://core-uri");
    expect(resolveMongoUriForZone("votes", source)).toBe("mongodb://votes-uri");
    expect(resolveMongoUriForZone("pii", source)).toBe("mongodb://legacy-uri");
  });
});

describe("production mongo topology", () => {
  const isolated = {
    CORE_MONGODB_URI: "mongodb+srv://core:secret@edb-core.example/core",
    CORE_DB_NAME: "edebatte_core",
    VOTES_MONGODB_URI: "mongodb+srv://votes:secret@edb-votes.example/votes",
    VOTES_DB_NAME: "edebatte_votes",
    PII_MONGODB_URI: "mongodb+srv://pii:secret@edb-pii.example/pii",
    PII_DB_NAME: "edebatte_pii",
  };

  it("accepts three physically separate cluster hosts", () => {
    expect(validateProductionMongoTopology(isolated)).toEqual({ ok: true, errors: [] });
  });

  it("rejects incomplete production zones", () => {
    const result = validateProductionMongoTopology({
      ...isolated,
      PII_MONGODB_URI: "",
      VOTES_DB_NAME: "",
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Missing production value: PII_MONGODB_URI");
    expect(result.errors).toContain("Missing production value: VOTES_DB_NAME");
  });

  it("rejects non-Mongo connection schemes", () => {
    const result = validateProductionMongoTopology({
      ...isolated,
      CORE_MONGODB_URI: "https://edb-core.example/core",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "CORE_MONGODB_URI must be a valid mongodb:// or mongodb+srv:// URI with a hostname",
    );
  });

  it("rejects two zones sharing one production cluster host", () => {
    const result = validateProductionMongoTopology({
      ...isolated,
      PII_MONGODB_URI: "mongodb+srv://pii:other@edb-core.example/pii",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "pii and core must use different production MongoDB cluster hosts",
    );
  });

  it("rejects ambiguous database names across zones", () => {
    const result = validateProductionMongoTopology({
      ...isolated,
      PII_DB_NAME: "edebatte_core",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "PII_DB_NAME must be distinct from the core database name in production",
    );
  });
});

describe("runtime mongo error classification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("mongodb");
  });

  it("classifies SRV lookup failures deterministically", () => {
    const err = Object.assign(
      new Error("querySrv ENOTFOUND _mongodb._tcp.cluster.local"),
      { code: "ENOTFOUND" },
    );
    expect(classifyMongoRuntimeError(err)).toMatchObject({
      kind: "srv",
      code: "ENOTFOUND",
    });
  });

  it("classifies DNS lookup failures deterministically", () => {
    const err = Object.assign(new Error("getaddrinfo EAI_AGAIN cluster.local"), { code: "EAI_AGAIN" });
    expect(classifyMongoRuntimeError(err)).toMatchObject({
      kind: "dns",
      code: "EAI_AGAIN",
    });
  });

  it("classifies ECONNREFUSED failures deterministically", () => {
    const err = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:27017"), { code: "ECONNREFUSED" });
    expect(classifyMongoRuntimeError(err)).toMatchObject({
      kind: "conn_refused",
      code: "ECONNREFUSED",
    });
  });

  it("uses shared classification in mongoPing runtime errors", async () => {
    vi.stubEnv("CORE_MONGODB_URI", "mongodb://localhost:27017/core");
    vi.doMock("mongodb", () => ({
      MongoClient: class MockMongoClient {
        constructor(_uri: string) {}
        async connect() {
          throw Object.assign(
            new Error("querySrv ENOTFOUND _mongodb._tcp.cluster.local"),
            { code: "ENOTFOUND" },
          );
        }
        db() {
          return { command: async () => ({ ok: 1 }) };
        }
      },
    }));
    const { mongoPing } = await import("@/utils/mongoPing");
    await expect(mongoPing("core")).rejects.toThrow("[srv]");
  });

  it("uses shared classification in legacy draftStore read runtime errors", async () => {
    vi.stubEnv("CORE_MONGODB_URI", "mongodb://localhost:27017/core");
    vi.stubEnv("CORE_DB_NAME", "core");
    vi.doMock("mongodb", () => ({
      MongoClient: class MockMongoClient {
        constructor(_uri: string) {}
        async connect() {
          throw Object.assign(
            new Error("connect ECONNREFUSED 127.0.0.1:27017"),
            { code: "ECONNREFUSED" },
          );
        }
        db() {
          return {
            collection() {
              return { findOne: async () => null };
            },
          };
        }
      },
    }));
    const { getDraft } = await import("@/server/draftStore");
    await expect(getDraft("legacy-id")).rejects.toThrow("[conn_refused]");
  });
});