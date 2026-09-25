import { describe, expect, it } from "vitest";
import {
  buildVoxyStaticCanonFinalPlan,
  validateVoxyStaticCanonFinalPlan,
  VOXY_REJECTED_MOTION_HEAD,
  VOXY_STATIC_CANON_BOARDS,
  VOXY_STATIC_CANON_FINAL_CAMERA,
  VOXY_STATIC_CANON_PIXEL_SOURCE,
  VOXY_STATIC_RECOVERY_REVIEW_HEAD,
} from "@/features/voxyVideo/staticCanonRecovery";
import {
  renderVoxyStaticCanonFinalComparisonHtml,
  renderVoxyStaticCanonFinalHtml,
} from "@/features/voxyVideo/staticCanonRecoveryHtml";

const HEAD = "9cb25e91ae6fe04f7e532e8116cf0f500ee30ddb";
const DATA_URL = "data:image/png;base64,canonical";
const ASSETS = {
  canonStageDataUrl: DATA_URL,
  wordmarkDataUrl: "data:image/svg+xml;base64,wordmark",
  lapelPinDataUrl: "data:image/svg+xml;base64,lapel",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,pocket",
};

describe("Voxy static canon final contract", () => {
  it("binds all four human-approved canon boards by exact path and SHA", () => {
    expect(VOXY_STATIC_CANON_BOARDS).toHaveLength(4);
    expect(VOXY_STATIC_CANON_BOARDS.map((board) => board.id)).toEqual([
      "CANON-01",
      "CANON-02",
      "CANON-03",
      "CANON-04",
    ]);
    expect(VOXY_STATIC_CANON_BOARDS.every((board) => board.sha256.length === 64))
      .toBe(true);
    expect(VOXY_STATIC_CANON_PIXEL_SOURCE.id).toBe("CANON-04");
  });

  it("records A as primary, C as editorial and excludes rejected B", () => {
    const plan = buildVoxyStaticCanonFinalPlan(HEAD);
    expect(plan.primaryMaster).toBe("A");
    expect(plan.editorialVariant).toBe("C");
    expect(plan.rejectedVariant).toBe("B");
    expect(plan.rejectedVariantIncluded).toBe(false);
    expect(plan.variants.map((variant) => variant.fileName)).toEqual([
      "primary-a-final.png",
      "editorial-c-final.png",
    ]);
    expect(plan.cleanPrimaryFileName).toBe("primary-a-clean.png");
    expect(plan.comparisonFileName).toBe("canon-comparison-final.png");
    expect(JSON.stringify(plan.variants)).not.toContain("candidate-b-broadcast");
  });

  it("keeps one identical character, studio, camera and waveform across A and C", () => {
    const plan = buildVoxyStaticCanonFinalPlan(HEAD);
    expect(new Set(plan.variants.map((variant) => variant.characterPixelSource)))
      .toEqual(new Set([VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath]));
    expect(new Set(plan.variants.map((variant) => JSON.stringify(variant.camera))))
      .toEqual(new Set([JSON.stringify(VOXY_STATIC_CANON_FINAL_CAMERA)]));
    expect(new Set(plan.variants.map((variant) => JSON.stringify(variant.waveform))))
      .toEqual(new Set([JSON.stringify(plan.waveform)]));
    expect(plan.waveform).toEqual({
      count: 1,
      placement: "behind_voxy",
      futureAudioReactiveEligible: true,
      currentlyAudioReactive: false,
    });
    expect(plan.audioAnalysisImplemented).toBe(false);
  });

  it("records the accepted recovery direction and rejected motion without upgrading either gate", () => {
    const plan = buildVoxyStaticCanonFinalPlan(HEAD);
    expect(plan.recoveryReview).toEqual({
      exactHeadSha: VOXY_STATIC_RECOVERY_REVIEW_HEAD,
      visualDirection: "accepted_for_final_refinement",
    });
    expect(plan.previousMotion).toEqual({
      exactHeadSha: VOXY_REJECTED_MOTION_HEAD,
      humanVisualAcceptance: "rejected",
      usedAsVisualSource: false,
    });
  });

  it("keeps animation, production and publishing fail-closed", () => {
    const plan = buildVoxyStaticCanonFinalPlan(HEAD);
    expect(plan.externalProviderUsed).toBe(false);
    expect(plan.externalUploadUsed).toBe(false);
    expect(plan.generativeRedrawUsed).toBe(false);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.animationEligible).toBe(false);
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(validateVoxyStaticCanonFinalPlan(plan)).toEqual([]);
  });

  it("rejects character/source drift and any second or active waveform", () => {
    const sourceDrift = structuredClone(buildVoxyStaticCanonFinalPlan(HEAD));
    sourceDrift.variants[1].characterPixelSource =
      "apps/web/public/brands/voxy/references/canon/CANON-03-broadcast-layout-teal.png" as typeof sourceDrift.variants[1]["characterPixelSource"];
    expect(validateVoxyStaticCanonFinalPlan(sourceDrift)).toContain(
      "final_character_source_must_be_identical",
    );

    const duplicateWaveform = structuredClone(buildVoxyStaticCanonFinalPlan(HEAD));
    duplicateWaveform.waveform.count = 2 as 1;
    duplicateWaveform.waveform.currentlyAudioReactive = true as false;
    expect(validateVoxyStaticCanonFinalPlan(duplicateWaveform)).toContain(
      "single_background_waveform_contract_invalid",
    );
  });

  it("renders final A and C with a single semantic background-waveform contract", () => {
    const plan = buildVoxyStaticCanonFinalPlan(HEAD);
    for (const variant of plan.variants) {
      const html = renderVoxyStaticCanonFinalHtml({
        plan,
        variant,
        assets: ASSETS,
      });
      expect(html).toContain(`data-variant-id="${variant.id}"`);
      expect(html).toContain('data-character-source="CANON-04"');
      expect(html).toContain('data-waveform-count="1"');
      expect(html).toContain('data-waveform-placement="behind_voxy"');
      expect(html).toContain('data-future-audio-reactive-eligible="true"');
      expect(html).toContain('data-currently-audio-reactive="false"');
      expect(html).not.toContain("broadcast-monitor");
      expect(html).not.toContain('class="meter"');
      expect(html).not.toContain("candidate-b-broadcast");
      expect(html).not.toContain("<video");
      expect(html).not.toContain("<canvas");
      expect(html).not.toMatch(/https?:\/\//);
      expect(html).not.toContain("@keyframes");
      expect(html).toContain(
        'data-character-marks="canon-geometry-reconstructed-vector-wordmarks"',
      );
      expect(html).toContain("reconstructed-lapel-pin");
      expect(html).toContain("reconstructed-pocket-mark");
      expect(html).toContain('alt="VOXY"');
      expect(html).toContain('alt="eDebatte"');
    }
  });

  it("renders a clean primary base without example content layers", () => {
    const plan = buildVoxyStaticCanonFinalPlan(HEAD);
    const html = renderVoxyStaticCanonFinalHtml({
      plan,
      variant: plan.variants[0],
      assets: ASSETS,
      clean: true,
    });
    expect(html).toContain("PRIMARY A · CLEAN");
    expect(html).toContain("CLEAN MASTER BASE · HUMAN REVIEW");
    expect(html).not.toContain('class="content-rail');
    expect(html).not.toContain('class="lower-third"');
    expect(html).not.toContain("Headline und Kernaussage");
  });

  it("places only final A/C and all four Canon boards into the comparison", () => {
    const html = renderVoxyStaticCanonFinalComparisonHtml({
      finalDataUrls: {
        "primary-a-final": "data:image/png;base64,a",
        "editorial-c-final": "data:image/png;base64,c",
      },
      canonBoards: VOXY_STATIC_CANON_BOARDS.map((board) => ({
        id: board.id,
        dataUrl: DATA_URL,
      })),
    });
    expect(html).toContain("PRIMARY A · BROADCAST MASTER");
    expect(html).toContain("EDITORIAL C · ANLASS-VARIANTE");
    expect(html).toContain("B = rejected");
    expect(html).not.toContain("B · BROADCAST");
    for (const board of VOXY_STATIC_CANON_BOARDS) {
      expect(html).toContain(board.id);
    }
    expect(html).toContain("keine automatische Qualitätsaussage");
    expect(html).not.toMatch(/95\s*%/);
  });
});
