from pathlib import Path

GUARD_PATH = Path("apps/web/src/features/voxyVideo/editorialTranslationSemanticGuard.ts")
TEST_PATH = Path("apps/web/tests/voxy-editorial-translation-semantic-guard.contract.test.ts")

guard = GUARD_PATH.read_text()
old_numeric = '''function numericTokens(value: string): string[] {
  const matches = value.match(/[-+]?\\d(?:[\\d\\s.,'’]*\\d)?/g) ?? [];
  return matches
    .map((token) => {
      const sign = token.trim().startsWith("-") ? "-" : "";
      const digits = token.replace(/\\D/g, "");
      return digits ? `${sign}${digits}` : "";
    })
    .filter(Boolean)
    .sort();
}'''
new_numeric = r'''type NumericTokenAnalysis = {
  tokens: string[];
  ambiguous: boolean;
};

type NumericLocaleProfile = {
  locale: string;
  decimal: string;
  group: string;
  primaryGroupSize: number;
  secondaryGroupSize: number;
};

function normalizeNumericPunctuation(value: string): string {
  return value.replace(/’/g, "'").replace(/[\u00a0\u202f\s]+/gu, " ");
}

function numericLocaleProfile(language: string): NumericLocaleProfile | null {
  const locale = language.trim().replace(/_/g, "-") || "en";
  try {
    const fractionalFormatter = new Intl.NumberFormat(locale, {
      numberingSystem: "latn",
      useGrouping: true,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const fractionalParts = fractionalFormatter.formatToParts(12345.6);
    const decimal = normalizeNumericPunctuation(
      fractionalParts.find((part) => part.type === "decimal")?.value ?? "",
    );
    const group = normalizeNumericPunctuation(
      fractionalParts.find((part) => part.type === "group")?.value ?? "",
    );
    if (!decimal || !group || decimal === group) return null;

    const integerParts = new Intl.NumberFormat(locale, {
      numberingSystem: "latn",
      useGrouping: true,
      maximumFractionDigits: 0,
    })
      .formatToParts(123456789012345)
      .filter((part) => part.type === "integer")
      .map((part) => part.value);
    const primaryGroupSize = integerParts[integerParts.length - 1]?.length ?? 3;
    const secondaryGroupSize = integerParts[integerParts.length - 2]?.length ?? primaryGroupSize;

    return { locale, decimal, group, primaryGroupSize, secondaryGroupSize };
  } catch {
    return null;
  }
}

function ambiguousNumericToken(token: string, language: string): string {
  return `ambiguous:${languageKey(language)}:${normalizeNumericPunctuation(token.trim())}`;
}

function canonicalNumericToken(
  rawToken: string,
  language: string,
): { token: string; ambiguous: boolean } {
  const profile = numericLocaleProfile(language);
  if (!profile) {
    return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
  }

  const normalized = normalizeNumericPunctuation(rawToken.trim());
  const negative = normalized.startsWith("-");
  const body = normalized.replace(/^[-+]/, "");
  if (!body || !/^\d[\d.,' ٫٬]*$/u.test(body)) {
    return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
  }

  const punctuation = Array.from(body).filter((character) => !/\d/.test(character));
  if (punctuation.some((character) => character !== profile.decimal && character !== profile.group)) {
    return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
  }

  const decimalParts = body.split(profile.decimal);
  if (decimalParts.length > 2) {
    return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
  }
  const integerPart = decimalParts[0] ?? "";
  const fractionalPart = decimalParts[1] ?? null;
  if (fractionalPart !== null && (!/^\d+$/.test(fractionalPart) || fractionalPart.includes(profile.group))) {
    return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
  }

  const integerGroups = integerPart.split(profile.group);
  if (integerGroups.some((group) => !/^\d+$/.test(group))) {
    return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
  }
  if (integerGroups.length > 1) {
    const last = integerGroups[integerGroups.length - 1] ?? "";
    if (last.length !== profile.primaryGroupSize) {
      return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
    }
    for (let index = integerGroups.length - 2; index > 0; index -= 1) {
      if ((integerGroups[index] ?? "").length !== profile.secondaryGroupSize) {
        return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
      }
    }
    const firstLength = (integerGroups[0] ?? "").length;
    if (firstLength < 1 || firstLength > profile.secondaryGroupSize) {
      return { token: ambiguousNumericToken(rawToken, language), ambiguous: true };
    }
  }

  const integerDigits = integerGroups.join("").replace(/^0+(?=\d)/, "") || "0";
  const fractionDigits = (fractionalPart ?? "").replace(/0+$/, "");
  const zero = integerDigits === "0" && !fractionDigits;
  const sign = negative && !zero ? "-" : "";
  return {
    token: `${sign}${integerDigits}${fractionDigits ? `.${fractionDigits}` : ""}`,
    ambiguous: false,
  };
}

function numericTokens(value: string, language: string): NumericTokenAnalysis {
  const matches = value.match(/[-+]?\d(?:[\d\s.,'’٫٬]*\d)?/gu) ?? [];
  const normalized = matches.map((token) => canonicalNumericToken(token, language));
  return {
    tokens: normalized.map((result) => result.token).filter(Boolean).sort(),
    ambiguous: normalized.some((result) => result.ambiguous),
  };
}'''
if guard.count(old_numeric) != 1:
    raise SystemExit(f"expected one numericTokens block, found {guard.count(old_numeric)}")
