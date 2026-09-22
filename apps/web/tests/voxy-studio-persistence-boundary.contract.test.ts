import { describe, expect, it } from "vitest";

import { createInMemoryVoxyLocalCompositionAudioInputRepository } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import { createInMemoryVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { createVoxyRegisteredCompositionAudioResolver } from "@/features/voxyVideo/studioRenderHandoff";

const FALLBACK_STATE = {
  mode: "in_memory_fallback",
  productionTruth: false,
  restartReconstructable: false,
  deploymentReconstructable: false,
} as const;

describe("Voxy Studio production persistence boundary", () => {
  it("never labels in-memory draft, audio or composition stores as production truth", () => {
    const draftRepository = createInMemoryVoxyStudioDraftRepository();
    const audioRepository = createInMemoryVoxyLocalCompositionAudioInputRepository();
    const compositionRepository = createInMemoryVoxyLocalCompositionRepository();

    expect(draftRepository.getPersistenceState()).toEqual(FALLBACK_STATE);
    expect(audioRepository.getPersistenceState()).toEqual(FALLBACK_STATE);
    expect(compositionRepository.getPersistenceState()).toEqual(FALLBACK_STATE);
  });

  it("fails closed before resolving audio from an in-memory registry when production persistence is required", async () => {
    const resolver = createVoxyRegisteredCompositionAudioResolver({
      repository: createInMemoryVoxyLocalCompositionAudioInputRepository(),
      trustedAudioRoot: "/tmp/voxy-audio",
    });

    await expect(resolver.resolveAudioAsset("audio-1")).rejects.toThrow(
      "voxy_local_composition_audio_registry_not_persistent",
    );
  });
});
