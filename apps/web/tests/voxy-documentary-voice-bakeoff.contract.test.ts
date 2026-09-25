import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  VOXY_DOCUMENTARY_BAKEOFF_LICENSE_MATRIX,
  VOXY_DOCUMENTARY_TEST_SEGMENTS,
  VOXY_DOCUMENTARY_TEST_TEXT,
  VOXY_DOCUMENTARY_VISUAL_BINDING,
  VOXY_DOCUMENTARY_VOICE_CANDIDATES,
  validateVoxyDocumentaryVoiceBakeoffContract,
} from "@/features/voxyVideo/documentaryVoiceBakeoff";
import { VOXY_MOUTH_V41_PROFILE_VERSION, VOXY_MOUTH_V41_SHAPES } from "@/features/voxyVideo/mouthV41";

describe("VOXY DOCUMENTARY VOICE BAKE-OFF", () => {
  it("keeps one byte-identical visible German test text for control and three distinct finalists", () => {
    expect(validateVoxyDocumentaryVoiceBakeoffContract()).toEqual([]);
    expect(VOXY_DOCUMENTARY_VOICE_CANDIDATES.map((candidate) => candidate.label)).toEqual(["CONTROL", "A", "B", "C"]);
    expect(new Set(VOXY_DOCUMENTARY_VOICE_CANDIDATES.map((candidate) => candidate.voice)).size).toBe(4);
    expect(VOXY_DOCUMENTARY_TEST_SEGMENTS.map((segment) => segment.text).join("\n\n")).toBe(VOXY_DOCUMENTARY_TEST_TEXT);
    expect(VOXY_DOCUMENTARY_TEST_TEXT).toContain("Hallo, ich bin Voxy.");
    expect(VOXY_DOCUMENTARY_TEST_TEXT).toContain("Du sollst es prüfen können.");
  });

  it("has complete fail-closed engine, model and dataset provenance", () => {
    expect(VOXY_DOCUMENTARY_BAKEOFF_LICENSE_MATRIX.status).toBe("pass");
    for (const candidate of VOXY_DOCUMENTARY_VOICE_CANDIDATES) {
      expect(candidate.engineLicense).toBeTruthy();
      expect(candidate.modelLicense).toBeTruthy();
      expect(candidate.datasetLicense).toBeTruthy();
      expect(candidate.engineSourceUrl).toMatch(/^https:\/\//);
      expect(candidate.modelSourceUrl).toMatch(/^https:\/\//);
      expect(candidate.datasetSourceUrl).toMatch(/^https:\/\//);
      expect(candidate.attribution).toBeTruthy();
      expect(candidate.commercialUse).toBe(true);
      expect(candidate.modelRevision).toMatch(/^[0-9a-f]{40}$/);
      expect(candidate.modelFiles.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
      expect(candidate.knownRisks.length).toBeGreaterThan(0);
    }
  });

  it("requires local offline synthesis and zero runtime network requests", () => {
    expect(VOXY_DOCUMENTARY_VOICE_CANDIDATES.every((candidate) => candidate.offlineAfterProvisioning)).toBe(true);
    expect(VOXY_DOCUMENTARY_VOICE_CANDIDATES.every((candidate) => candidate.runtimeNetworkRequests === 0)).toBe(true);
    const renderer = readFileSync(resolve(process.cwd(), "scripts/render-voxy-documentary-voice-bakeoff.ts"), "utf8");
    const provisioner = readFileSync(resolve(process.cwd(), "scripts/provision-voxy-documentary-voice-bakeoff.ts"), "utf8");
    const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/voxy-documentary-voice-bakeoff-evidence.yml"), "utf8");
    expect(renderer).toContain('PIP_NO_INDEX: "1"');
    expect(renderer).toContain('HF_HUB_OFFLINE: "1"');
    expect(workflow).toContain("unshare --net");
    expect(provisioner).toContain("mimic3_transitive_license_unknown");
    expect(provisioner).toContain("runtime-license-report.json");
  });

  it("binds every preview to the accepted visual master without mouth or waveform drift", () => {
    expect(VOXY_DOCUMENTARY_VISUAL_BINDING.visualMasterHeadSha).toBe("58548d2a5f6e4a59e84464a5c4aea3875f38662c");
    expect(VOXY_DOCUMENTARY_VISUAL_BINDING.mouthProfile).toBe(VOXY_MOUTH_V41_PROFILE_VERSION);
    expect(VOXY_DOCUMENTARY_VISUAL_BINDING.mouthShapes).toEqual(VOXY_MOUTH_V41_SHAPES);
    expect(VOXY_DOCUMENTARY_VISUAL_BINDING).toMatchObject({
      mouthShapesChanged: false,
      mouthAnchorChanged: false,
      mouthPivotChanged: false,
      visualMasterMutated: false,
      waveformCount: 1,
      waveformPlacement: "behind_voxy",
      candidateSpecificVisualTuning: false,
    });
  });

  it("keeps all release decisions human and disables production and publishing", () => {
    const renderer = readFileSync(resolve(process.cwd(), "scripts/render-voxy-documentary-voice-bakeoff.ts"), "utf8");
    expect(renderer).toMatch(/humanVisualAcceptance:\s*"accepted"/);
    expect(renderer).toMatch(/humanAudioAcceptance:\s*"pending"/);
    expect(renderer).toMatch(/documentaryVoiceBakeoff:\s*"ready_for_human_review"/);
    expect(renderer).toMatch(/humanWinner:\s*"pending"/);
    expect(renderer).toMatch(/productionEligible:\s*false/);
    expect(renderer).toMatch(/autoPublish:\s*false/);
  });
});