guard = guard.replace(old_numeric, new_numeric, 1)

old_compare = '  compareTokenList(input.reviewFlags, input.path, "number", numericTokens(input.source), numericTokens(input.target));'
new_compare = '''  const sourceNumbers = numericTokens(input.source, input.sourceLanguage);
  const targetNumbers = numericTokens(input.target, input.targetLanguage);
  compareTokenList(input.reviewFlags, input.path, "number", sourceNumbers.tokens, targetNumbers.tokens);
  if (sourceNumbers.ambiguous || targetNumbers.ambiguous) {
    input.reviewFlags.push(`semantic_guard_number_ambiguous:${input.path}`);
  }'''
if guard.count(old_compare) != 1:
    raise SystemExit(f"expected one numeric compare call, found {guard.count(old_compare)}")
guard = guard.replace(old_compare, new_compare, 1)
GUARD_PATH.write_text(guard)

tests = TEST_PATH.read_text()
helper_anchor = 'function bind(master: VoxyEditorialStoryPlan, translated: VoxyEditorialStoryPlan) {'
helper = '''function englishPlan(master: VoxyEditorialStoryPlan, narration: string) {
  return frenchPlan(master, {
    storyPlanId: "story-en-1",
    locale: "en",
    outputLanguage: "en",
    title: "EU investment: 20 % for 10 km",
    chapters: [
      {
        ...master.chapters[0]!,
        headline: "EU invests 20 %",
        narration,
        consequences: [
          {
            ...master.chapters[0]!.consequences[0]!,
            text: "“EU” could start 2 km later.",
          },
        ],
      },
    ],
  });
}

'''
if tests.count(helper_anchor) != 1:
    raise SystemExit("bind helper anchor not unique")
tests = tests.replace(helper_anchor, helper + helper_anchor, 1)

test_anchor = '  it("treats source-pack translation review state as an existing fail-closed trust signal", () => {'
inserted = '''  it("detects decimal-comma magnitude drift instead of collapsing 1,5 and 15", () => {
    const master = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1,5 km lang sein.",
        },
      ],
    });
    const translated = englishPlan(master, "The distance could be 15 km long.");

    const variant = bind(master, translated);
    expect(variant.languageVariant.translationStatus).toBe("uncertain");
    expect(variant.languageVariant.semanticGuard?.reviewFlags).toContain(
      "semantic_guard_number_changed:chapter:chapter-1:narration",
    );
  });

  it("accepts equivalent locale decimal and grouping renderings when they are unambiguous", () => {
    const decimalMaster = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1,5 km lang sein.",
        },
      ],
    });
    const decimalReport = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: decimalMaster,
      translatedPlan: englishPlan(decimalMaster, "The distance could be 1.5 km long."),
    });
    expect(decimalReport.reviewFlags).not.toContain(
      "semantic_guard_number_changed:chapter:chapter-1:narration",
    );
    expect(decimalReport.reviewFlags).not.toContain(
      "semantic_guard_number_ambiguous:chapter:chapter-1:narration",
    );

    const groupedMaster = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1.500 km lang sein.",
        },
      ],
    });
    const groupedReport = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: groupedMaster,
      translatedPlan: englishPlan(groupedMaster, "The distance could be 1,500 km long."),
    });
    expect(groupedReport.reviewFlags).not.toContain(
      "semantic_guard_number_changed:chapter:chapter-1:narration",
    );
    expect(groupedReport.reviewFlags).not.toContain(
      "semantic_guard_number_ambiguous:chapter:chapter-1:narration",
    );
  });

  it("fails closed on locale-ambiguous numeric separators", () => {
    const master = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1,5 km lang sein.",
        },
      ],
    });
    const report = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: master,
      translatedPlan: englishPlan(master, "The distance could be 1,5 km long."),
    });

    expect(report.reviewFlags).toContain(
      "semantic_guard_number_ambiguous:chapter:chapter-1:narration",
    );
    expect(report.requiresReview).toBe(true);
  });

'''
if tests.count(test_anchor) != 1:
    raise SystemExit("semantic guard test anchor not unique")
tests = tests.replace(test_anchor, inserted + test_anchor, 1)
TEST_PATH.write_text(tests)
