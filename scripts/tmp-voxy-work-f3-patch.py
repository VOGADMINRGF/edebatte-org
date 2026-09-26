from pathlib import Path

src = Path('apps/web/src/features/voxyVideo/editorialTranslationSemanticGuard.ts')
text = src.read_text()
old = '''function numericTokens(value: string): string[] {
  const matches = value.match(/[-+]?\\d(?:[\\d\\s.,'’]*\\d)?/g) ?? [];
  return matches
    .map((token) => {
      const sign = token.trim().startsWith("-") ? "-" : "";
      const digits = token.replace(/\\D/g, "");
      return digits ? `${sign}${digits}` : "";
    })
    .filter(Boolean)
    .sort();
}
'''
new = '''const COMMA_DECIMAL_LANGUAGES = new Set([
  "de", "fr", "es", "it", "pt", "nl", "pl", "cs", "sk", "sl", "hr", "ro",
  "hu", "da", "sv", "no", "fi", "et", "lv", "lt", "el", "bg",
]);
const DOT_DECIMAL_LANGUAGES = new Set(["en", "ga", "mt"]);

type NumericSemanticTokens = {
  tokens: string[];
  ambiguous: boolean;
};

function normalizeDecimalDigits(value: string): string {
  return value
    .replace(/[\\u0660-\\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\\u06f0-\\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function numericConvention(language: string): {
  decimal: "." | "," | "٫" | null;
  group: readonly string[];
} {
  const key = languageKey(language);
  if (COMMA_DECIMAL_LANGUAGES.has(key)) return { decimal: ",", group: [".", "'", "’", "\\u00a0", "\\u202f"] };
  if (DOT_DECIMAL_LANGUAGES.has(key)) return { decimal: ".", group: [",", "'", "’", "\\u00a0", "\\u202f"] };
  if (key === "ar") return { decimal: "٫", group: ["٬", "'", "’", "\\u00a0", "\\u202f"] };
  return { decimal: null, group: ["'", "’", "\\u00a0", "\\u202f"] };
}

function canonicalInteger(value: string): string {
  const normalized = value.replace(/^0+(?=\\d)/, "");
  return normalized || "0";
}

function canonicalFraction(value: string): string {
  return value.replace(/0+$/, "");
}

function canonicalNumericToken(raw: string, language: string): { token: string; ambiguous: boolean } {
  const convention = numericConvention(language);
  const trimmed = raw.trim();
  const sign = trimmed.startsWith("-") ? "-" : trimmed.startsWith("+") ? "+" : "";
  const body = trimmed.replace(/^[-+]/, "");
  const numericPunctuation = [".", ",", "٫", "٬"];

  if (!convention.decimal) {
    const hasPunctuation = numericPunctuation.some((separator) => body.includes(separator));
    const digits = body.replace(/[^0-9]/g, "");
    return { token: `${sign}${canonicalInteger(digits)}`, ambiguous: hasPunctuation };
  }

  const decimalParts = body.split(convention.decimal);
  if (decimalParts.length > 2) {
    return { token: `${sign}${body.replace(/[^0-9]/g, "")}`, ambiguous: true };
  }

  const integerPart = decimalParts[0] ?? "";
  const fractionPart = decimalParts[1] ?? null;
  const unsupportedPunctuation = numericPunctuation.filter(
    (separator) => separator !== convention.decimal && !convention.group.includes(separator),
  );
  if (
    unsupportedPunctuation.some((separator) => body.includes(separator)) ||
    (fractionPart !== null && /[^0-9]/.test(fractionPart))
  ) {
    return { token: `${sign}${body.replace(/[^0-9]/g, "")}`, ambiguous: true };
  }

  const groupPattern = convention.group
    .map((separator) => separator.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
    .join("|");
  const groups = groupPattern ? integerPart.split(new RegExp(groupPattern, "g")) : [integerPart];
  const groupingValid =
    groups.length <= 1 ||
    (/^\\d{1,3}$/.test(groups[0] ?? "") && groups.slice(1).every((part) => /^\\d{3}$/.test(part)));
  if (!groupingValid || groups.some((part) => !/^\\d+$/.test(part))) {
    return { token: `${sign}${body.replace(/[^0-9]/g, "")}`, ambiguous: true };
  }

  const integer = canonicalInteger(groups.join(""));
  if (fractionPart === null) return { token: `${sign}${integer}`, ambiguous: false };
  const fraction = canonicalFraction(fractionPart);
  return {
    token: fraction ? `${sign}${integer}.${fraction}` : `${sign}${integer}`,
    ambiguous: false,
  };
}

function numericTokens(value: string, language: string): NumericSemanticTokens {
  const normalized = normalizeDecimalDigits(value);
  const matches = normalized.match(/[-+]?\\d(?:[\\d.,٫٬'’\\u00a0\\u202f]*\\d)?/g) ?? [];
  const parsed = matches.map((token) => canonicalNumericToken(token, language));
  return {
    tokens: parsed.map((entry) => entry.token).filter(Boolean).sort(),
    ambiguous: parsed.some((entry) => entry.ambiguous),
  };
}
'''
if text.count(old) != 1:
    raise SystemExit(f'numericTokens anchor mismatch: {text.count(old)}')
