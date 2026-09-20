import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("source intelligence cron contract", () => {
  it("uses the existing bearer CRON_SECRET boundary and guarded scheduler", () => {
    const route = readRepoFile("src/app/api/cron/source-intelligence/route.ts");

    expect(route).toContain("process.env.CRON_SECRET");
    expect(route).toContain("secret.length >= 16");
    expect(route).toContain("authorization");
    expect(route).toContain("status: 401");
    expect(route).toContain("runScheduledOpenDataSources");
    expect(route).toContain("status: 200");
    expect(route).toContain("provider backoff");
  });

  it("uses one deploy-safe daily trigger while per-source due/backoff remains the run authority", () => {
    const vercel = JSON.parse(readRepoFile("../../vercel.json")) as {
      crons?: Array<{ path?: string; schedule?: string }>;
    };
    const entries = (vercel.crons ?? []).filter(
      (entry) => entry.path === "/api/cron/source-intelligence",
    );

    expect(entries).toEqual([
      { path: "/api/cron/source-intelligence", schedule: "17 3 * * *" },
    ]);
  });
});
