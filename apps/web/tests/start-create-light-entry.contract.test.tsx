import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import LandingStart from "@/app/start/LandingStart";
import {
  buildLandingContributionDraft,
  buildLandingContributionPreview,
  LANDING_CONTRIBUTION_MAX_LENGTH,
  resolveLandingContinueAction,
} from "@/features/start/landingCreateLight";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/start",
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ locale: "de" }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img alt="" {...props} />,
}));

describe("/start create light entry", () => {
  const landingCreateLightEntrySource = readFileSync(
    resolve(process.cwd(), "src/features/start/LandingCreateLightEntry.tsx"),
    "utf8",
  );

  it("keeps the homepage on the simple product landing instead of the create-light form", () => {
    const html = renderToStaticMarkup(<LandingStart />);

    expect(html).toContain("Eine Frage. Viele Perspektiven. Ein klareres Bild.");
    expect(html).toContain("Mitmachen");
    expect(html).toContain("Etwas starten");
    expect(html).toContain("Schnell deine Meinung abgeben");
    expect(html).toContain("1 Frage · direkt ausprobieren");
    expect(html).not.toContain('data-testid="start-create-light-entry"');
    expect(html).not.toContain("Beitrag eingeben");
  });

  it("blocks too short submissions with a helpful guardrail", () => {
    const draft = buildLandingContributionDraft("Zu teuer.");

    expect(draft.guardrails.canPreview).toBe(false);
    expect(draft.guardrails.blockingMessage).toBe("Bitte beschreibe dein Anliegen noch etwas genauer.");
  });

  it("builds a non-published preview and a deepen handoff for valid input", () => {
    const result = buildLandingContributionPreview(
      "Ich möchte vorschlagen, dass wir an der Clara-Pankower Allee einen sicheren Radweg bauen.",
    );

    expect(result.preview).not.toBeNull();
    expect(result.preview?.notice).toBe("Diese Einordnung ist noch nicht veröffentlicht.");
    expect(result.preview?.contributionTypeLabel).toBe("Vorschlag");
    expect(result.preview?.topicLabels).toContain("Mobilität & öffentlicher Raum");
    expect(result.preview?.openQuestionLabels.length).toBeGreaterThan(0);
    expect(result.preview?.deepenHref).toContain("/create?");
    expect(result.preview?.deepenHref).toContain("startDraft=1");
    expect(result.preview?.deepenHref).toContain("entryIntent=issue_signal");
    expect(result.preview?.newTopicHref).toContain("entryMode=direct");
    expect(result.preview?.existingTopicHref).toContain("/themen?startDraft=1");
    expect(result.preview?.roundsHref).toContain("/runden/new?");
  });

  it("classifies a public issue as relevant and keeps the continue handoff available", () => {
    const draft = buildLandingContributionDraft(
      "Bei uns fehlt ein sicherer Schulweg vor der Grundschule und die Straße ist morgens unübersichtlich.",
    );
    const result = buildLandingContributionPreview(
      "Bei uns fehlt ein sicherer Schulweg vor der Grundschule und die Straße ist morgens unübersichtlich.",
    );

    expect(draft.relevanceClassification).toBe("public_relevant");
    expect(result.preview).not.toBeNull();
    expect(resolveLandingContinueAction(result.preview!, false)).toMatchObject({
      label: "Einloggen und weiterarbeiten",
    });
    expect(resolveLandingContinueAction(result.preview!, false).href).toContain("draft=start");
    expect(resolveLandingContinueAction(result.preview!, true)).toMatchObject({
      label: "Jetzt vertiefen",
    });
  });

  it("classifies slogan-like input such as Freibier für alle as needs_reframe with editorial review option", () => {
    const draft = buildLandingContributionDraft("Freibier für alle");
    const result = buildLandingContributionPreview("Freibier für alle");

    expect(draft.relevanceClassification).toBe("needs_reframe");
    expect(draft.guidance.allowEditorialReview).toBe(true);
    expect(draft.guidance.title).toContain("zugespitzte oder scherzhafte Forderung");
    expect(result.preview).toBeNull();
  });

  it("classifies personal-only wishes as requiring public framing", () => {
    const draft = buildLandingContributionDraft("Ich will ein neues Handy.");

    expect(draft.relevanceClassification).toBe("personal_only");
    expect(draft.guidance.editorialReviewReasonRequired).toBe(true);
  });

  it("classifies linkspam as spam_suspected and blocks the normal handoff", () => {
    const draft = buildLandingContributionDraft(
      "Jetzt kaufen https://spam.example/a https://spam.example/b bester Bonuscode heute",
    );
    const result = buildLandingContributionPreview(
      "Jetzt kaufen https://spam.example/a https://spam.example/b bester Bonuscode heute",
    );

    expect(draft.relevanceClassification).toBe("spam_suspected");
    expect(draft.guidance.allowEditorialReview).toBe(false);
    expect(result.preview).toBeNull();
  });

  it("keeps the lightweight intake free of deepsearch, graph writes and auto dossier behavior", () => {
    const sources = [
      "src/app/start/LandingStart.tsx",
      "src/features/start/LandingCreateLightEntry.tsx",
      "src/features/start/landingCreateLight.ts",
    ].map((path) => readFileSync(resolve(process.cwd(), path), "utf8"));

    for (const source of sources) {
      expect(source).not.toContain("DeepSearch");
      expect(source).not.toContain("recordSwipeVoteInGraph");
      expect(source).not.toContain("callOpenAI");
      expect(source).not.toContain("create_dossier");
      expect(source).not.toContain("orchestrator");
    }
  });

  it("keeps the landing preview bounded by the lightweight character cap", () => {
    const text = "a".repeat(LANDING_CONTRIBUTION_MAX_LENGTH + 10);
    const draft = buildLandingContributionDraft(text);

    expect(draft.guardrails.canPreview).toBe(false);
    expect(draft.guardrails.isTooLong).toBe(true);
  });

  it("prevents full-page form submission and avoids scroll-jump side effects in the create-light form", () => {
    expect(landingCreateLightEntrySource).toContain("event.preventDefault();");
    expect(landingCreateLightEntrySource).not.toContain("window.location.reload");
    expect(landingCreateLightEntrySource).not.toContain("scrollIntoView(");
    expect(landingCreateLightEntrySource).not.toContain(".focus()");
  });

  it("keeps example cards and edit actions as non-submit controls while leaving continue navigation explicit", () => {
    expect(landingCreateLightEntrySource).toContain('type="submit"');
    expect(landingCreateLightEntrySource).toContain('type="button"');
    expect(landingCreateLightEntrySource).toContain("handleExamplePick(card.text)");
    expect(landingCreateLightEntrySource).toContain("resolveLandingContinueAction");
    expect(landingCreateLightEntrySource).toContain("createStartDraftContext");
    expect(landingCreateLightEntrySource).toContain("Anlassraum starten");
    expect(landingCreateLightEntrySource).not.toContain("router.push(");
    expect(landingCreateLightEntrySource).not.toContain("router.replace(");
  });

  it("offers explicit resume-or-restart choices when a start draft already exists", () => {
    expect(landingCreateLightEntrySource).toContain("GlobalDraftStatusBar");
    expect(landingCreateLightEntrySource).toContain("readStartDraftContext");
    expect(landingCreateLightEntrySource).toContain("Letzten Entwurf fortsetzen");
    expect(landingCreateLightEntrySource).toContain("Neuen Beitrag beginnen");
    expect(landingCreateLightEntrySource).toContain("Entwurf verwerfen");
    expect(landingCreateLightEntrySource).not.toContain("scrollIntoView(");
  });
});