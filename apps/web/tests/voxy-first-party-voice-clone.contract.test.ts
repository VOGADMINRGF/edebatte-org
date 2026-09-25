import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  VOXY_CHATTERBOX_ENGINE,
  VOXY_CHATTERBOX_MODEL,
  VOXY_CHATTERBOX_RUNTIME_LICENSES,
  VOXY_FIRST_PARTY_IDENTITY,
  VOXY_FIRST_PARTY_PARAMETER_MATRIX,
  VOXY_FIRST_PARTY_PRIVACY,
  VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES,
  VOXY_FIRST_PARTY_REFERENCE_WINDOWS,
  VOXY_FIRST_PARTY_VARIANTS,
  VOXY_FIRST_PARTY_VISIBLE_SCRIPT,
  VOXY_FIRST_PARTY_VISUAL_BINDING,
  validateVoxyFirstPartyVoiceCloneContract,
} from "@/features/voxyVideo/firstPartyVoiceClone";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const read = (file: string) => readFileSync(path.resolve(repositoryRoot, file), "utf8");

describe("Voxy first-party voice clone contract", () => {
  it("binds explicit first-party consent without third-party speaker rights", () => {
    expect(VOXY_FIRST_PARTY_IDENTITY).toEqual({
      voiceOwner: "Ricky Gerd Fleischer",
      voiceConsent: "explicit",
      voiceReferenceSource: "first_party_recording",
      thirdPartySpeakerRights: "none",
    });
    expect(validateVoxyFirstPartyVoiceCloneContract()).toEqual([]);
  });

  it("fails closed for raw voice and public synthesized identity audio", () => {
    expect(VOXY_FIRST_PARTY_PRIVACY).toEqual({
      rawVoiceCommittedToGit: false,
      rawVoiceUploadedToPublicArtifact: false,
      rawVoiceIncludedInPR: false,
      rawVoiceIncludedInProductionBundle: false,
      referencePathsInPublicEvidence: false,
      referenceSegmentsInWorktree: false,
      synthesizedIdentityAudioPublicByDefault: false,
    });
    const workflow = read(".github/workflows/voxy-first-party-voice-clone-evidence.yml");
    expect(workflow).not.toMatch(/private-assets|voice-clone-private|ricky-voxy-reference/i);
    expect(workflow).toContain("artifacts/voxy-first-party-voice-clone-public");
    expect(workflow).toMatch(/retention-days:\s*14/);
  });

  it("keeps the exact visible German script identical for A, B and C", () => {
    expect(VOXY_FIRST_PARTY_VISIBLE_SCRIPT).toBe(`Ich bin Voxy.

Manchmal wirken politische Entscheidungen einfacher, als sie tatsächlich sind.
Und manchmal passiert genau das Gegenteil.

Ein Thema wird so kompliziert erklärt, dass am Ende kaum noch jemand weiß,
worum es eigentlich geht.

Genau da möchte ich helfen.

Vote4Gov stellt Fragen.

VoiceOpenGov bringt Menschen zusammen.

Und eDebatte hilft dabei, Argumente, Quellen und unterschiedliche Positionen
nachvollziehbar zu machen.

Ich möchte dir nicht sagen, was du denken sollst.

Ich möchte dir helfen, besser zu verstehen, worüber wir eigentlich entscheiden.

Du musst mir dabei nichts glauben.

Du sollst es prüfen können.`);
    expect(VOXY_FIRST_PARTY_VARIANTS.map((variant) => variant.id)).toEqual(["candidate-a", "candidate-b", "candidate-c"]);
    expect(VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES).toEqual({ Voxy: "Woxi", Vote4Gov: "Wout-for-Goff", VoiceOpenGov: "Woiss-Open-Goff", eDebatte: "eh Debatte" });
  });

  it("pins engine, V3 model, weights, parameter provenance and both recordings", () => {
    expect(VOXY_CHATTERBOX_ENGINE).toMatchObject({ version: "0.1.7", sourceRevision: "5de7a54aa4e5e2baadb0182dde554908b48b85c2", engineLicense: "MIT", offlineAfterProvisioning: true, runtimeNetworkRequests: 0 });
    expect(VOXY_CHATTERBOX_MODEL).toMatchObject({ revision: "5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18", model: "Chatterbox-Multilingual V3", modelLicense: "MIT" });
    expect(VOXY_CHATTERBOX_MODEL.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256))).toBe(true);
    expect(new Set(VOXY_FIRST_PARTY_REFERENCE_WINDOWS.map((window) => window.reference))).toEqual(new Set([1, 2]));
    expect(VOXY_FIRST_PARTY_PARAMETER_MATRIX).toHaveLength(4);
    expect(VOXY_CHATTERBOX_RUNTIME_LICENSES.every((dependency) => dependency.license !== "UNKNOWN")).toBe(true);
    const provisioner = read("apps/web/scripts/provision-voxy-first-party-voice-clone.ts");
    expect(provisioner).toContain(`"--no-deps", "--force-reinstall"`);
    expect(provisioner).toMatch(/runtime_license_unknown/);
    expect(provisioner).toMatch(/model_integrity_failed/);
  });

  it("freezes the accepted visual, Mouth v4.1 and one waveform", () => {
    expect(VOXY_FIRST_PARTY_VISUAL_BINDING).toMatchObject({
      visualMasterHeadSha: "58548d2a5f6e4a59e84464a5c4aea3875f38662c",
      mouthShapesChanged: false,
      mouthAnchorChanged: false,
      mouthPivotChanged: false,
      visualMasterMutated: false,
      waveformCount: 1,
      waveformPlacement: "behind_voxy",
    });
    const previewRenderer = read("apps/web/scripts/render-voxy-first-party-voice-clone-previews.ts");
    expect(previewRenderer).toMatch(/mouthProfile:\s*"v4\.1"/);
    expect(previewRenderer).toMatch(/waveformAmplitude:/);
    expect(previewRenderer).toMatch(/visualMasterMutated:\s*false/);
    expect(previewRenderer).toMatch(/preview\.mp4/);
  });

  it("keeps private reference paths runtime-only and prevents automatic release", () => {
    const renderer = read("apps/web/scripts/render-voxy-first-party-voice-clone.ts");
    expect(renderer).not.toContain("/Users/RF/Arbeitsmappe/private-assets");
    expect(renderer).toMatch(/reference_workspace_must_be_outside_git_worktree|reference_workspace/);
    expect(renderer).toMatch(/rawVoiceCommitted:\s*false/);
    expect(renderer).toMatch(/humanAudioAcceptance:\s*"pending"/);
    expect(renderer).toMatch(/humanVoiceWinner:\s*"pending"/);
    expect(renderer).toMatch(/productionEligible:\s*false/);
    expect(renderer).toMatch(/autoPublish:\s*false/);
  });
});
