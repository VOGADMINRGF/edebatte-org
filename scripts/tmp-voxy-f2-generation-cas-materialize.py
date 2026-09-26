from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    s = p.read_text()
    actual = s.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), got {actual}: {old[:100]!r}")
    p.write_text(s.replace(old, new, count))


store = "apps/web/src/features/voxyVideo/localCompositionRuntimeStore.ts"
replace(
    store,
    '''  transitionJob(input: {
    jobId: string;
    expectedStatus: VoxyLocalCompositionStatus;
    next: VoxyLocalCompositionJob;
  }): Promise<boolean>;''',
    '''  transitionJob(input: {
    jobId: string;
    expectedStatus: VoxyLocalCompositionStatus;
    expectedAttempt: number;
    next: VoxyLocalCompositionJob;
  }): Promise<boolean>;''',
)
replace(
    store,
    '''function createMongoRepository(): VoxyLocalCompositionRepository {''',
    '''export function buildVoxyLocalCompositionTransitionCasFilter(input: {
  jobId: string;
  expectedStatus: VoxyLocalCompositionStatus;
  expectedAttempt: number;
}) {
  return {
    _id: input.jobId,
    "record.status": input.expectedStatus,
    "record.attempt": input.expectedAttempt,
  };
}

function createMongoRepository(): VoxyLocalCompositionRepository {''',
)
replace(
    store,
    '''        { _id: input.jobId, "record.status": input.expectedStatus },''',
    '''        buildVoxyLocalCompositionTransitionCasFilter(input),''',
)
replace(
    store,
    '''      if (!current || current.status !== input.expectedStatus) return false;''',
    '''      if (
        !current ||
        current.status !== input.expectedStatus ||
        current.attempt !== input.expectedAttempt
      ) return false;''',
)

service = "apps/web/src/features/voxyVideo/localCompositionRuntimeService.ts"
for old, new in [
    (
        '''    expectedStatus: "queued",
    next: rendering,''',
        '''    expectedStatus: "queued",
    expectedAttempt: current.attempt,
    next: rendering,''',
    ),
    (
        '''      expectedStatus: "rendering",
      next: rendered,''',
        '''      expectedStatus: "rendering",
      expectedAttempt: rendering.attempt,
      next: rendered,''',
    ),
    (
        '''      expectedStatus: "rendered",
      next: reviewReady,''',
        '''      expectedStatus: "rendered",
      expectedAttempt: rendered.attempt,
      next: reviewReady,''',
    ),
    (
        '''        expectedStatus: "rendered",
        next: failed,''',
        '''        expectedStatus: "rendered",
        expectedAttempt: current.attempt,
        next: failed,''',
    ),
    (
        '''      expectedStatus: "rendered",
      next: queued,''',
        '''      expectedStatus: "rendered",
      expectedAttempt: current.attempt,
      next: queued,''',
    ),
    (
        '''    expectedStatus: "rendering",
    next: queued,''',
        '''    expectedStatus: "rendering",
    expectedAttempt: current.attempt,
    next: queued,''',
    ),
    (
        '''    expectedStatus: "failed",
    next,''',
        '''    expectedStatus: "failed",
    expectedAttempt: current.attempt,
    next,''',
    ),
]:
    replace(service, old, new)
replace(
    service,
    '''    if (latest.status === "rendering") {
      const failed: VoxyLocalCompositionJob = {
        ...latest,''',
    '''    if (latest.status === "rendering" && latest.attempt === rendering.attempt) {
      const failed: VoxyLocalCompositionJob = {
        ...rendering,''',
)
replace(
    service,
    '''        expectedStatus: "rendering",
        next: failed,
      });
      return failed;''',
    '''        expectedStatus: "rendering",
        expectedAttempt: rendering.attempt,
        next: failed,
      });
      return (await deps.repository.getJob(rendering.jobId)) ?? failed;''',
)

worker = "apps/web/scripts/run-voxy-local-composition-worker.ts"
replace(
    worker,
    '''    expectedStatus: "queued",
    next: failed,''',
    '''    expectedStatus: "queued",
    expectedAttempt: input.job.attempt,
    next: failed,''',
)

test = "apps/web/tests/voxy-local-composition-recovery.contract.test.ts"
p = Path(test)
s = p.read_text()
old_import = 'import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";'
new_import = '''import {
  buildVoxyLocalCompositionTransitionCasFilter,
  createInMemoryVoxyLocalCompositionRepository,
} from "@/features/voxyVideo/localCompositionRuntimeStore";'''
if s.count(old_import) != 1:
    raise SystemExit("recovery test store import anchor mismatch")
