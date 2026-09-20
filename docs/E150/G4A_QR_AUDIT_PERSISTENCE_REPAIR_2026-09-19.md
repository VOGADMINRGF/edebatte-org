# G4A QR Server Release Core — Audit Persistence Repair

Date: 2026-09-19

```text
TASK=G4A-QR-SERVER-RELEASE-CORE
MODE=PREIMPLEMENTATION_AUTHORIZATION_REPAIR
BASE_MAIN_SHA=5deb70ac86e36e93318617e4e51b424d967f9367
SOURCE_AUTHORIZATION_PR=899
HISTORICAL_EVIDENCE_PR=708
REPAIR_REQUIRED=true
NEW_DB_COLLECTIONS=0
AUTO_PUBLISH=false
```

## Finding

Historical PR #708 writes review/activation evidence to a separate implicit Mongo collection `qr_question_set_guard_audits`.

That historical persistence choice is **not** authorized by the current G4A contract. The merged G4A preflight/authorization explicitly require:

```text
NEW_DB_COLLECTIONS=0
```

Current main contains no canonical `qr_question_set_guard_audits` owner. Therefore the historical collection hunk must not be extracted.

## Repaired persistence contract

G4A keeps `qr_question_sets` as the sole durable QR question-set/release truth.

Review and activation evidence must be stored on the same question-set record, revision-bound and compare-and-swap protected.

Preferred record fields:

```text
version
questionGuardReviewState
activationState
lastQuestionGuardReviewAudit
lastActivationAudit
questionGuardAuditTrail[]
```

Each durable audit entry includes at minimum:

```text
id
action
actorUserId
at
fromVersion
toVersion
questionResults[]
evidenceRefs[] where applicable
explicitHumanAction
noAutoApproval=true
noAutoPublish=true
```

`questionGuardAuditTrail` is bounded; implementation must retain only a finite recent tail (target <= 50 entries) and may not grow without bound.

## Failure ordering

### Human question-guard review

One CAS mutation must atomically:

1. verify current status/version and current question guard binding;
2. persist reviewed question guards;
3. persist the review audit entry;
4. transition to `ready_for_activation` only when every question is currently `draft_allowed`;
5. increment `version`.

There must be no intermediate public/releasable state without its durable audit evidence.

### Activation

One CAS mutation must atomically:

1. verify `ready_for_activation`, current version, current reviewed guard binding and explicit admin confirmation;
2. persist the activation audit entry;
3. transition status/activationState to active;
4. persist actor/timestamp;
5. increment `version`.

If the CAS fails, the set remains non-public. No separate reservation collection or audit collection is introduced.

## Public route contract

Public resolve/read/vote/protocol/summary must require the canonical set record to prove all of:

- `status === active`;
- `activationState === active`;
- current G1 guard binding for every question;
- current question guard `releaseState === draft_allowed`;
- durable activation audit present and bound to the active revision;
- stale/missing audit or guard binding fails closed.

## Authorized implementation delta

The existing 11-file G4A implementation boundary from PR #899 remains unchanged.

This repair only changes the persistence method **inside those already authorized files**:

- do not use or create `qr_question_set_guard_audits`;
- use the existing `qr_question_sets` record and CAS/version semantics;
- no schema migration or new collection;
- no #520-owned Studio/Public Entry files;
- no G4B/G5 scope;
- no auto-publish/auto-approve.

## Result

```text
G4A_IMPLEMENTATION_AUTHORIZED=true
AUDIT_PERSISTENCE=EMBEDDED_REVISION_BOUND_CAS
NEW_DB_COLLECTIONS=0
HISTORICAL_AUDIT_COLLECTION_HUNK=FORBIDDEN
```

G4A is still not complete until the repaired implementation passes exact-head CI, review, drift and post-merge acceptance.