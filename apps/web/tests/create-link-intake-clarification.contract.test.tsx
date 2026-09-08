import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CreateLinkIntakeClarification from "@/features/create/CreateLinkIntakeClarification";
import {
  buildCreateLinkSourceNotice,
  detectCreateLinkIntake,
  validateCreateSourceUrlForPersistence,
} from "@/features/create/linkIntake";

describe("create link intake clarification contract", () => {
  it("detects link-only and multi-link inputs deterministically without network access", () => {
    const youtubeDetection = detectCreateLinkIntake("https://youtu.be/demo123");
    expect(youtubeDetection.hasLink).toBe(true);
    expect(youtubeDetection.linkKind).toBe("youtube");
    expect(youtubeDetection.linkOnly).toBe(true);
    expect(youtubeDetection.mostlyLinkOnly).toBe(true);
    expect(youtubeDetection.primaryUrl).toBe("https://youtu.be/demo123");

    const multipleDetection = detectCreateLinkIntake("https://example.com/a https://example.com/b");
    expect(multipleDetection.linkKind).toBe("multiple");
    expect(multipleDetection.urls).toHaveLength(2);
  });

  it("keeps normal analysis available when a link comes with clear user context", () => {
    const detection = detectCreateLinkIntake(
      "Bitte prüft diesen Bericht zur Schulwegsicherheit und erklärt, welche Aussage zur Unfallentwicklung belastbar ist: https://example.com/bericht",
    );

    expect(detection.hasLink).toBe(true);
    expect(detection.mostlyLinkOnly).toBe(false);
    expect(detection.remainingWordCount).toBeGreaterThan(6);
  });

  it.each([
    "https://example.org/?email=max@example.org",
    "https://example.org/?phone=01711234567",
    "https://max@example.org:secret@example.org/foo",
    "https://example.org/max@example.org/foo",
    "https://example.org/max%40example.org/foo",
    "https://example.org/foo#max@example.org",
    "https://example.org/?token=opaque-secret",
  ])("fails closed instead of rewriting an unsafe source URL: %s", (sourceUrl) => {
    expect(validateCreateSourceUrlForPersistence(sourceUrl)).toEqual({ ok: false });
  });

  it("keeps a PII-free canonical source URL intact", () => {
    const sourceUrl = "https://example.org/article?id=123";

    expect(validateCreateSourceUrlForPersistence(sourceUrl)).toEqual({
      ok: true,
      canonicalUrl: sourceUrl,
    });
  });

  it("renders the clarification options, youtube warning and honest guardrails", () => {
    const html = renderToStaticMarkup(
      <CreateLinkIntakeClarification
        locale="de"
        detection={detectCreateLinkIntake("https://youtube.com/watch?v=demo123")}
        selectedIntentId="prepare_factcheck"
        additionalContext="Bitte auf die Hauptaussage und die Quelle achten."
        onSelectIntent={() => {}}
        onAdditionalContextChange={() => {}}
      />,
    );

    expect(html).toContain("Ich habe einen Quellenhinweis erkannt. Was soll ich daraus vorbereiten?");
    expect(html).toContain("YouTube-Link erkannt.");
    expect(html).toContain("Zusammenfassen");
    expect(html).toContain("Aussagen ableiten");
    expect(html).toContain("Prüfpfad vorbereiten");
    expect(html).toContain("Als Quelle vormerken");
    expect(html).toContain("Abstimmungsfragen ableiten");
    expect(html).toContain("Ausgewählt: Prüfpfad vorbereiten");
    expect(html).toContain("Ich bereite diesen nächsten Schritt vor. Der Inhalt wurde noch nicht automatisch ausgewertet.");
    expect(html).toContain("Keine automatische Kostenbuchung");
    expect(html).toContain("Was ist daran wichtig?");
    expect(html).toContain("Schreib einfach weiter");
  });

  it("builds a source-only notice that does not claim automatic evaluation", () => {
    const notice = buildCreateLinkSourceNotice({
      locale: "de",
      selectedIntentId: "extract_claims",
    });

    expect(notice).toContain("Gewählt: Aussagen ableiten.");
    expect(notice).toContain("Der Link bleibt vorerst ein Quellenhinweis.");
    expect(notice).not.toContain("automatisch extrahiert");
    expect(notice).not.toContain("ausgelesen");
    expect(notice).not.toContain("E150-Mirror");
  });
});
