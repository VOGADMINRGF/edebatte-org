import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  buildCreateIntelligentFollowup: vi.fn(),
  ensureCreateSupportTicket: vi.fn(),
  getSessionUser: vi.fn(),
  enforceCreateMutationSecurity: vi.fn(),
  verifyCreateDraftBinding: vi.fn(),
}));

vi.mock("@/features/create/intelligentFollowup", () => ({
  buildCreateIntelligentFollowup: (...args: unknown[]) =>
    mocks.buildCreateIntelligentFollowup(...args),
}));
vi.mock("@/features/support/createSupportTickets", () => ({
  ensureCreateSupportTicket: (...args: unknown[]) =>
    mocks.ensureCreateSupportTicket(...args),
}));
vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));
vi.mock("@/features/create/createRouteSecurity", () => ({
  enforceCreateMutationSecurity: (...args: unknown[]) =>
    mocks.enforceCreateMutationSecurity(...args),
  verifyCreateDraftBinding: (...args: unknown[]) =>
    mocks.verifyCreateDraftBinding(...args),
}));

import { POST } from "@/app/api/create/intelligent-followup/route";
import {
  CREATE_PROGRESS_EVENT_CAP,
  adoptCompletedCreateOrchestrationClaim,
  createInMemoryCreateOrchestrationClaimRepo,
  createOrchestrationClaimKeyForTests,
  readCompletedCreateOrchestrationClaim,
  runCreateOrchestrationSingleFlight,
  setCreateOrchestrationClaimRepoForTests,
} from "@/features/create/createOrchestrationSingleFlight";
import { buildCreateInitialProgressEvents } from "@/features/create/createProgressEventContract";

const OPERATION_TYPE = "create_intelligent_followup_planner" as const;

function request(input: {
  draftId?: string;
  correlationId?: string;
  text?: string;
}) {
  return new NextRequest("http://localhost/api/create/intelligent-followup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
    },
    body: JSON.stringify({
      text: input.text ?? "Mehr sichere Schulwege.",
      locale: "de",
      correlationId: input.correlationId ?? "correlation-single-flight",
      draftId: input.draftId ?? "draft-single-flight",
    }),
  });
}

function successfulFollowup() {
  return {
    understanding: {
      summary: "Mehr sichere Schulwege.",
      categories: [],
      topics: [],
      statements: [],
      scopes: ["district"],
      openQuestion: null,
      confidence: "medium",
    },
    suggestions: [],
    sourceText: "Mehr sichere Schulwege.",
    generatedAt: "2026-07-30T10:00:00.000Z",
    degraded: false,
    degradedReason: null,
  };
}

