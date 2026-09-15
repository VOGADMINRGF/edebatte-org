import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnlassraumActivationRecord } from "@/features/create/anlassraumActivationWorkflow";

const mocks = vi.hoisted(() => ({
  room: {
    isPublic: true,
    status: "active",
    publishedAt: new Date("2026-07-01T09:00:00.000Z") as Date | null,
    activationWorkflowSourceHandoffId: null as string | null,
    activationWorkflowVersion: null as number | null,
  },
  updateRoom: vi.fn(),
  findRoom: vi.fn(),
}));

vi.mock("@features/anlassraum/db", () => ({
  anlassraumCol: async () => ({
    updateOne: (...args: unknown[]) => mocks.updateRoom(...args),
    findOne: (...args: unknown[]) => mocks.findRoom(...args),
  }),
  outputSeedCol: async () => ({
    updateOne: vi.fn(),
  }),
}));

import { syncAnlassraumRoomVisibility } from "@/features/create/anlassraumActivationWorkflowServer";

function buildProjectionRecord(input: {
  version: number;
  status: "draft" | "activated" | "published";
  releaseState: "review_required" | "draft_allowed";
}): AnlassraumActivationRecord {
  return {
    anlassraumId: "65a111111111111111111110",
    sourceHandoffId: "handoff-visibility-concurrency",
    version: input.version,
    status: input.status,
    title: "Anlassraum Sichere Schulwege",
    description: "Sicherheitsgeprüfter Anlassraum.",
    updatedAt: `2026-07-01T10:${String(input.version).padStart(2, "0")}:00.000Z`,
    questionGuard: {
      releaseState: input.releaseState,
    },
  } as AnlassraumActivationRecord;
}

describe("anlassraum visibility projection concurrency", () => {
  beforeEach(() => {
    mocks.room = {
      isPublic: true,
      status: "active",
      publishedAt: new Date("2026-07-01T09:00:00.000Z"),
      activationWorkflowSourceHandoffId: null,
      activationWorkflowVersion: null,
    };
    mocks.updateRoom.mockReset();
    mocks.findRoom.mockReset();
    mocks.updateRoom.mockImplementation(
      async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
        const sourceHandoffId = String(
          update.$set.activationWorkflowSourceHandoffId,
        );
        const version = Number(update.$set.activationWorkflowVersion);
        const canApply =
          mocks.room.activationWorkflowSourceHandoffId === null ||
          (mocks.room.activationWorkflowSourceHandoffId === sourceHandoffId &&
            (mocks.room.activationWorkflowVersion === null ||
              mocks.room.activationWorkflowVersion <= version));
        if (canApply) {
          mocks.room = {
            ...mocks.room,
            isPublic: Boolean(update.$set.isPublic),
            status: String(update.$set.status),
            publishedAt: (update.$set.publishedAt as Date | null) ?? null,
            activationWorkflowSourceHandoffId: sourceHandoffId,
            activationWorkflowVersion: version,
          };
        }
        return { matchedCount: canApply ? 1 : 0 };
      },
    );
    mocks.findRoom.mockImplementation(async () => mocks.room);
  });

  it("keeps a newer guard reservation authoritative over a stale publish projection", async () => {
    await syncAnlassraumRoomVisibility(
      buildProjectionRecord({
        version: 7,
        status: "draft",
        releaseState: "review_required",
      }),
    );

    expect(mocks.room).toMatchObject({
      isPublic: false,
      status: "review_required",
      publishedAt: null,
      activationWorkflowVersion: 7,
    });
    await expect(
      syncAnlassraumRoomVisibility(
        buildProjectionRecord({
          version: 6,
          status: "published",
          releaseState: "draft_allowed",
        }),
      ),
    ).rejects.toThrow("anlassraum_visibility_state_conflict");
    expect(mocks.room.isPublic).toBe(false);
    expect(mocks.room.activationWorkflowVersion).toBe(7);
  });

  it("retracts visibility when guard review overtakes an already persisted activation", async () => {
    await syncAnlassraumRoomVisibility(
      buildProjectionRecord({
        version: 6,
        status: "published",
        releaseState: "draft_allowed",
      }),
    );
    expect(mocks.room.isPublic).toBe(true);

    await syncAnlassraumRoomVisibility(
      buildProjectionRecord({
        version: 7,
        status: "draft",
        releaseState: "review_required",
      }),
    );
    expect(mocks.room).toMatchObject({
      isPublic: false,
      status: "review_required",
      activationWorkflowVersion: 7,
    });
  });

  it("supports a legacy projection and only republishes from a newer explicit workflow version", async () => {
    await syncAnlassraumRoomVisibility(
      buildProjectionRecord({
        version: 1,
        status: "draft",
        releaseState: "review_required",
      }),
    );
    expect(mocks.room.isPublic).toBe(false);
    expect(mocks.room.activationWorkflowVersion).toBe(1);
    expect(mocks.updateRoom).toHaveBeenLastCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { activationWorkflowSourceHandoffId: null },
        ]),
      }),
      expect.any(Object),
    );

    await syncAnlassraumRoomVisibility(
      buildProjectionRecord({
        version: 4,
        status: "published",
        releaseState: "draft_allowed",
      }),
    );
    expect(mocks.room).toMatchObject({
      isPublic: true,
      status: "active",
      activationWorkflowVersion: 4,
    });
  });
});
