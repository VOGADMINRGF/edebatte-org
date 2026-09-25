import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runtime = readFileSync(
  new URL("../src/features/newsletter/newsletterRuntime.ts", import.meta.url),
  "utf8",
);
const account = readFileSync(
  new URL("../../../features/account/service.ts", import.meta.url),
  "utf8",
);

describe("newsletter closeout handoff safety", () => {
  it("reserves subscriber, content revisions, and delivery ledger inside one transaction before SMTP", () => {
    expect(runtime).toContain('const db = await getDb("core")');
    expect(runtime).toContain("await session.withTransaction(async () => {");
    expect(runtime).toContain("lastDeliveryBoundaryAt: input.now");
    expect(runtime).toContain("lastNewsletterDeliveryBoundaryAt: input.now");
    expect(runtime).toContain("sourceRevisionHash");
    expect(runtime).toContain("newsletterSourceRevisionHash(source) !== candidate!.sourceRevisionHash");
    expect(runtime).toContain('reason: "candidate_state_changed"');
    expect(runtime).toContain("externalAttemptBoundaryAt: input.now");
    expect(runtime).toContain("const result = await sendMail({");
    expect(runtime.indexOf("reserveNewsletterExternalHandoff({")).toBeLessThan(
      runtime.indexOf("const result = await sendMail({"),
    );
  });

  it("fails closed when transaction or canonical state cannot be established", () => {
    expect(runtime).toContain('reason: "handoff_transaction_unavailable"');
    expect(runtime).toContain('reason: "handoff_transaction_failed"');
    expect(runtime).toContain('reason: "subscriber_state_changed"');
    expect(runtime).toContain('reason: "candidate_state_unavailable"');
  });

  it("projects and mutates newsletter preference through the canonical subscription adapter", () => {
    expect(account).toContain("readCanonicalNewsletterOptIn");
    expect(account).toContain("applyAccountNewsletterPreference");
    expect(account).toContain("newsletterOptIn: canonicalNewsletterOptIn");
    expect(account).not.toContain("newsletterOptIn: doc.settings?.newsletterOptIn ?? false");
    expect(account).toContain('setOps["settings.newsletterOptIn"] = canonical.active');
  });
});