s = s.replace(old_import, new_import, 1)
s = s.replace(
    '''      expectedStatus: "queued",
      next: rendering,''',
    '''      expectedStatus: "queued",
      expectedAttempt: queued.job.attempt,
      next: rendering,''',
)
s = s.replace(
    '''        expectedStatus: "rendering",
        next: rendered,''',
    '''        expectedStatus: "rendering",
        expectedAttempt: rendering.attempt,
        next: rendered,''',
)
anchor = 'describe("VOXY-LOCAL-COMPOSITION-RECOVERY-01", () => {\n'
if s.count(anchor) != 1:
    raise SystemExit("recovery test describe anchor mismatch")
additions = '''describe("VOXY-LOCAL-COMPOSITION-RECOVERY-01", () => {
  it("binds the Mongo transition selector to status and execution attempt", () => {
    expect(
      buildVoxyLocalCompositionTransitionCasFilter({
        jobId: "job-1",
        expectedStatus: "rendering",
        expectedAttempt: 7,
      }),
    ).toEqual({
      _id: "job-1",
      "record.status": "rendering",
      "record.attempt": 7,
    });
  });

  it("rejects stale recovery and stale completion after a newer attempt is acquired", async () => {
    const state = runtime();
    const staleRendering = await queueAndMarkRendering({
      request: localRequest(),
      deps: state.deps,
    });

    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: staleRendering.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
    });
    expect(recovered.status).toBe("queued");
    expect(recovered.attempt).toBe(staleRendering.attempt + 1);

    const newerRendering: VoxyLocalCompositionJob = {
      ...recovered,
      status: "rendering",
      startedAt: RECOVERY_AT,
      updatedAt: RECOVERY_AT,
    };
    expect(
      await state.repository.transitionJob({
        jobId: recovered.jobId,
        expectedStatus: "queued",
        expectedAttempt: recovered.attempt,
        next: newerRendering,
      }),
    ).toBe(true);

    const staleRecoveryQueued: VoxyLocalCompositionJob = {
      ...staleRendering,
      status: "queued",
      attempt: staleRendering.attempt + 1,
      startedAt: null,
      updatedAt: RECOVERY_AT,
    };
    expect(
      await state.repository.transitionJob({
        jobId: staleRendering.jobId,
        expectedStatus: "rendering",
        expectedAttempt: staleRendering.attempt,
        next: staleRecoveryQueued,
      }),
    ).toBe(false);

    const staleRendered: VoxyLocalCompositionJob = {
      ...staleRendering,
      status: "rendered",
      completedAt: RECOVERY_AT,
      updatedAt: RECOVERY_AT,
    };
    expect(
      await state.repository.transitionJob({
        jobId: staleRendering.jobId,
        expectedStatus: "rendering",
        expectedAttempt: staleRendering.attempt,
        next: staleRendered,
      }),
    ).toBe(false);

    const staleFailed: VoxyLocalCompositionJob = {
      ...staleRendering,
      status: "failed",
      completedAt: RECOVERY_AT,
      updatedAt: RECOVERY_AT,
      safeErrorCode: "stale_worker",
      safeErrorMessage: "stale worker must not fence a newer attempt",
    };
    expect(
      await state.repository.transitionJob({
        jobId: staleRendering.jobId,
        expectedStatus: "rendering",
        expectedAttempt: staleRendering.attempt,
        next: staleFailed,
      }),
    ).toBe(false);

    const current = await state.repository.getJob(staleRendering.jobId);
    expect(current?.status).toBe("rendering");
    expect(current?.attempt).toBe(newerRendering.attempt);
  });
'''
s = s.replace(anchor, additions, 1)
p.write_text(s)

# All direct transition calls in the bounded runtime/service/worker/recovery-test scope must carry attempt fencing.
for path in [service, worker, test]:
    text = Path(path).read_text()
    cursor = 0
    while True:
        idx = text.find("transitionJob({", cursor)
        if idx < 0:
            break
        end = text.find("});", idx)
        if end < 0:
            raise SystemExit(f"{path}: unterminated transitionJob call")
        call = text[idx:end]
        if "expectedStatus:" in call and "expectedAttempt:" not in call:
            raise SystemExit(f"{path}: transitionJob call missing expectedAttempt near {idx}")
        cursor = end + 3
