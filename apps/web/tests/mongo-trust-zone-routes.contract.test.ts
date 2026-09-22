import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function route(path: string) {
  return readFileSync(new URL(`../src/app/api/${path}`, import.meta.url), "utf8");
}

describe("Mongo trust-zone route contracts", () => {
  it("keeps VOG SSO account provisioning on explicit core and PII stores", () => {
    const source = route("auth/vog/consume/route.ts");
    expect(source).toContain("coreCol");
    expect(source).toContain("piiCol");
    expect(source).toContain("../../sharedAuth");
    expect(source).not.toContain("process.env.MONGODB_URI");
    expect(source).not.toContain("@/db/mongoose");
  });

  it("keeps GDPR export split across core, PII and votes without legacy mongoose", () => {
    const source = route("gdpr/export/route.ts");
    expect(source).toContain("coreCol");
    expect(source).toContain("piiCol");
    expect(source).toContain("votesCol");
    expect(source).toContain("readSession");
    expect(source).not.toContain("@/db/mongoose");
    expect(source).not.toContain("process.env.MONGODB_URI");
  });

  it("retires the legacy destructive GDPR endpoint in favor of authenticated self-service", () => {
    const source = route("gdpr/delete/route.ts");
    expect(source).toContain("legacy_endpoint_retired");
    expect(source).toContain("/api/account/self-service");
    expect(source).toContain("status: 410");
    expect(source).toContain("readSession");
    expect(source).not.toContain("deleteMany");
    expect(source).not.toContain("deleteOne");
    expect(source).not.toContain("@/db/mongoose");
    expect(source).not.toContain("process.env.MONGODB_URI");
  });
});
