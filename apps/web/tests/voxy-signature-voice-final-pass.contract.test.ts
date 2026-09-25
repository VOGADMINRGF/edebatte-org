import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  VOXY_SIGNATURE_DELIVERY_MODES,
  VOXY_SIGNATURE_FINAL_PASS_BINDING,
  VOXY_SIGNATURE_TEST_SITUATIONS,
  validateVoxySignatureVoiceFinalPassContract,
} from "@/features/voxyVideo/signatureVoiceFinalPass";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const read = (file: string) => readFileSync(path.resolve(repositoryRoot, file), "utf8");

describe("Voxy signature voice final pass contract", () => {
  it("defines D, E and F while preserving the human gate", () => {
    expect(VOXY_SIGNATURE_DELIVERY_MODES.map((mode) => [mode.shortId, mode.id])).toEqual([
      ["D", "candidate-d-editorial"],
      ["E", "candidate-e-signature"],
      ["F", "candidate-f-explainer"],
    ]);
    expect(VOXY_SIGNATURE_FINAL_PASS_BINDING).toMatchObject({
      voiceB: "development_reference_accepted",
      voiceC: "development_reference_accepted",
      voiceD: "human_review",
      voiceE: "primary_canon_candidate",
      voiceF: "human_review",
      humanAudioAcceptance: "pending",
      humanVoiceWinner: "pending",
      productionEligible: false,
      autoPublish: false,
    });
    expect(validateVoxySignatureVoiceFinalPassContract()).toEqual([]);
  });

  it("keeps the three visible review scripts exact", () => {
    expect(VOXY_SIGNATURE_TEST_SITUATIONS.map((situation) => situation.visibleText)).toEqual([
      `Ich bin Voxy.

Ich möchte dir nicht sagen, was du denken sollst.

Ich möchte dir helfen, besser zu verstehen,
worüber wir eigentlich entscheiden.

Du musst mir dabei nichts glauben.

Du sollst es prüfen können.`,
      `Eine Zahl allein erklärt noch keine politische Entscheidung.

Entscheidend ist, woher sie stammt,
in welchem Zusammenhang sie steht
und welche Annahmen dahinterliegen.

Deshalb schauen wir nicht nur auf das Ergebnis.

Wir schauen auch auf die Quellen,
die Argumente und auf das,
was wir noch nicht wissen.`,
      `Vote4Gov stellt Fragen.

VoiceOpenGov bringt Menschen zusammen.

Und eDebatte macht Argumente,
Quellen und unterschiedliche Perspektiven sichtbar.

Voxy verbindet diese Ebenen.

Damit aus einer schnellen Meinung
eine Entscheidung werden kann,
die du selbst nachvollziehen kannst.`,
    ]);
  });

  it("uses a deliberately small local search around B and C", () => {
    expect(VOXY_SIGNATURE_DELIVERY_MODES.every((mode) => mode.variants.length === 2)).toBe(true);
    expect(VOXY_SIGNATURE_DELIVERY_MODES.find((mode) => mode.shortId === "D")?.developmentReference).toContain("B");
    expect(VOXY_SIGNATURE_DELIVERY_MODES.find((mode) => mode.shortId === "E")?.developmentReference).toContain("B sovereignty plus C warmth");
    expect(VOXY_SIGNATURE_DELIVERY_MODES.find((mode) => mode.shortId === "F")?.developmentReference).toContain("C");
  });

  it("keeps spoken-language changes internal and freezes visuals", () => {
    expect(VOXY_SIGNATURE_TEST_SITUATIONS.flatMap((situation) => situation.spokenSegments).some((segment) => segment.spokenText.includes("Woxi"))).toBe(true);
    expect(VOXY_SIGNATURE_FINAL_PASS_BINDING.visual).toMatchObject({
      visualMasterHeadSha: "58548d2a5f6e4a59e84464a5c4aea3875f38662c",
      mouthShapesChanged: false,
      mouthAnchorChanged: false,
      mouthPivotChanged: false,
      visualMasterMutated: false,
      waveformCount: 1,
    });
  });

  it("keeps private paths runtime-only and B/C read-only", () => {
    const renderer = read("apps/web/scripts/render-voxy-signature-voice-final-pass.ts");
    const worker = read("apps/web/scripts/lib/voxyChatterboxSignature.py");
    expect(renderer).not.toContain("/Users/RF/Arbeitsmappe/private-assets");
    expect(renderer).toMatch(/accepted_b_or_c_mutated/);
    expect(renderer).toMatch(/original_reference_mutated/);
    expect(renderer).toMatch(/assertOutsideRepository\(repositoryRoot, outputRoot, "private_output"\)/);
    expect(renderer).toMatch(/linear_loudness_normalization_and_peak_control_only/);
    expect(renderer).toMatch(/humanAudioAcceptance:\s*"pending"/);
    expect(renderer).toMatch(/humanVoiceWinner:\s*"pending"/);
    expect(worker).toMatch(/network_disabled_for_private_voice_synthesis/);
    expect(worker).not.toMatch(/pitch|reverb|exciter|voice.?changer/i);
  });
});
