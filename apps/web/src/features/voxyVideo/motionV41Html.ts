import type { VoxyMotionV41Plan } from "./motionV41";
import {
  buildVoxyMotionV4FrameState,
  renderVoxyMotionV4FrameHtml,
  type VoxyMotionV4EmbeddedAssets,
  type VoxyMotionV4Format,
} from "./motionV4Html";

export type VoxyMotionV41EmbeddedAssets = VoxyMotionV4EmbeddedAssets;
export type VoxyMotionV41Format = VoxyMotionV4Format;

export function buildVoxyMotionV41FrameState(input: {
  plan: VoxyMotionV41Plan;
  frameIndex: number;
}) {
  return buildVoxyMotionV4FrameState({
    plan: input.plan.baseMotionPlan,
    frameIndex: input.frameIndex,
  });
}

export function renderVoxyMotionV41FrameHtml(input: {
  plan: VoxyMotionV41Plan;
  assets: VoxyMotionV41EmbeddedAssets;
  frameIndex: number;
  format?: VoxyMotionV41Format;
}): string {
  return renderVoxyMotionV4FrameHtml({
    plan: input.plan.baseMotionPlan,
    assets: input.assets,
    frameIndex: input.frameIndex,
    format: input.format,
    mouthProfile: "v4.1",
  });
}
