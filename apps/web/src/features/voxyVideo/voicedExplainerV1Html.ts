import type { VoxyMouthCanonStateId } from "./mouthRig";
import { renderVoxyMotionV4FrameHtml, type VoxyMotionV4EmbeddedAssets } from "./motionV4Html";
import { mapAudioTimeToV41Frame, type VoxyVoicedExplainerV1Plan } from "./voicedExplainerV1";

export type VoxyAudioMouthFrame = Readonly<{
  mouthState: VoxyMouthCanonStateId;
  mouthNextState: VoxyMouthCanonStateId;
  mouthMix: number;
  amplitude: number;
}>;

function quantize(value: number, step = 0.125): number {
  return Math.round(Math.max(0, Math.min(1, value)) / step) * step;
}

export function buildVoxyAudioMouthFrame(amplitude: number): VoxyAudioMouthFrame {
  const level = Math.max(0, Math.min(1, amplitude));
  if (level < 0.035) return { mouthState: "neutral", mouthNextState: "closed", mouthMix: 0, amplitude: level };
  if (level < 0.25) return { mouthState: "closed", mouthNextState: "slightOpen", mouthMix: quantize((level - 0.035) / 0.215), amplitude: level };
  return { mouthState: "slightOpen", mouthNextState: "speakingOpen", mouthMix: quantize((level - 0.25) / 0.75), amplitude: level };
}

export function renderVoxyVoicedExplainerV1FrameHtml(input: {
  plan: VoxyVoicedExplainerV1Plan;
  assets: VoxyMotionV4EmbeddedAssets;
  frameIndex: number;
  amplitude: number;
}): string {
  const atMs = (input.frameIndex * 1_000) / input.plan.output.fps;
  const sourceFrameIndex = mapAudioTimeToV41Frame(input.plan, atMs);
  const mouth = buildVoxyAudioMouthFrame(input.amplitude);
  return renderVoxyMotionV4FrameHtml({
    plan: input.plan.baseMotionPlan.baseMotionPlan,
    assets: input.assets,
    frameIndex: sourceFrameIndex,
    displayFrameIndex: input.frameIndex,
    mouthProfile: "v4.1",
    mouthOverride: {
      mouthState: mouth.mouthState,
      mouthNextState: mouth.mouthNextState,
      mouthMix: mouth.mouthMix,
    },
    waveformAmplitude: mouth.amplitude,
  });
}
