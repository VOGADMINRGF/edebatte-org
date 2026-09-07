import * as React from "react";
import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CreateVisualFollowup from "@/features/create/CreateVisualFollowup";
import CreateProgressiveTransparency from "@/features/create/CreateProgressiveTransparency";
import {
  buildCreateInitialProgressEvents,
  buildCreateValidatedProgressEvents,
} from "@/features/create/createProgressEventContract";
import { buildCreateIntelligentFollowup } from "@/features/create/intelligentFollowup";
import {
  CREATE_FAST_INTAKE_TIMEOUT_MS,
  CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
  CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
} from "@/features/create/createFastIntakeTiming";

const REGRESSION_TEXT =
  "Ich bin für Mindestlohn für behinderte Menschen in Behindertenwerkstätten, aber ich bin auch für stärkere Kontrollen/Transparenz der Vorstände.";
const EXPECTED_TOPIC =
  "Mindestlohn und Kontrolle in Behindertenwerkstätten";
const EXPECTED_ASPECTS = [
  "Faire Entlohnung / Mindestlohn",
  "Kontrolle / Governance der Träger bzw. Vorstände",
];
const LONG_COMMUNAL_PROGRAM = `Kommunales Programm für unsere Gemeinde:
1. Mobilität und Verkehr: Busverbindungen ausbauen und sichere Radwege schaffen.
2. Wohnen: Bezahlbaren Wohnraum sichern und Leerstand begrenzen.
3. Klima und Energie: Kommunale Gebäude sanieren und erneuerbare Energie nutzen.
4. Bildung: Schulen modernisieren und Ganztagsangebote stärken.
5. Gesundheit und Pflege: Lokale Versorgung und Pflegeberatung verbessern.
6. Digitale Verwaltung: Anträge verständlich und barrierefrei online anbieten.
7. Sicherheit: Beleuchtung, Prävention und erreichbare Ansprechstellen verbessern.
8. Kultur: Bibliotheken, Vereine und freie Kultur verlässlich fördern.
9. Kommunale Finanzen: Investitionen transparent priorisieren.
10. Wirtschaft: Lokale Betriebe und Ausbildung unterstützen.
11. Soziales: Beratungsangebote gegen Armut und Einsamkeit ausbauen.
12. Integration: Teilhabe und Sprachförderung stärken.
13. Stadtentwicklung: Öffentliche Räume inklusiv und klimaangepasst gestalten.
14. Bürgerbeteiligung: Entscheidungen früh erklären und Beteiligung ermöglichen.`;
const noop = () => {};

