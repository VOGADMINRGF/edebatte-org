import * as React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import CreateVisualFollowup, {
  CreateStructureOverview,
  deriveCreateStructureOverviewMetrics,
} from "@/features/create/CreateVisualFollowup";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";

describe("create planner degraded ui contract", () => {
  it("shows an honest technical state instead of a finished semantic understanding", () => {
    const degradedResult = buildCreateTechnicalFollowup({
      text: "In Rahnsdorf fehlen sichere Querungen an Kita, Straße und Haltestelle.",
      analysisState: "ai_failed",
      sourceType: "text",
      sourceLoaded: true,
      userMessage:
        "Der Inhalt wurde geladen, konnte aber noch nicht durch das KI-Orchester analysiert werden. Es wurden keine Themen abgeleitet.",
    });

    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={degradedResult}
        onConfirm={() => {}}
        onEdit={() => {}}
        onPrepareSubmission={() => {}}
        onPrepareAnlassraum={() => {}}
        onOpenDossierAppend={() => {}}
        onOpenDossierCreate={() => {}}
        onPrepareVote={() => {}}
        onRequestEditorialReview={() => {}}
        onStartOptionalService={() => {}}
        onRetryPlanner={() => {}}
        onSaveOnly={() => {}}
        continuationValue=""
        onContinuationChange={() => {}}
        onContinueConversation={() => {}}
      />,
    );

    expect(html).toContain("Dein Beitrag ist angekommen.");
    expect(html).toContain("Es wurden keine Themen abgeleitet.");
    expect(html).toContain("Erneut versuchen");
    expect(html).toContain("Details &amp; Transparenz");
    expect(html).not.toContain("Ich habe diese Themen erkannt.");
    expect(html).not.toContain("Verkehrssicherheit");
    expect(html).not.toContain("Kita-/Schulweg &amp; Barrierefreiheit");
    expect(html).not.toContain("Stadtplanung &amp; Finanzierung");
    expect(html).not.toContain("Themenstruktur bestätigen");

    const metrics = deriveCreateStructureOverviewMetrics({ result: degradedResult, isConfirmed: false });
    expect(metrics).toEqual({
      prioritiesCount: 1,
      clustersCount: 1,
      questionsCount: 1,
      nextStepsCount: 1,
    });

    const overviewHtml = renderToStaticMarkup(
      <CreateStructureOverview
        locale="de"
        showOpenLabels
        prioritiesCount={0}
        clustersCount={0}
        questionsCount={0}
        nextStepsCount={0}
      />,
    );
    expect((overviewHtml.match(/>Offen<\/span>/g) ?? []).length).toBe(4);
    expect((overviewHtml.match(/>offen<\/span>/g) ?? []).length).toBe(4);
    expect(overviewHtml).not.toContain(">neu</span>");
  });
});
