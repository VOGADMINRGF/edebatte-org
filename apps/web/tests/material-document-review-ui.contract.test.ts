import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/admin/material/review/[reviewId]/page.tsx"),
  "utf8",
);

describe("material document review UI contract", () => {
  it("exposes graph recommendation as advice and all explicit human choices", () => {
    expect(source).toContain("Die Empfehlung ist keine Entscheidung");
    expect(source).toContain("Bestehende Frage verwenden");
    expect(source).toContain("Als Folgefrage weiterführen");
    expect(source).toContain("Um Perspektive oder Option ergänzen");
    expect(source).toContain("Neue eigenständige Frage vorbereiten");
  });

  it("requires confirmation and states the non-automatic boundaries", () => {
    expect(source).toContain("Ich bestätige meine Auswahl");
    expect(source).toContain("kein Auto-Merge");
    expect(source).toContain("kein Auto-Graph-Write");
    expect(source).toContain("keine automatische Runde");
    expect(source).not.toContain("openPointIds.length || 0");
  });
});
