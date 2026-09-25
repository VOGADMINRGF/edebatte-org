import { describe, expect, it } from "vitest";
import {
  buildVoxyCharacterMotionFixturePlan,
  getVoxyFixtureDimensions,
  validateVoxyCharacterMotionFixturePlan,
} from "@/features/voxyVideo/characterMotionFixture";
import { renderVoxyCharacterMotionFixtureHtml } from "@/features/voxyVideo/characterMotionFixtureHtml";
import { VOXY_LOCAL_RIG } from "@/features/voxyVideo/animatableMasterAsset";

function minimalRigSvg(): string {
  const ids = new Set([
    ...VOXY_LOCAL_RIG.controls.flatMap((control) => control.nodeIds),
    ...VOXY_LOCAL_RIG.immutableBrandOverlays,
    ...VOXY_LOCAL_RIG.hands.left.digitIds,
    ...VOXY_LOCAL_RIG.hands.right.digitIds,
  ]);
  return `<svg xmlns="http://www.w3.org/2000/svg">${[...ids]
    .map((id) => `<g id="${id}"></g>`)
    .join("")}</svg>`;
}

describe("Voxy character motion fixture", () => {
  it("supports the three required review output formats", () => {
    expect(getVoxyFixtureDimensions("16:9")).toEqual({ width: 1280, height: 720 });
    expect(getVoxyFixtureDimensions("9:16")).toEqual({ width: 720, height: 1280 });
    expect(getVoxyFixtureDimensions("1:1")).toEqual({ width: 1080, height: 1080 });
  });

  it("builds a contiguous eight-second review-first fixture", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    expect(validateVoxyCharacterMotionFixturePlan(plan)).toEqual({ ok: true, errors: [] });
    expect(plan.version).toBe("voxy-character-motion-fixture-v3");
    expect(plan.durationMs).toBe(8_000);
    expect(plan.fps).toBe(24);
    expect(plan.reviewRequired).toBe(true);
    expect(plan.autoPublish).toBe(false);
    expect(plan.lipSync).toBe(false);
    expect(plan.editorialMode).toBe("facts_updates_only");
    expect(plan.politicalInterpretationAllowed).toBe(false);
    expect(plan.recommendationsAllowed).toBe(false);
    expect(plan.scenes[0]?.startMs).toBe(0);
    expect(plan.scenes.at(-1)?.endMs).toBe(plan.durationMs);
  });

  it("uses the canonical plural brands path and separates studio from character", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    expect(plan.studioAssetPath).toBe(
      "/brands/voxy/studio/voxy-studio-background-16x9.svg",
    );
    expect(plan.characterAssetPath).toBe(
      "/brands/voxy/characters/voxy-sitting-master.svg",
    );
    expect(plan.templateAssetPath).toContain("/brands/voxy/templates/");
    expect(plan.characterAssetPath).not.toBe(plan.studioAssetPath);
  });

  it("locks anatomy, branding and waveform placement", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    expect(plan.anatomyContract.visibleFingerCountPerHand).toBe(5);
    expect(plan.anatomyContract.vogPinRequired).toBe(true);
    expect(plan.anatomyContract.edebattePocketMarkRequired).toBe(true);
    expect(plan.waveformContract.position).toBe("behind_character");
    expect(plan.waveformContract.mayOverlapLogo).toBe(false);
  });

  it("contains the four deterministic rig states used by the eight-second clip", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    expect(plan.scenes.map((scene) => scene.kind)).toEqual([
      "opening",
      "explanation",
      "contrast",
      "invitation",
    ]);
    expect(plan.scenes.map((scene) => scene.motion)).toEqual([
      "neutral_idle",
      "explaining",
      "showing_contrast",
      "inviting_participation",
    ]);
    expect(plan.scenes.find((scene) => scene.kind === "explanation")?.sourceIds)
      .toHaveLength(3);
    expect(plan.scenes.find((scene) => scene.kind === "contrast")?.sourceIds)
      .toHaveLength(1);
  });

  it("rejects timeline gaps, missing sources and broken anatomy", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    plan.scenes[1] = { ...plan.scenes[1], startMs: 1_700, sourceIds: [] };
    plan.anatomyContract = { ...plan.anatomyContract, visibleFingerCountPerHand: 4 as 5 };
    const validation = validateVoxyCharacterMotionFixturePlan(plan);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("scene_timeline_gap_or_overlap:explanation");
    expect(validation.errors).toContain("explanation_requires_sources");
    expect(validation.errors).toContain("five_finger_anatomy_contract_broken");
  });

  it("renders a provider-free studio composition without a second waveform", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    const html = renderVoxyCharacterMotionFixtureHtml({
      plan,
      embeddedStudioAssetUrl: "data:image/svg+xml;base64,studio",
      embeddedCharacterSvg: minimalRigSvg(),
    });

    expect(html).toContain("VOXY · ON AIR");
    expect(html).toContain("QUELLENSTAND");
    expect(html).toContain("GEGENPOSITION");
    expect(html).toContain("OFFENE FRAGE");
    expect(html).toContain("Lokales Layer-/Pivot-Rig");
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("studio-layer");
    expect(html).toContain("character-stage");
    expect(html).toContain('data-rig-id="voxy-stretchy-compatible-svg-rig"');
    expect(html).toContain("#left-hand-five-fingers");
    expect(html).toContain("rotate(calc(-58deg");
    expect(html).toContain("rotate(calc(58deg");
    expect(html).toContain("0%,20%");
    expect(html).not.toContain('class="waveform"');
    expect(html).not.toContain("HeyGen");
  });

  it("prevents long card copy from rendering past the right edge", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    const html = renderVoxyCharacterMotionFixtureHtml({
      plan,
      embeddedCharacterSvg: minimalRigSvg(),
    });
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain("max-width:100%");
    expect(html).toContain("hyphens:auto");
  });

  it("rejects raster-backed or incomplete character rigs", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("16:9");
    expect(() =>
      renderVoxyCharacterMotionFixtureHtml({
        plan,
        embeddedCharacterSvg:
          '<svg xmlns="http://www.w3.org/2000/svg"><image href="character.png"/></svg>',
      }),
    ).toThrow("invalid_or_non_local_voxy_rig_svg");
    expect(() =>
      renderVoxyCharacterMotionFixtureHtml({
        plan,
        embeddedCharacterSvg:
          '<svg xmlns="http://www.w3.org/2000/svg"><g id="body"/></svg>',
      }),
    ).toThrow("voxy_rig_node_missing");
  });

  it("adapts the fixture canvas for vertical output", () => {
    const plan = buildVoxyCharacterMotionFixturePlan("9:16");
    const html = renderVoxyCharacterMotionFixtureHtml({
      plan,
      embeddedCharacterSvg: minimalRigSvg(),
    });
    expect(plan.width).toBe(720);
    expect(plan.height).toBe(1280);
    expect(html).toContain("width:720px");
    expect(html).toContain("height:1280px");
    expect(html).toContain("max-aspect-ratio:1/1");
  });
});
