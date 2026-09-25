import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SwipeTopicStep } from "@/features/surfaces/swipes/components/SwipeTopicStep";
import { SwipeDetailSheet } from "@/features/surfaces/swipes/components/SwipeDetailSheet";
import type { SwipeItem } from "@/features/swipes/types";

const ITEM: SwipeItem = {
  id: "feed-1",
  title: "Soll das Wärmenetz ausgebaut werden?",
  text: "Ein Feed-Hinweis verweist auf neue Ausbauoptionen.",
  category: "Energie",
  level: "Kommune",
  topicTags: ["Wärmenetz"],
  evidenceCount: 2,
  responsibilityLabel: "Zuständigkeit: Kommune",
  domainLabel: "Energie",
  hasEventualities: false,
  eventualitiesCount: 0,
  sourceType: "feed",
  sourceLabel: "Feed-Radar",
  supplyBuckets: ["from_feed", "public_recent", "needs_review"],
  supplyLabel: "Aus dem Feed-Radar",
  supplyHint: "Der Hinweis ist sichtbar, bleibt aber bis zur Prüfung ein Vorschlag.",
  contextHref: "/runden?anlassraumId=65f000000000000000000401",
  dossierHref: "/dossier/65f000000000000000000777",
  statusLabel: "Vorschlag aus dem Feed-Radar",
  statusHint: "Noch keine automatische Veröffentlichung.",
};

describe("swipes public topic supply contract", () => {
  it("shows why a topic is visible on the swipe card", () => {
    const html = renderToStaticMarkup(<SwipeTopicStep item={ITEM} step={1} onVote={() => {}} />);

    expect(html).toContain("Warum wird dir das angezeigt?");
    expect(html).toContain("Aus dem Feed-Radar");
    expect(html).toContain("bleibt aber bis zur Prüfung ein Vorschlag");
  });

  it("keeps dossier and anlassraum context links visible in the detail sheet", () => {
    const html = renderToStaticMarkup(
      <SwipeDetailSheet
        open
        item={ITEM}
        eventualities={[]}
        loadingEventualities={false}
        dossierHref={ITEM.dossierHref ?? null}
        evidenceHref="/factcheck?statementId=feed-1"
        votesHref="/abstimmungen"
        onClose={() => {}}
      />,
    );

    expect(html).toContain("Warum sehe ich das?");
    expect(html).toContain("Vollständigen Hintergrund");
    expect(html).toContain("Zum Thema");
    expect(html).toContain("bleibt aber bis zur Prüfung ein Vorschlag");
  });
});