text = text.replace(old, new, 1)
old_compare = '  compareTokenList(input.reviewFlags, input.path, "number", numericTokens(input.source), numericTokens(input.target));'
new_compare = '''  const sourceNumbers = numericTokens(input.source, input.sourceLanguage);
  const targetNumbers = numericTokens(input.target, input.targetLanguage);
  compareTokenList(input.reviewFlags, input.path, "number", sourceNumbers.tokens, targetNumbers.tokens);
  if (sourceNumbers.ambiguous || targetNumbers.ambiguous) {
    input.reviewFlags.push(`semantic_guard_number_ambiguous:${input.path}`);
  }'''
if text.count(old_compare) != 1:
    raise SystemExit(f'number compare anchor mismatch: {text.count(old_compare)}')
src.write_text(text.replace(old_compare, new_compare, 1))

test = Path('apps/web/tests/voxy-editorial-translation-semantic-guard.contract.test.ts')
t = test.read_text()
anchor = '  it("treats source-pack translation review state as an existing fail-closed trust signal", () => {'
block = '''  it("flags Work F3 decimal magnitude drift instead of collapsing punctuation", () => {
    const master = masterPlan({ title: "Die Strecke ist 1,5 km lang" });
    const translated = frenchPlan(master, { title: "La distance est de 15 km" });
    const report = evaluateVoxyEditorialTranslationSemanticGuard({ masterPlan: master, translatedPlan: translated });

    expect(report.reviewFlags).toContain("semantic_guard_number_changed:story:title");
    expect(report.requiresReview).toBe(true);
    const variant = bind(master, translated);
    expect(variant.languageVariant.translationStatus).toBe("uncertain");
  });

  it("keeps unambiguous locale-equivalent decimal and grouping forms semantically aligned", () => {
    const master = masterPlan({ title: "Volumen: 1.234,5 EUR auf 10 km bei 20 %" });
    const translated = masterPlan({
      storyPlanId: "story-en-1",
      revision: 1,
      title: "Volume: 1,234.5 EUR over 10 km at 20 %",
      locale: "en",
      originalLanguage: "de",
      outputLanguage: "en",
      derivedFromStoryPlanId: master.storyPlanId,
      derivedFromRevision: master.revision,
    });
    const report = evaluateVoxyEditorialTranslationSemanticGuard({ masterPlan: master, translatedPlan: translated });

    expect(report.reviewFlags).not.toContain("semantic_guard_number_changed:story:title");
    expect(report.reviewFlags).not.toContain("semantic_guard_number_ambiguous:story:title");
  });

  it("fails closed on malformed or locale-ambiguous numeric syntax", () => {
    const master = masterPlan({ title: "Wert 1,5" });
    const translated = frenchPlan(master, { title: "Valeur 1,2,3" });
    const report = evaluateVoxyEditorialTranslationSemanticGuard({ masterPlan: master, translatedPlan: translated });

    expect(report.reviewFlags).toContain("semantic_guard_number_ambiguous:story:title");
    expect(report.requiresReview).toBe(true);
  });

'''
if t.count(anchor) != 1:
    raise SystemExit(f'test insertion anchor mismatch: {t.count(anchor)}')
test.write_text(t.replace(anchor, block + anchor, 1))
