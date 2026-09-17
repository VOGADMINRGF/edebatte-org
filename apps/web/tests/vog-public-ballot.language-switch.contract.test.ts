import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const clientSource = readFileSync(
  new URL(
    "../src/app/vog/fragen/[code]/[questionId]/VogPublicBallotClient.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("VOG public ballot language-switch contract", () => {
  it("preserves an unsent option locally across a same-tab locale navigation", () => {
    expect(clientSource).toContain(
      'DRAFT_SELECTION_STORAGE_PREFIX = "edebatte:vog-public-ballot-draft:v1"',
    );
    expect(clientSource).toContain("window.sessionStorage.setItem");
    expect(clientSource).toContain("readDraftSelection(");
    expect(clientSource).toContain("persistDraftSelection(");
    expect(clientSource).toContain("onChange={() => updateSelection(option.optionId)}");
    expect(clientSource).toContain(
      "persistDraftSelection(ballot.code, ballot.questionId, selection)",
    );
    expect(clientSource).toContain("clearDraftSelection(ballot.code, ballot.questionId)");
    expect(clientSource).not.toContain("window.localStorage");
  });

  it("uses human-readable language names instead of code-only controls", () => {
    for (const label of [
      'de: "Deutsch"',
      'en: "English"',
      'fr: "Français"',
      'es: "Español"',
      'tr: "Türkçe"',
      'ar: "العربية"',
    ]) {
      expect(clientSource).toContain(label);
    }
    expect(clientSource).toContain("getLanguageLabel(link.locale, ballot.uiLocale)");
    expect(clientSource).not.toContain("{link.locale.toUpperCase()}");
  });
});
