import { describe, expect, it } from "vitest";
import {
  getStreamPublicStatusMeta,
  resolveStreamPublicRuntimeStatus,
} from "@features/stream/statusContract";

describe("stream status contract", () => {
  it("maps pre-live sessions with open input to Fragen möglich", () => {
    const status = resolveStreamPublicRuntimeStatus({
      session: {
        status: "scheduled",
        isLive: false,
        endedAt: null,
        startsAt: new Date("2026-05-25T18:00:00.000Z"),
        updatedAt: new Date("2026-05-25T10:00:00.000Z"),
      },
      hasPublicInputPath: true,
      pendingInputCount: 0,
      hasFollowUpUpdates: false,
      hasDossierUpdateSuggestion: false,
    });

    expect(status).toBe("open_for_questions");
    expect(getStreamPublicStatusMeta(status).label).toBe("Fragen möglich");
  });

  it("keeps a running event live even when participation is open", () => {
    const status = resolveStreamPublicRuntimeStatus({
      session: {
        status: "live",
        isLive: true,
        endedAt: null,
        startsAt: new Date("2026-05-25T18:00:00.000Z"),
        updatedAt: new Date("2026-05-25T18:10:00.000Z"),
      },
      hasPublicInputPath: true,
      pendingInputCount: 4,
      hasFollowUpUpdates: false,
      hasDossierUpdateSuggestion: false,
    });

    expect(status).toBe("live");
    expect(getStreamPublicStatusMeta(status).label).toBe("Event läuft");
    expect(getStreamPublicStatusMeta(status).nextAction).not.toContain("Livestream");
  });

  it("maps ended sessions with dossier follow-up to dossier_update_suggested", () => {
    const status = resolveStreamPublicRuntimeStatus({
      session: {
        status: "ended",
        isLive: false,
        endedAt: new Date("2026-05-25T20:00:00.000Z"),
        startsAt: new Date("2026-05-25T18:00:00.000Z"),
        updatedAt: new Date("2026-05-25T20:30:00.000Z"),
      },
      hasPublicInputPath: true,
      pendingInputCount: 2,
      hasFollowUpUpdates: true,
      hasDossierUpdateSuggestion: true,
    });

    expect(status).toBe("dossier_update_suggested");
    expect(getStreamPublicStatusMeta(status).label).toBe("Dossier-Update vorgeschlagen");
  });

  it("keeps cancelled sessions out of public participation", () => {
    const status = resolveStreamPublicRuntimeStatus({
      session: {
        status: "cancelled",
        isLive: false,
        endedAt: null,
        startsAt: new Date("2026-05-25T18:00:00.000Z"),
        updatedAt: new Date("2026-05-25T17:00:00.000Z"),
      },
      hasPublicInputPath: true,
      pendingInputCount: 0,
      hasFollowUpUpdates: false,
      hasDossierUpdateSuggestion: false,
    });

    expect(status).toBe("cancelled");
    expect(getStreamPublicStatusMeta(status).nextAction).toContain("Anlassraum");
  });
});
