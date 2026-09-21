# T2C3 Fresh Preflight — Durable Research Usage / Cost Metering

Date: 2026-09-21

```text
TRACK=T2
SLICE=T2C3
BASE_MAIN_SHA=e9d9d649ecb94a0202a1d0f4ec8243e250fb6e08
PARENT_T2C_RESULT=FAIL_SPLIT_REQUIRED
PREFLIGHT_RESULT=PASS_METERING_OWNER_DECISION
T2C3_IMPLEMENTATION_AUTHORIZED=false
ALPHA2_BUDGET_FAIL_CLOSED=true
MODEL_CALL_BUDGET_RUNTIME_ACTIVE=false
COST_BUDGET_RUNTIME_ACTIVE=false
PROVIDER_EXECUTION_AUTHORIZED=false
AUTO_TRUTH=false
AUTO_PUBLISH=false
DECISION_ACTIVATION=false
```

## 1. Result

Fresh-main inspection confirms that Alpha2 already owns the durable execution ledger and budget policy, but does not yet own durable executed-model usage observations.

Current hard blocks in `alpha2DurableOrchestrator.ts` are correct:

- configured `maxModelCalls` => `durable_model_call_metering_not_available`;
- configured `maxEstimatedCostEur` => `durable_cost_metering_not_available`.

T2C3 must close those blocks only after durable, idempotent executed-effect metering exists. This preflight does **not** remove the hard blocks and does not authorize provider execution.

## 2. Fresh-main evidence

### 2.1 Alpha2 remains budget/control-plane owner

`Alpha2RunRecord` already stores:

- run/attempt/idempotency identity;
- durable status/checkpoint/lease semantics;
- `budget.maxModelCalls`;
- `budget.maxEstimatedCostEur`;
- wall-clock and attempt limits.

The canonical run collection remains `alpha2_runs`. T2C3 must not create a second run ledger, retry ledger, checkpoint ledger or entitlement ledger.

### 2.2 Existing AI telemetry is not a budget ledger

`features/ai/telemetry.ts` explicitly uses an in-memory ring buffer with an optional best-effort custom sink. It records useful operational fields such as provider/model/tokens/duration, but it is not durable execution truth and is not suitable for exact replay-safe budget debit.

Result: AI telemetry remains observability only.

### 2.3 Existing cost telemetry is an estimate, not executed debit truth

`apps/web/src/features/ai/aiCostTelemetry.ts` computes an estimated price from provider/model/token counts and an internal price table.

It correctly returns `costKnown=false` when model, token usage or pricing is unknown. However, model-name-based estimation is not by itself a durable provider usage receipt and cannot prove exact budget consumption.

Result: the estimator may enrich a metering observation when its prerequisites are present, but it cannot become the sole budget truth.

### 2.4 Provider adapters expose usage fragments

Provider/runtime code already carries token usage fields (`tokensIn`, `tokensOut`) on multiple result/telemetry paths. These are useful inputs only when attached to an actually executed effect and a stable run/attempt/effect identity.

Planned provider/model configuration must never count as usage.

## 3. Metering owner decision

T2C3 must remain subordinate to the existing Alpha2 runtime. The canonical durable usage owner should be implemented as an Alpha2-owned append/idempotent effect-receipt store, not as a T2-specific research runtime.

Provisional collection name for the later implementation authorization:

```text
alpha2_usage_receipts
```

Semantic owner:

```text
apps/web/src/features/agenticRuntime
```

This collection is not a run ledger. It stores one durable metering receipt per actually executed external/model effect and links it back to the existing `alpha2_runs` truth.

## 4. Required receipt semantics

A later implementation authorization may permit a record equivalent to:

```text
Alpha2UsageReceipt {
  receiptId
  effectId
  runId
  attempt
  providerId?
  modelId?
  startedAt?
  completedAt
  executionState
  tokensIn?
  tokensOut?
  modelCallCount
  providerUsageRef?
  estimatedCostEur?
  costKnown
  pricingSource?
  usageHash
}
```

Hard requirements:

- only an actually attempted/executed effect may create a receipt;
- `effectId` must be deterministic/stable for retry and replay protection;
- one executed effect can debit/count at most once;
- a retry that performs a new physical provider request must use a distinct effect identity and count separately;
- replay of the same persisted effect must not double-count;
- provider/model/token/cost fields must describe real execution, never planned config;
- missing provider usage remains explicit unknown;
- `costKnown=false` must never be converted to `0`.

## 5. Idempotency and indexes

