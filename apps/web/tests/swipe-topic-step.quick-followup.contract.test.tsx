import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SwipeTopicStep } from "@/features/surfaces/swipes/components/SwipeTopicStep";
import type { SwipeItem } from "@/features/swipes/types";

const ITEM: SwipeItem = {
  id: "st_1",
  title: "Soll die Busspur in der Hauptstraße priorisiert werden?",
  text: "Kurzbeschreibung",
  level: "Kommune",
  category: "Mobilität",
  domainLabel: "Verkehr",
  topicTags: ["Busspur"],
  sourceType: "civic",
  sourceLabel: "Bürgerhinweis",
  responsibilityLabel: "Zuständigkeit: Kommune",
  evidenceCount: 2,
  eventualitiesCount: 3,
  hasEventualities: true,
};

describe("swipe topic quick follow-up contract", () => {
  it("keeps details secondary and exposes the next card in the same deck", () => {
    const html = renderToStaticMarkup(
      <SwipeTopicStep item={ITEM} nextItem={{ ...ITEM, id: "st_2", title: "Nächste Frage" }} step={1} onVote={vi.fn()} onQuickFollowup={vi.fn()} />,
    );

    expect(html).toContain('data-swipe-deck="mobile-first"');
    expect(html).toContain('data-swipe-card="active"');
    expect(html).toContain('data-swipe-card="next"');
    expect(html).toContain("Details &amp; Quellen");
    expect(html).toContain("← Nein");
    expect(html).toContain("Ja →");
    expect(html).not.toContain("Für später speichern");
  });
});
