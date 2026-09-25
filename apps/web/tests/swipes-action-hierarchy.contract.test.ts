import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("swipes action hierarchy contract", () => {
  it("keeps votes immediate while details remain an explicit secondary action", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/swipes/SwipesClient.tsx"), "utf8");
    const detailSource = readFileSync(
      resolve(process.cwd(), "src/features/surfaces/swipes/components/SwipeDetailSheet.tsx"),
      "utf8",
    );

    expect(source).toContain('data-swipe-controls="touch-fallback"');
    expect(source).toContain('aria-keyshortcuts="ArrowLeft"');
    expect(source).toContain('aria-keyshortcuts="ArrowRight"');
    expect(source).toContain("queueVotePayload({ statementId: item.id, decision });");
    expect(source).toContain("moveToNextTopic();");
    expect(source).not.toContain("NeutralReasonPrompt");
    expect(source).not.toContain("Was fehlt dir gerade für eine Entscheidung?");
    expect(source).not.toContain("Optional direkt Variante wählen");
    expect(source).not.toContain("Schnellaktionen");

    expect(source).toContain("Quellenlage");
    expect(source).toContain("Mögliche Folgen");
    expect(source).toContain("Aus deinem Beitrag");
    expect(source).toContain("Dazu abstimmen");
    expect(source).toContain("Ähnliche Claims ansehen");
    expect(source).toContain("Zurück zum Beitrags-Seed");
    expect(source).toContain("Wir haben noch keine passende Abstimmung gefunden.");
    expect(source).toContain("Keine automatische Stimme.");
    expect(detailSource).toContain("Andere Möglichkeiten & offene Folgen");
    expect(detailSource).toContain("Quellen prüfen");
    expect(detailSource).not.toContain("Evidenz ansehen");
  });

  it("makes reduced motion and mobile safe areas explicit", () => {
    const topicStepSource = readFileSync(
      resolve(process.cwd(), "src/features/surfaces/swipes/components/SwipeTopicStep.tsx"),
      "utf8",
    );
    const surfaceSource = readFileSync(
      resolve(process.cwd(), "src/features/surfaces/swipes/SwipesSurface.tsx"),
      "utf8",
    );

    expect(topicStepSource).toContain("useReducedMotion");
    expect(topicStepSource).toContain("motion-reduce:transition-none");
    expect(topicStepSource).toContain('data-swipe-card="next"');
    expect(surfaceSource).toContain("env(safe-area-inset-bottom)");
    expect(surfaceSource).toContain("overflow-x-clip");
  });
});
