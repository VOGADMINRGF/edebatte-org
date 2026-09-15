import { describe, expect, it } from "vitest";
import {
  buildRundenGuidedCreateHref,
  deriveRundenFlowDraft,
  reorderOptions,
} from "@/features/surfaces/runden/guidedQuestionBuilder";

describe("runden guided question builder contract", () => {
  it("derives occasion, question and default options from free text", () => {
    const draft = deriveRundenFlowDraft(
      "Im Viertel fehlen sichere Schulwege. Eltern melden seit Wochen kritische Kreuzungen.",
    );

    expect(draft.occasion).toContain("Im Viertel fehlen sichere Schulwege");
    expect(draft.question).toContain("Soll");
    expect(draft.options.length).toBe(3);
    expect(draft.questionGuard.releaseState).toBe("review_required");
  });

  it("does not derive answer options from blocked safety input", () => {
    const draft = deriveRundenFlowDraft("Sollen wir diese Gruppe verprügeln?");

    expect(draft.questionGuard.outcome).toBe("safety_blocked");
    expect(draft.options).toEqual([]);
  });

  it("builds prepare and verify hrefs with route-bound reasons", () => {
    const prepareHref = buildRundenGuidedCreateHref({
      direction: "prepare",
      input: "Neue Frage zum Anlass",
      returnTo: "/runden?view=active",
      anlassraumId: "65f000000000000000000011",
    });
    const verifyHref = buildRundenGuidedCreateHref({
      direction: "verify",
      input: "Neue Frage zum Anlass",
      returnTo: "/runden?view=active",
      anlassraumId: "65f000000000000000000011",
    });

    expect(prepareHref).toContain("reason=round_prepare_question");
    expect(prepareHref).toContain("entryMode=direct");
    expect(verifyHref).toContain("reason=round_verify_readiness");
    expect(verifyHref).toContain("entryMode=guided");
  });

  it("reorders option priority without mutating out-of-range requests", () => {
    const base = ["A", "B", "C"];
    expect(reorderOptions(base, 2, 0)).toEqual(["C", "A", "B"]);
    expect(reorderOptions(base, 4, 0)).toEqual(base);
  });
});
