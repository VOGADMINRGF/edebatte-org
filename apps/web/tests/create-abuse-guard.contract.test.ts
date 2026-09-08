import { describe, expect, it } from "vitest";
import {
  evaluateCreateAbusePayload,
  normalizeCreateAbuseText,
} from "@/features/create/createAbuseGuard";

describe("create cheap abuse guard", () => {
  it("allows ordinary civic text without political semantic scoring", () => {
    const result = evaluateCreateAbusePayload({
      text: "Ich bin für Mindestlohn in Behindertenwerkstätten, für mehr Integration in die Wirtschaft und für stärkere Kontrollen der Vorstände.",
    });

    expect(result.risk).toBe("allow");
    expect(result.reason).toBeNull();
    expect(result.fingerprint).toEqual(expect.any(String));
  });

  it.each(["[object Object]", "[object Object],[object Object]", "undefined", "null"])(
    "blocks technical sentinel %s before AI",
    (text) => {
      expect(evaluateCreateAbusePayload({ text })).toMatchObject({
        risk: "block",
        reason: "technical_or_machine_sentinel",
      });
    },
  );

  it("applies progressive friction to dense repeated links instead of semantic moderation", () => {
    const result = evaluateCreateAbusePayload({
      text: [
        "Bitte prüfen",
        "https://example.org/a",
        "https://example.org/a",
        "https://example.org/a",
        "https://example.org/a",
        "https://example.org/b",
      ].join(" "),
    });
    expect(result.risk).toBe("cooldown");
    expect(result.reason).toBe("link_density");
  });

  it("normalizes harmless whitespace deterministically for duplicate fingerprints", () => {
    expect(normalizeCreateAbuseText("  Ein   Anliegen\nmit Abstand ")).toBe(
      "ein anliegen mit abstand",
    );
    const a = evaluateCreateAbusePayload({ text: "Ein   Anliegen" });
    const b = evaluateCreateAbusePayload({ text: "ein anliegen" });
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
