# C4A1 Server Foundation Preflight — Historical Failure and Durable Barrier Decision

```text
BASE_MAIN_SHA=82a66db13904b9acd6414e4da044de55145daa51
TASK=CREATE-GUEST-ADOPTION-PREPARATION-SERVER-FOUNDATION-01
TASK_PREFLIGHT=FAIL_BLOCKED
SECURITY_PREFLIGHT=FAIL_BLOCKED
PERSISTENCE_PREFLIGHT=FAIL_BLOCKED
SESSION_BINDING_PREFLIGHT=PASS
ABUSE_PREFLIGHT=PASS
PRIVACY_PREFLIGHT=PASS
SERVER_ONLY_PREFLIGHT=PASS
ATOMICITY_PREFLIGHT=BLOCKED_BY_STALE_STATE
STALE_STATE_PREFLIGHT=FAIL_BLOCKED
SIZE_PREFLIGHT=PASS_IF_STALE_STATE_BLOCKER_IS_RESOLVED
SPLIT_REQUIRED=false
BLOCKER=DURABLE_FAILED_REPREPARE_REVOCATION
```

The completed preflight confirmed reusable server-only At-Rest encryption with purpose `create.guest-adoption-preparation`, reusable C3C `inspectGuestClaim` safety, reusable C3B mutation security subject to a distinct preparation limiter scope, server-only placement, anonymous-session binding, privacy boundaries, one public API boundary, and two cohesive core contracts. It requires no visible UI, Login navigation, C4B/C4C scope, production secret provisioning, or production activation. The sole failed proof was durable stale-state handling after a legitimate reprepare fails: clearing a browser carrier alone could not prevent manual replay of an older locator.

```text
AT_REST_REUSE=PASS
C3C_INSPECT_GUEST_CLAIM_REUSE=PASS
C3B_REUSE=PASS_WITH_NEW_LIMITER_SCOPE
API_BOUNDARY_COUNT=1
CORE_CONTRACT_COUNT=2
VISIBLE_UI_REQUIRED=false
LOGIN_NAVIGATION_REQUIRED=false
C4B_C4C_INCLUDED=false
CODE_MERGE_WITHOUT_PRODUCTION_SECRET_SAFE=true
PRODUCTION_SECRET_PROVISIONED=false
PRODUCTION_ENABLED=false
AT_REST_REGRESSIONS=PASS;13/13
C3A_REGRESSIONS=PASS;11/11
C3B_REGRESSIONS=PASS;46/46
C3C_REGRESSIONS=PASS;47/47
C3D_REGRESSIONS=PASS;13/13
GOVERNANCE_TESTS=PASS;4/4
OPENTASKS_CONTROL_PLANE_TESTS=PASS;126/126
```

Open PRs `#682`, `#724`, and `#727` were separately identified because they touch `createRouteSecurity.ts`. They are historical/reference-only, not executable fresh-main C4A1 owners: `#682` must not be merged as a C4A1 source; `#724` is superseded by the canonical C3A/C3B extraction and must not be merged into current main; `#727` has no C4A1 ownership and requires its own future collision audit. No hunks are copied from them.

## Approved re-preflight input: DURABLE_REPREPARE_REVOCATION_BARRIER_V1

This decision does not turn the historical `FAIL_BLOCKED` into `PASS` and does not authorize implementation. It approves the following model solely as mandatory input to a fresh C4A1 `preflight_only` check.

The one authoritative preparation slot per `anonymousSessionBindingHash` is a discriminated durable Mongo document:

```ts
type PreparingGuestAdoptionPreparation = {
  version: 1;
  preparationId: string;
  anonymousSessionBindingHash: string;
  state: "preparing";
  createdAt: Date;
  expiresAt: Date;
};

type PreparedGuestAdoptionPreparation = {
  version: 1;
  preparationId: string;
  anonymousSessionBindingHash: string;
  state: "prepared";
  encryptedPayload: AtRestEnvelope;
  createdAt: Date;
  expiresAt: Date;
};
```

There is no raw claim, claim fingerprint, operation ID, user/account ID, raw session ID, IP, return URL, or analytics blob. `encryptedPayload` is absent while `state="preparing"`.

A fresh UUID preparation ID and atomic upsert/replacement of the binding slot becomes authoritative only after Same-Origin, Fetch Metadata, CSRF, Content-Type, persistent limiter, verified C3A session, bounded JSON, exact request schema, string claim, and normalization/structural validation all pass. The barrier persists `state="preparing"`, server timestamps and effective expiry, and unsets prior encrypted payload before C3C safety inspection or At-Rest encryption. A successful barrier invalidates every previous locator for that binding, including across restart.

If the barrier write fails, `NEW_INTENT_DURABLY_ACCEPTED=false`: return only `CREATE_PREPARATION_UNAVAILABLE`, do not claim revocation or success, and retain the distinction that the old preparation may still be authoritative. Once a barrier commits, safety or encryption failure leaves the new slot `preparing` without payload, clears any applicable carrier, and keeps the prior locator permanently invalid. Finalization is compare-and-set on binding hash, that attempt’s preparation ID, and `state="preparing"`; it alone sets `state="prepared"` and the At-Rest envelope. A superseded request affects zero documents and fails closed.

The read primitive may decrypt only a `prepared` document whose locator, verified-session binding hash, and logical `expiresAt > now` all match. `preparing`, stale locator, binding mismatch, expiry, and decrypt failure are non-consumable. Both states retain `min(15 minutes, remaining verified anonymous-session lifetime)`, an `expiresAt` TTL index with `expireAfterSeconds=0`, and server-side logical expiry as the authorization boundary.

The opaque host-only `edebatte_create_adoption_preparation` `HttpOnly`, `SameSite=Lax`, production-`Secure`, `Path=/` carrier contains only a preparation ID. It is set only after CAS finalization to `prepared`, never while preparing. After a committed barrier, failure clears the carrier. Barrier-write failure does not freeze a carrier decision: the fresh preflight must resolve it truthfully against future C4B replay semantics.

```text
PREVIOUS_PREFLIGHT_RESULT=FAIL_BLOCKED
PREVIOUS_BLOCKER=DURABLE_FAILED_REPREPARE_REVOCATION
APPROVED_REPREFLIGHT_INPUT=DURABLE_REPREPARE_REVOCATION_BARRIER_V1
CURRENT_PREFLIGHT_RESULT=NOT_YET_RERUN
FRESH_PREFLIGHT_REQUIRED=true
IMPLEMENTATION_AUTHORIZED=false
DONE=false
```