A later implementation should require at least:

```text
unique { receiptId: 1 }
unique { effectId: 1 }
       { runId: 1, attempt: 1 }
       { runId: 1, completedAt: 1 }
```

No TTL index is authorized. Usage receipts are required for replay/audit of budget enforcement.

## 6. Budget evaluation contract

Before the **next** external/model effect, Alpha2 must be able to aggregate durable receipts for the exact run and evaluate:

```text
consumedModelCalls + nextCallWorstCase <= maxModelCalls
knownConsumedCost + nextEffectBound <= maxEstimatedCostEur
```

The exact cost rule must remain fail-closed:

- if no cost ceiling is configured, unknown cost does not invent a debit;
- if a cost ceiling is configured and the next effect cannot be proven to remain within budget because usage/cost is unknown, execution stops in review/human-gate rather than assuming zero;
- exhausting the model-call ceiling blocks the next model effect;
- receipt persistence must occur before the run is allowed to forget an executed effect;
- crash/recovery must reconcile an executed-but-not-yet-accounted effect before another budget-sensitive effect is dispatched.

## 7. Separation from pricing and entitlement truth

T2C3 does not authorize:

- automatic credit purchase/top-up;
- package/entitlement mutation;
- billing-provider integration;
- price inference from model name alone when usage is missing;
- replacement of commercial billing records;
- treating estimated cost as invoice truth.

`estimatedCostEur` is an execution-budget control value only when its derivation is explicit and `costKnown=true`.

## 8. Separation from Research/Dossier/Evidence truth

Usage metering must never imply:

- ResearchPlan completeness;
- requirement satisfaction;
- evidence verification;
- Dossier readiness;
- claim correctness;
- publication or decision readiness.

A completed or budget-compliant run remains semantically separate from Evidence/Dossier truth.

## 9. Collision boundary

T2C3 must not absorb or duplicate:

- `alpha2_runs` run/checkpoint/lease/recovery truth;
- T2C1 ResearchPlan revision persistence;
- T2C2 plan→run binding;
- generic AI telemetry ring-buffer observability;
- provider adapters themselves;
- E150/#629 specialist orchestration;
- product entitlements/billing truth;
- Dossier/Evidence/Source truth.

If a then-current-main check finds an existing durable executed-effect usage receipt owner before implementation, this provisional collection decision must be re-evaluated rather than duplicated.

## 10. Proposed later implementation boundary

After this preflight is merged and separately authorized, the implementation should remain narrowly inside the existing Alpha2 runtime, preferably:

1. `apps/web/src/features/agenticRuntime/alpha2UsageReceiptContract.ts`
2. `apps/web/src/features/agenticRuntime/alpha2MongoUsageLedger.ts`
3. minimal integration in the existing Alpha2 durable orchestrator/runtime service to:
   - persist/reconcile effect usage;
   - aggregate before the next model effect;
   - preserve current fail-closed semantics.
4. focused contract tests.

No new worker, provider router, Research runtime, queue or public API is authorized.

## 11. Required focused tests for later authorization

At minimum:

1. one executed effect creates exactly one receipt;
2. replay of same effect does not double-count;
3. physical retry creates a separate countable effect;
4. failed-before-provider-call effect does not count as model call;
5. provider call with missing usage records `costKnown=false`;
6. unknown cost never becomes zero;
7. configured model-call ceiling blocks the next over-budget call;
8. configured cost ceiling blocks when safe remaining cost cannot be proven;
9. receipts survive run recovery/restart;
10. executed-but-unreconciled effect blocks further budget-sensitive execution until reconciled;
11. aggregation is scoped to exact run identity;
12. no entitlement/billing mutation occurs;
13. no ResearchPlan/Dossier/Evidence state changes;
14. current attempt/wall-clock gates remain intact;
15. existing hard metering-unavailable reasons are removed only for paths where durable receipt enforcement is actually available.

## 12. Next allowed step

```text
NEXT_ALLOWED_STEP=MERGE_T2C3_PREFLIGHT_THEN_FRESH_MAIN_T2C3_IMPLEMENTATION_AUTHORIZATION
T2C3_IMPLEMENTATION_AUTHORIZED=false
T2C1_IMPLEMENTATION_AUTHORIZED=false
T2C2_IMPLEMENTATION_AUTHORIZED=false
T2D_BLOCKED_ON_T2C=true
```

T2C3 may advance independently through governance because it does not modify T2C1/T2C2 owners, but full T2C completion still requires all three child responsibilities to close.
