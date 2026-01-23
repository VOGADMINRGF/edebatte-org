import { describe, it, expect } from "vitest";
import { GET as getSummary } from "../src/app/api/admin/analytics/summary/route";

describe("admin analytics summary", () => {
  it("returns ok json", async () => {
    const res = await getSummary();
    // @ts-ignore
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.data).toBeDefined();
  });
});