describe.runIf(process.env.CREATE_LIVE_REGRESSION_SMOKE === "1")(
  "create planner live responsive smoke",
  () => {
    it.each([
      ["desktop", 1_440, 900],
      ["mobile", 390, 844],
    ])(
      "returns and renders the canonical result on %s",
      async (device, width, height) => {
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage({ viewport: { width, height } });
          const fastIntakeStartedAt = performance.now();
          const operationId = `live-regression-${device}-${Date.now()}`;
          const initialProgress = buildCreateInitialProgressEvents({
            text: REGRESSION_TEXT,
            locale: "de",
            operationId,
            correlationId: operationId,
          });
          await page.setContent(
            renderToStaticMarkup(
              <CreateProgressiveTransparency
                events={initialProgress.events}
                isRunning
                locale="de"
              />,
            ),
            { waitUntil: "domcontentloaded" },
          );
          const firstProgressVisibleMs = Math.round(
            performance.now() - fastIntakeStartedAt,
          );
          const result = await buildCreateIntelligentFollowup({
            text: REGRESSION_TEXT,
            locale: "de",
            intent: "contribute",
            requestId: operationId,
            operationId,
            operationType: "create_intelligent_followup_planner",
          });
          const finalProgress = buildCreateValidatedProgressEvents({
            operationId,
            correlationId: operationId,
            locale: "de",
            structure: initialProgress.structure,
            topics: result.understanding.topics,
            scopes: result.understanding.scopes,
            qualityPassed:
              result.meta?.planner?.qualityStatus === "specific" &&
              result.meta.planner.plannerDegraded === false &&
              result.meta?.analysis?.state === "result_ready",
            partial: result.meta?.analysis?.state !== "result_ready",
          });
          const allProgress = [...initialProgress.events, ...finalProgress];
          const html = renderToStaticMarkup(
            <div data-test-viewport={`${width}x${height}`} style={{ width }}>
              <CreateProgressiveTransparency
                events={allProgress}
                isRunning={false}
                locale="de"
              />
              <CreateVisualFollowup
                result={result}
                onConfirm={noop}
                onEdit={noop}
                onPrepareSubmission={noop}
                onPrepareAnlassraum={noop}
                onOpenDossierAppend={noop}
                onOpenDossierCreate={noop}
                onPrepareVote={noop}
                onRequestEditorialReview={noop}
                onStartOptionalService={noop}
                onSaveOnly={noop}
                continuationValue=""
                onContinuationChange={noop}
                onContinueConversation={noop}
              />
            </div>,
          );
          await page.setContent(html, { waitUntil: "domcontentloaded" });
          const firstValidatedTopicVisibleMs = Math.round(
            performance.now() - fastIntakeStartedAt,
          );
          const visible = await page
            .locator("[data-create-understanding-aspects]")
            .isVisible();
          const finalVisibleMs = Math.round(
            performance.now() - fastIntakeStartedAt,
          );
          const planner = result.meta?.planner;
          const evidence = {
            device: `${device} ${width}x${height}`,
            durableSaveMs: null,
            firstProgressVisibleMs,
            firstValidatedTopicVisibleMs,
            finalPlannerMs: planner?.runtimeMs ?? null,
            finalVisibleMs,
            eventCount: allProgress.length,
            correctedEventCount: allProgress.filter(
              (event) => event.status === "corrected",
            ).length,
            canonicalTopicCount: result.understanding.topics.length,
            mainTopic: result.understanding.topics[0]?.label ?? null,
            aspects: result.understanding.aspects ?? [],
            stance: result.understanding.statements[0]?.stance ?? null,
            provider: planner?.plannerProvider ?? null,
            model:
              planner?.providerAttempts[0]?.model ??
              planner?.plannerDebug.usedModel ??
              null,
            providerAttempts: planner?.providerAttemptCount ?? null,
            selectedTimingLane: planner?.timingLane ?? null,
            inputLength: planner?.inputLength ?? null,
            plannerMs: planner?.runtimeMs ?? null,
            postPlannerToVisibleMs:
              typeof planner?.runtimeMs === "number"
                ? Math.max(0, finalVisibleMs - planner.runtimeMs)
                : null,
            fastIntakeToVisibleMs: finalVisibleMs,
          };

          console.info(`[create-live-regression] ${JSON.stringify(evidence)}`);
          expect(result.understanding.topics.map((topic) => topic.label)).toEqual([
            EXPECTED_TOPIC,
          ]);
          expect(result.understanding.aspects).toEqual(EXPECTED_ASPECTS);
          expect(result.understanding.scopes).toEqual(["unclear"]);
          expect(result.understanding.statements[0]?.stance).toBe("pro");
          expect(planner?.issueMode).toBe("single_issue");
          expect(planner?.timingLane).toBe("fast");
          expect(planner?.plannerProvider).toBe("openai");
          expect(planner?.providerAttemptCount).toBe(1);
          expect(planner?.runtimeMs).toBeLessThan(
            CREATE_FAST_INTAKE_TIMEOUT_MS + 300,
          );
          expect(firstProgressVisibleMs).toBeLessThan(finalVisibleMs);
          expect(finalVisibleMs).toBeLessThan(
            CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
          );
          expect(visible).toBe(true);
          expect(html).toContain("Ich sehe einen gemeinsamen Kern.");
          expect(html).toContain("1 Thema sichtbar");
          expect(EXPECTED_ASPECTS.every((aspect) => html.includes(aspect))).toBe(true);
          expect(html).not.toMatch(/\[object Object\]|&quot;undefined&quot;|&quot;null&quot;/);
        } finally {
          await browser.close();
        }
      },
      10_000,
    );

    it("returns and renders the structured 14-topic package without the fast lane", async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const submitStartedAt = performance.now();
        const operationId = `live-regression-long-${Date.now()}`;
        const initialProgress = buildCreateInitialProgressEvents({
          text: LONG_COMMUNAL_PROGRAM,
          locale: "de",
          operationId,
          correlationId: operationId,
        });
        await page.setContent(
          renderToStaticMarkup(
            <CreateProgressiveTransparency
              events={initialProgress.events}
              isRunning
              locale="de"
            />,
          ),
          { waitUntil: "domcontentloaded" },
        );
        const firstProgressVisibleMs = Math.round(
          performance.now() - submitStartedAt,
        );
        expect(
          await page
            .getByText("Struktur erkannt: 14 getrennte Abschnitte.")
            .isVisible(),
        ).toBe(true);
        const result = await buildCreateIntelligentFollowup({
          text: LONG_COMMUNAL_PROGRAM,
          locale: "de",
          intent: "contribute",
          requestId: operationId,
          operationId,
          operationType: "create_intelligent_followup_planner",
        });
        const finalProgress = buildCreateValidatedProgressEvents({
          operationId,
          correlationId: operationId,
          locale: "de",
          structure: initialProgress.structure,
          topics: result.understanding.topics,
          scopes: result.understanding.scopes,
          qualityPassed:
            result.meta?.planner?.qualityStatus === "specific" &&
            result.meta.planner.plannerDegraded === false &&
            result.meta?.analysis?.state === "result_ready",
          partial: result.meta?.analysis?.state !== "result_ready",
        });
        const allProgress = [...initialProgress.events, ...finalProgress];
        const html = renderToStaticMarkup(
          <>
            <CreateProgressiveTransparency
              events={allProgress}
              isRunning={false}
              locale="de"
            />
            <CreateVisualFollowup
              result={result}
              compactBranchLimit={4}
              onConfirm={noop}
              onEdit={noop}
              onPrepareSubmission={noop}
              onPrepareAnlassraum={noop}
              onOpenDossierAppend={noop}
              onOpenDossierCreate={noop}
              onPrepareVote={noop}
              onSaveOnly={noop}
              continuationValue=""
              onContinuationChange={noop}
              onContinueConversation={noop}
            />
          </>,
        );
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        const firstValidatedTopicVisibleMs = Math.round(
          performance.now() - submitStartedAt,
        );
        const finalVisibleMs = Math.round(performance.now() - submitStartedAt);
        const planner = result.meta?.planner;
        const evidence = {
          durableSaveMs: null,
          firstProgressVisibleMs,
          firstValidatedTopicVisibleMs,
          finalPlannerMs: planner?.runtimeMs ?? null,
          finalVisibleMs,
          eventCount: allProgress.length,
          correctedEventCount: allProgress.filter(
            (event) => event.status === "corrected",
          ).length,
          selectedTimingLane: planner?.timingLane ?? null,
          inputLength: planner?.inputLength ?? null,
          canonicalTopicCount: result.understanding.topics.length,
          issueMode: planner?.issueMode ?? null,
          provider: planner?.plannerProvider ?? null,
          model: planner?.plannerDebug.usedModel ?? null,
          providerAttempts: planner?.providerAttemptCount ?? null,
          plannerMs: planner?.runtimeMs ?? null,
          submitToVisibleResultMs: finalVisibleMs,
        };

        console.info(`[create-live-regression-long] ${JSON.stringify(evidence)}`);
        expect(planner?.issueMode).toBe("multi_issue");
        expect(planner?.timingLane).toBe("standard");
        expect(result.understanding.topics).toHaveLength(14);
        expect(result.understanding.topics.slice(0, 5).map((topic) => topic.label)).toEqual([
          "Mobilität und Verkehr",
          "Wohnen",
          "Klima und Energie",
          "Bildung",
          "Gesundheit und Pflege",
        ]);
        expect(planner?.plannerProvider).toBe("openai");
        expect(firstProgressVisibleMs).toBeLessThan(firstValidatedTopicVisibleMs);
        expect(finalVisibleMs).toBeLessThan(
          CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
        );
        expect(html).toContain("+ 10 weitere geprüfte Themen");
        expect(html).toContain("Das ist kein einzelnes Anliegen, sondern ein Vorschlagspaket.");
        expect(html).toContain("Ich erkenne 14 Themenbereiche.");
        expect(html).toContain("+10 weitere Themen");
        expect(html).toContain("Noch nicht veröffentlicht");
      } finally {
        await browser.close();
      }
    }, 20_000);
  },
);
