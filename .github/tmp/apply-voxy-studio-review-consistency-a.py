from pathlib import Path

store = Path("apps/web/src/features/voxyVideo/studioDraftStore.ts")
service = Path("apps/web/src/features/voxyVideo/studioDraftService.ts")
tests = Path("apps/web/tests/voxy-studio-draft-service.contract.test.ts")


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    store,
    '''  replaceDraftIfRevision(input: {
    draftId: string;
    expectedRevision: number;
    next: VoxyStudioDraft;
  }): Promise<boolean>;''',
    '''  replaceDraftIfRevision(input: {
    draftId: string;
    expectedRevision: number;
    expectedStatus: VoxyStudioDraft["status"];
    next: VoxyStudioDraft;
  }): Promise<boolean>;''',
    "repository_contract",
)
replace_once(
    store,
    '''        { _id: input.draftId, revision: input.expectedRevision },''',
    '''        {
          _id: input.draftId,
          revision: input.expectedRevision,
          status: input.expectedStatus,
        },''',
    "mongo_cas_predicate",
)
replace_once(
    store,
    '''      if (!current || current.revision !== input.expectedRevision) return false;''',
    '''      if (
        !current ||
        current.revision !== input.expectedRevision ||
        current.status !== input.expectedStatus
      ) {
        return false;
      }''',
    "memory_cas_predicate",
)
replace_once(
    service,
    '''    draftId: input.current.draftId,
    expectedRevision: input.current.revision,
    next: input.next,''',
    '''    draftId: input.current.draftId,
    expectedRevision: input.current.revision,
    expectedStatus: input.current.status,
    next: input.next,''',
    "service_expected_status",
)

helper = r'''
type DraftReplacementInput = Parameters<
  VoxyStudioDraftRepository["replaceDraftIfRevision"]
>[0];

function controlDraftReplacements(base: VoxyStudioDraftRepository) {
  const pending: Array<{
    input: DraftReplacementInput;
    resolve: (value: boolean) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  let waiter: (() => void) | null = null;

  const repository: VoxyStudioDraftRepository = {
    ...base,
    async replaceDraftIfRevision(input) {
      return new Promise<boolean>((resolve, reject) => {
        pending.push({ input, resolve, reject });
        const releaseWaiter = waiter;
        waiter = null;
        releaseWaiter?.();
      });
    },
  };

  async function waitForPending(count: number) {
    while (pending.length < count) {
      await new Promise<void>((resolve) => {
        waiter = resolve;
      });
    }
  }

  async function commitStatus(status: VoxyStudioDraft["status"]) {
    const index = pending.findIndex((entry) => entry.input.next.status === status);
    if (index < 0) throw new Error(`missing_pending_replacement:${status}`);
    const [entry] = pending.splice(index, 1);
    try {
      const result = await base.replaceDraftIfRevision(entry.input);
      entry.resolve(result);
      return result;
    } catch (error) {
      entry.reject(error);
      throw error;
    }
  }

  return { repository, waitForPending, commitStatus };
}
'''
replace_once(
    tests,
    '\n\ndescribe("Voxy Studio Draft Service", () => {',
    helper + '\n\ndescribe("Voxy Studio Draft Service", () => {',
    "controlled_replace_helper",
)

race_tests = r'''  it("fails closed when concurrent changes win before render approval on the same revision", async () => {
    const { runtime, draft } = await createAndSubmit();
    const controlled = controlDraftReplacements(runtime.repository);
    runtime.repository = controlled.repository;
    markEditorialReady(runtime, draft);

    const changesPromise = requestVoxyStudioDraftChanges(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        requestedByUserId: "admin-3",
        note: "Concurrent change request wins.",
      },
      runtime,
    );
    const approvalPromise = approveVoxyStudioDraftForRender(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        approvedByUserId: "admin-2",
      },
      runtime,
    );
    const outcomesPromise = Promise.allSettled([changesPromise, approvalPromise]);

    await controlled.waitForPending(2);
    expect(await controlled.commitStatus("needs_changes")).toBe(true);
    expect(await controlled.commitStatus("approved_for_render")).toBe(false);

    const [changesOutcome, approvalOutcome] = await outcomesPromise;
    expect(changesOutcome.status).toBe("fulfilled");
    expect(approvalOutcome.status).toBe("rejected");
    if (approvalOutcome.status === "rejected") {
      expect(approvalOutcome.reason).toMatchObject({
        message: "voxy_studio_revision_conflict",
      });
    }
    expect((await runtime.repository.getDraft(draft.draftId))?.status).toBe(
      "needs_changes",
    );
    const auditActions = (await runtime.repository.listAuditEvents(draft.draftId)).map(
      (event) => event.action,
    );
    expect(auditActions).toContain("review_changes_requested");
    expect(auditActions).not.toContain("approved_for_render");
  });

  it("fails closed when concurrent render approval wins before changes on the same revision", async () => {
    const { runtime, draft } = await createAndSubmit();
    const controlled = controlDraftReplacements(runtime.repository);
    runtime.repository = controlled.repository;
    markEditorialReady(runtime, draft);

    const changesPromise = requestVoxyStudioDraftChanges(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        requestedByUserId: "admin-3",
        note: "Concurrent change request loses.",
      },
      runtime,
    );
    const approvalPromise = approveVoxyStudioDraftForRender(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        approvedByUserId: "admin-2",
      },
      runtime,
    );
    const outcomesPromise = Promise.allSettled([changesPromise, approvalPromise]);

    await controlled.waitForPending(2);
    expect(await controlled.commitStatus("approved_for_render")).toBe(true);
    expect(await controlled.commitStatus("needs_changes")).toBe(false);

    const [changesOutcome, approvalOutcome] = await outcomesPromise;
    expect(changesOutcome.status).toBe("rejected");
    if (changesOutcome.status === "rejected") {
      expect(changesOutcome.reason).toMatchObject({
        message: "voxy_studio_revision_conflict",
      });
    }
    expect(approvalOutcome.status).toBe("fulfilled");
    expect((await runtime.repository.getDraft(draft.draftId))?.status).toBe(
      "approved_for_render",
    );
    const auditActions = (await runtime.repository.listAuditEvents(draft.draftId)).map(
      (event) => event.action,
    );
    expect(auditActions).toContain("approved_for_render");
    expect(auditActions).not.toContain("review_changes_requested");
  });

'''
replace_once(
    tests,
    '  it("requests changes explicitly and requires a new submission afterwards", async () => {',
    race_tests
    + '  it("requests changes explicitly and requires a new submission afterwards", async () => {',
    "race_regressions",
)
