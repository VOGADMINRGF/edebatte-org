import { describe, expect, it } from "vitest";
import {
  evaluateCreateAbusePayload,
  normalizeCreateAbuseText,
  readCreateTextAlias,
} from "@/features/create/createAbuseGuard";

describe("create mechanical abuse guard", () => {
  it("allows ordinary and controversial civic language without semantic scoring", () => {
    const result = evaluateCreateAbusePayload({ text: "Ich bin für Mindestlohn in Behindertenwerkstätten, mehr Integration in die Wirtschaft und strengere Kontrolle der Vorstände." });

    expect(result).toMatchObject({ risk: "allow", reason: null, fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(Object.keys(result)).toEqual(["risk", "reason", "fingerprint"]);
  });

  it.each(["[object Object]", "[object Object],[object Object]", "undefined", "null", "x".repeat(48)])("blocks the mechanical sentinel %s", (text) => {
    expect(evaluateCreateAbusePayload({ text })).toMatchObject({
      risk: "block",
      reason: "technical_or_machine_sentinel",
    });
  });

  it("distinguishes extreme link floods from cooldown-level link density", () => {
    const extreme = Array.from({ length: 12 }, (_, index) => `https://spam.example/${index}`).join(" ");
    const dense = "Bitte prüfen https://example.org/a https://example.org/a https://example.org/a https://example.org/a https://example.org/b";

    expect(evaluateCreateAbusePayload({ text: extreme })).toMatchObject({ risk: "block", reason: "extreme_link_flood" });
    expect(evaluateCreateAbusePayload({ text: dense })).toMatchObject({ risk: "cooldown", reason: "link_density" });
  });

  it("detects pathological token repetition mechanically", () => {
    const result = evaluateCreateAbusePayload({ text: Array.from({ length: 30 }, () => "wiederholung").join(" ") });
    expect(result).toMatchObject({ risk: "cooldown", reason: "repetition_flood" });
  });

  it("normalizes bounded text aliases into stable fingerprints", () => {
    expect(readCreateTextAlias({ sourceText: "  Ein Anliegen  " })).toBe("Ein Anliegen");
    expect(normalizeCreateAbuseText("  Ein   Anliegen\nmit Abstand ")).toBe("ein anliegen mit abstand");
    expect(normalizeCreateAbuseText("a".repeat(12_000))).toHaveLength(10_000);

    const first = evaluateCreateAbusePayload({ text: "Ein   Anliegen" });
    const second = evaluateCreateAbusePayload({ intakeText: "ein anliegen" });
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it("allows empty or non-object input without inventing an identity", () => {
    expect(evaluateCreateAbusePayload(null)).toEqual({ risk: "allow", reason: null, fingerprint: null });
  });
});