describe("persistent create orchestration single-flight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCreateOrchestrationClaimRepoForTests(
      createInMemoryCreateOrchestrationClaimRepo(),
    );
    mocks.getSessionUser.mockResolvedValue({
      _id: { toString: () => "single-flight-user" },
      sessionValid: true,
    });
    mocks.enforceCreateMutationSecurity.mockResolvedValue(null);
    mocks.verifyCreateDraftBinding.mockImplementation(
      async (input: { draftId: string; userId: string }) => ({
        draftId: input.draftId,
        userId: input.userId,
        payloadHash: `payload-${input.draftId}`,
        inputHash: `input-${input.draftId}`,
      }),
    );
    mocks.ensureCreateSupportTicket.mockResolvedValue({
      ticketNumber: "EDB-20260730-SINGLE01",
      status: "open",
      safeUserMessage: "Dein Beitrag ist gespeichert.",
      viewHref: "/account?ticket=EDB-20260730-SINGLE01#support-tickets",
      notificationLinked: true,
    });
  });

  it("shares one provider run and one completed result across parallel route requests", async () => {
    let releaseProvider!: () => void;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    mocks.buildCreateIntelligentFollowup.mockImplementation(async () => {
      await providerGate;
      return successfulFollowup();
    });

    const first = POST(request({}));
    await vi.waitFor(() => {
      expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(1);
    });
    const second = POST(request({}));
    releaseProvider();

    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    const [firstBody, secondBody] = await Promise.all([
      firstResponse.json(),
      secondResponse.json(),
    ]);

    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(1);
    expect(mocks.ensureCreateSupportTicket).not.toHaveBeenCalled();
    expect(firstBody.result).toEqual(secondBody.result);
    expect([firstBody.trace.singleFlight, secondBody.trace.singleFlight].sort()).toEqual([
      "owner",
      "reused",
    ]);
  });

  it("persists one support handoff when the shared provider run fails", async () => {
    let releaseProvider!: () => void;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    mocks.buildCreateIntelligentFollowup.mockImplementation(async () => {
      await providerGate;
      throw new Error("raw provider failure");
    });

    const first = POST(request({ correlationId: "correlation-shared-failure" }));
    await vi.waitFor(() => {
      expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(1);
    });
    const second = POST(request({ correlationId: "correlation-shared-failure" }));
    releaseProvider();

    const bodies = await Promise.all([
      first.then((response) => response.json()),
      second.then((response) => response.json()),
    ]);

    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(1);
    expect(mocks.ensureCreateSupportTicket).toHaveBeenCalledTimes(1);
    expect(bodies[0].supportHandoff).toEqual(bodies[1].supportHandoff);
    expect(JSON.stringify(bodies)).not.toContain("raw provider failure");
  });

  it("keeps different draft and correlation scopes independent", async () => {
    mocks.buildCreateIntelligentFollowup.mockResolvedValue(successfulFollowup());

    await Promise.all([
      POST(
        request({
          draftId: "draft-independent-a",
          correlationId: "correlation-independent-a",
        }),
      ),
      POST(
        request({
          draftId: "draft-independent-b",
          correlationId: "correlation-independent-b",
        }),
      ),
    ]);

    expect(mocks.buildCreateIntelligentFollowup).toHaveBeenCalledTimes(2);
  });

  it("recovers an expired externally-started claim without a second external call", async () => {
    const repo = createInMemoryCreateOrchestrationClaimRepo();
    setCreateOrchestrationClaimRepoForTests(repo);
    const keyInput = {
      actorKey: "user:create-single-flight-stale",
      draftId: "draft-stale",
      correlationId: "correlation-stale",
      operationType: OPERATION_TYPE,
    };
    const key = createOrchestrationClaimKeyForTests(keyInput);
    let releaseOwner!: () => void;
    const ownerGate = new Promise<void>((resolve) => {
      releaseOwner = resolve;
    });
    let externalCalls = 0;

    const owner = runCreateOrchestrationSingleFlight({
      ...keyInput,
      inputHash: "input-hash-stale",
      leaseMs: 1_000,
      waitMs: 2_000,
      run: async ({ markExternalExecutionStarted }) => {
        await markExternalExecutionStarted();
        externalCalls += 1;
        await ownerGate;
        return { state: "owner" };
      },
    });
    await vi.waitFor(() => {
      expect(repo.snapshotForTests<{ state: string }>(key)).toMatchObject({
        externalExecutionStarted: true,
      });
    });
    repo.expireClaimForTests(key);

    const recovered = await runCreateOrchestrationSingleFlight({
      ...keyInput,
      inputHash: "input-hash-stale",
      leaseMs: 1_000,
      waitMs: 2_000,
      run: async ({ recoveryWithoutExternalCall }) => {
        expect(recoveryWithoutExternalCall).toBe(true);
        return { state: "recovered_without_external_call" };
      },
    });
    releaseOwner();
    const ownerResult = await owner;

    expect(externalCalls).toBe(1);
    expect(recovered).toMatchObject({
      result: { state: "recovered_without_external_call" },
      recovered: true,
    });
    expect(ownerResult.result).toEqual(recovered.result);
  });

  it("retries a failed claim only when no external execution was marked", async () => {
    const keyInput = {
      actorKey: "user:single-flight-retry",
      draftId: "draft-failed-before-provider",
      correlationId: "correlation-failed-before-provider",
      operationType: OPERATION_TYPE,
      inputHash: "input-hash-failed-before-provider",
      waitMs: 2_000,
    };
    await expect(
      runCreateOrchestrationSingleFlight({
        ...keyInput,
        run: async () => {
          throw new Error("failed_before_external_execution");
        },
      }),
    ).rejects.toThrow("failed_before_external_execution");

    const retry = await runCreateOrchestrationSingleFlight({
      ...keyInput,
      run: async ({ recoveryWithoutExternalCall }) => {
        expect(recoveryWithoutExternalCall).toBe(false);
        return { state: "retried_safely" };
      },
    });

    expect(retry).toMatchObject({
      result: { state: "retried_safely" },
      recovered: true,
    });
  });

  it("refuses to reuse a key for different request content", async () => {
    const keyInput = {
      actorKey: "user:single-flight-input",
      draftId: "draft-input-mismatch",
      correlationId: "correlation-input-mismatch",
      operationType: OPERATION_TYPE,
      waitMs: 2_000,
    };
    await runCreateOrchestrationSingleFlight({
      ...keyInput,
      inputHash: "input-hash-a",
      run: async () => ({ state: "first" }),
    });

    await expect(
      runCreateOrchestrationSingleFlight({
        ...keyInput,
        inputHash: "input-hash-b",
        run: async () => ({ state: "must_not_run" }),
      }),
    ).rejects.toThrow("create_single_flight_input_mismatch");
  });

  it("persists and replays idempotent progress to a concurrent reconnect", async () => {
    const event = buildCreateInitialProgressEvents({
      text: "Mehr sichere Schulwege.",
      operationId: "correlation-progress-replay",
      correlationId: "correlation-progress-replay",
      locale: "de",
      createdAt: "2026-09-06T09:00:00.000Z",
    }).events[0];
    const keyInput = {
      actorKey: "user:progress-replay",
      draftId: "draft-progress-replay",
      correlationId: "correlation-progress-replay",
      operationType: OPERATION_TYPE,
      inputHash: "input-progress-replay",
      waitMs: 2_000,
    };
    let releaseOwner!: () => void;
    const ownerGate = new Promise<void>((resolve) => {
      releaseOwner = resolve;
    });
    const ownerEvents: string[] = [];
    const reconnectEvents: string[] = [];

    const owner = runCreateOrchestrationSingleFlight({
      ...keyInput,
      onProgress: (progress) => ownerEvents.push(progress.eventId),
      run: async ({ publishProgressEvent }) => {
        await publishProgressEvent(event);
        await publishProgressEvent(event);
        await ownerGate;
        return { state: "completed" };
      },
    });
    await vi.waitFor(() => expect(ownerEvents).toEqual([event.eventId]));

    const reconnect = runCreateOrchestrationSingleFlight({
      ...keyInput,
      resumeOnly: true,
      onProgress: (progress) => reconnectEvents.push(progress.eventId),
      run: async () => ({ state: "must_not_run" }),
    });
    await vi.waitFor(() => expect(reconnectEvents).toEqual([event.eventId]));
    releaseOwner();

    await expect(owner).resolves.toMatchObject({ result: { state: "completed" } });
    await expect(reconnect).resolves.toMatchObject({
      result: { state: "completed" },
      reused: true,
    });
  });

  it("fails resume-only closed when no durable operation exists", async () => {
    await expect(
      runCreateOrchestrationSingleFlight({
        actorKey: "user:missing-progress",
        draftId: "draft-missing-progress",
        correlationId: "correlation-missing-progress",
        operationType: OPERATION_TYPE,
        inputHash: "input-missing-progress",
        resumeOnly: true,
        run: async () => ({ state: "must_not_run" }),
      }),
    ).rejects.toThrow("create_single_flight_resume_unavailable");
  });

  it("fails resume-only closed when Mongo TTL cleanup has not removed an expired claim yet", async () => {
    const repo = createInMemoryCreateOrchestrationClaimRepo();
    setCreateOrchestrationClaimRepoForTests(repo);
    const keyInput = {
      actorKey: "user:expired-progress",
      draftId: "draft-expired-progress",
      correlationId: "correlation-expired-progress",
      operationType: OPERATION_TYPE,
      inputHash: "input-expired-progress",
    };
    await runCreateOrchestrationSingleFlight({
      ...keyInput,
      run: async () => ({ state: "completed" }),
    });
    repo.expireResultForTests(createOrchestrationClaimKeyForTests(keyInput));

    await expect(
      runCreateOrchestrationSingleFlight({
        ...keyInput,
        resumeOnly: true,
        run: async () => ({ state: "must_not_run" }),
      }),
    ).rejects.toThrow("create_single_flight_resume_unavailable");
  });

  it("caps durable progress and keeps observer failures away from the planner result", async () => {
    const repo = createInMemoryCreateOrchestrationClaimRepo();
    setCreateOrchestrationClaimRepoForTests(repo);
    const baseEvent = buildCreateInitialProgressEvents({
      text: "Mehr sichere Schulwege.",
      operationId: "correlation-progress-cap",
      correlationId: "correlation-progress-cap",
      locale: "de",
      createdAt: "2026-09-06T09:00:00.000Z",
    }).events[0];
    const keyInput = {
      actorKey: "user:progress-cap",
      draftId: "draft-progress-cap",
      correlationId: "correlation-progress-cap",
      operationType: OPERATION_TYPE,
      inputHash: "input-progress-cap",
    };

    const result = await runCreateOrchestrationSingleFlight({
      ...keyInput,
      onProgress: () => {
        throw new Error("disconnected observer");
      },
      run: async ({ publishProgressEvent }) => {
        await publishProgressEvent({
          ...baseEvent,
          operationId: "foreign-operation-progress-cap",
          correlationId: "foreign-correlation-progress-cap",
          eventId: `${baseEvent.eventId}:foreign`,
        });
        for (let index = 0; index < CREATE_PROGRESS_EVENT_CAP + 8; index += 1) {
          await publishProgressEvent({
            ...baseEvent,
            eventId: `${baseEvent.eventId}:${index}`,
          });
        }
        return { state: "completed" };
      },
    });
    const claimKey = createOrchestrationClaimKeyForTests(keyInput);
    const snapshot = repo.snapshotForTests<{ state: string }>(claimKey);

    expect(result.result).toEqual({ state: "completed" });
    expect(snapshot?.status).toBe("completed");
    expect(snapshot?.progressEvents).toHaveLength(CREATE_PROGRESS_EVENT_CAP);
  });

  it("does not corrupt the planner result when optional progress persistence fails", async () => {
    const repo = createInMemoryCreateOrchestrationClaimRepo();
    repo.appendProgress = vi.fn().mockRejectedValue(new Error("progress store unavailable"));
    setCreateOrchestrationClaimRepoForTests(repo);
    const event = buildCreateInitialProgressEvents({
      text: "Mehr sichere Schulwege.",
      operationId: "correlation-progress-write-failure",
      correlationId: "correlation-progress-write-failure",
      locale: "de",
      createdAt: "2026-09-06T09:00:00.000Z",
    }).events[0];

    const result = await runCreateOrchestrationSingleFlight({
      actorKey: "user:progress-write-failure",
      draftId: "draft-progress-write-failure",
      correlationId: "correlation-progress-write-failure",
      operationType: OPERATION_TYPE,
      inputHash: "input-progress-write-failure",
      run: async ({ publishProgressEvent }) => {
        await publishProgressEvent(event);
        return { state: "completed" };
      },
    });

    expect(result.result).toEqual({ state: "completed" });
  });

  it("atomically adopts a completed anonymous claim once and only for its bound session", async () => {
    const keyInput = {
      actorKey: "anonymous:guest-session-a",
      draftId: "anonymous:guest-session-a",
      correlationId: "guest-operation-12345678",
      operationType: OPERATION_TYPE,
    };
    const result = successfulFollowup();
    await runCreateOrchestrationSingleFlight({
      ...keyInput,
      inputHash: "guest-input-hash",
      run: async () => result,
    });

    await expect(readCompletedCreateOrchestrationClaim(keyInput)).resolves.toMatchObject({
      inputHash: "guest-input-hash",
      result,
    });
    await expect(
      adoptCompletedCreateOrchestrationClaim({
        ...keyInput,
        consumerKey: "user:account-a",
      }),
    ).resolves.toEqual({ kind: "adopted", result });
    await expect(
      adoptCompletedCreateOrchestrationClaim({
        ...keyInput,
        consumerKey: "user:account-a",
      }),
    ).resolves.toEqual({ kind: "reused", result });
    await expect(
      adoptCompletedCreateOrchestrationClaim({
        ...keyInput,
        consumerKey: "user:account-b",
      }),
    ).resolves.toEqual({ kind: "conflict" });
    await expect(
      readCompletedCreateOrchestrationClaim({
        ...keyInput,
        actorKey: "anonymous:guest-session-b",
        draftId: "anonymous:guest-session-b",
      }),
    ).resolves.toBeNull();
  });
});
