# C4B0 Preflight — Atomic Guest Adoption Consumption Contract

`BASE_MAIN_SHA=43071e598a67a62f4284624367d05b40e9d7ba1d`  
`TASK=CREATE-GUEST-ADOPTION-ATOMIC-CONSUMPTION-CONTRACT-01`  
`PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION`  
`MODE=PREFLIGHT_ONLY`

## Decision

The C4B blocker can be resolved without a Mongo multi-document transaction or receipt collection by extending the sole authoritative C4A1 binding slot with a jointly-owned, server-only adoption sub-contract: `SINGLE_DOCUMENT_BINDING_ONLY_ADOPTION_CAS_V1`.

The existing `create_guest_adoption_preparations` document is already unique on `anonymousSessionBindingHash`, and `findOneAndUpdate` can linearize a claim against both other claims and reprepare. This is not a second ownership truth: C4A1 retains the top-level `preparing | prepared` lifecycle, preparation binding, encryption purpose, payload validation and durable reprepare barrier; C4B0 owns only the adoption sub-contract nested in that same slot.

`SINGLE_DOCUMENT_CAS_SUFFICIENT=true`  
`MONGO_TRANSACTION_REQUIRED=false`  
`RECEIPT_COLLECTION_REQUIRED=false`

## Server-only adoption sub-contract

On a `prepared` slot only, the minimal shape is:

```ts
adoption?: {
  version: 1;
  state: "claimed" | "completed";
  adoptionId: string; // server-generated UUID; never a browser carrier
  accountBindingHash: string; // domain-separated SHA-256 of canonical userId
  claimedAt: Date;
  recoveryExpiresAt: Date;
  completedAt?: Date;
  draftId?: string;
}
```

The hash domain is `edebatte:create:adoption:account:v1` followed by a NUL separator and the canonical authenticated `userId`. It needs no new secret: the purpose is data minimization and domain separation, not a credential. The actual `userId` remains only in `drafts`, where canonical ownership requires it. No raw claim, cookie/session token, IP, fingerprint, account ID, receipt ID, or browser-provided locator is stored in the coordination record.

## Binding-only claim and replay

The future server-internal claim primitive receives a verified C3A session and canonical authenticated user ID. It derives both hashes server-side and generates `adoptionId` server-side. Its first operation is one conditional `findOneAndUpdate`:

```text
anonymousSessionBindingHash = derived binding
AND state = prepared
AND expiresAt > now
AND adoption is absent
```

It sets the `claimed` sub-contract atomically and sets document TTL `expiresAt` to `recoveryExpiresAt`. The selected recovery model is `SESSION_BOUNDED_ACCOUNT_CLAIM_RECOVERY_V1`: `recoveryExpiresAt = min(claimNow + 15 minutes, verifiedAnonymousSession.expiresAtMs)`. Thus `CLAIM_RECOVERY_WINDOW_MAX=15_MINUTES`, `CLAIM_RECOVERY_CAPPED_BY_C3A_EXPIRY=true`, and `POST_C3A_EXPIRY_RECOVERY=false`. The original preparation expiry remains represented by the claim-time eligibility condition; after a claim, recovery remains both authenticated-account-bound and verified-anonymous-session-bound.

If the CAS does not claim, a binding-only lookup may return a record only after verifying the C3A session and comparing the derived account hash. Same-account `claimed` returns the same internal adoption identity to the server caller; same-account `completed` returns its draft ID metadata while that C3A session remains valid; a different account receives the same minimized fail-closed result as an absent/unavailable slot. It never receives payload or foreign draft metadata. Account authentication alone never locates or decrypts a claimed payload.

Future C4B draft idempotency is derived server-side from the claimed `adoptionId` plus the authenticated canonical user in `buildCanonicalCreateDraftIdempotencyKey`/`saveUserScopedServerDraft`. Therefore one adoption and account has one deterministic canonical draft; another account cannot access or collide with it.

## Pre-adoption anonymous reader hardening

`readGuestAdoptionPreparationForVerifiedAnonymousSession(...)` is a **pre-adoption reader only**. Before C4B0, its verified anonymous session, `state="prepared"`, logical-expiry, decrypt, and claim-validation checks return `{ preparationId, claim }`. C4B0 implementation must add `adoption` absent to that read filter. Therefore it is consumable only when `state="prepared"`, `adoption` is absent, and `expiresAt > now`.

For either `adoption.state="claimed"` or `adoption.state="completed"`, the anonymous-only reader must return `null` fail-closed. It must neither decrypt nor return payload after any durable adoption claim, even if the caller still holds a valid C3A cookie. This closes the forbidden path from an account-bound claimed slot through a legacy anonymous-only decrypt.

After `adoption` exists, decrypted payload may be returned only by the new C4B0 account-bound server primitive after it proves: a verified C3A session, canonical authenticated account, derived `accountBindingHash` equal to the durable claim, `adoption.state="claimed"`, and `recoveryExpiresAt > now`. A different account receives neither payload nor adoption/draft metadata. The old anonymous-only reader is not an authorized post-claim path.

For `completed`, `encryptedPayload` has already been removed; the anonymous-only reader returns `null`; the same-account account-bound replay may return only canonical draft metadata; and a different account remains fail-closed.

## Reprepare serialization

`commitBarrier` must no longer replace every matching binding slot unconditionally. Its binding-slot update filter must permit replacement only when the slot has no adoption, is `completed`, or has a logically expired `adoption.recoveryExpiresAt`; it must reject an active `claimed` adoption. When replacing an expired claim, the new preparing barrier must unset the full prior `adoption` and `encryptedPayload` before it establishes its new attempt. Its duplicate-key retry remains limited to the existing binding-slot unique-upsert race and must classify an unmatched active claim as fail-closed/unavailable, never as a retryable overwrite.

| Ordering | Required result |
| --- | --- |
| Reprepare barrier wins before claim | Existing slot becomes `preparing`; claim CAS cannot match it. A later C4B attempt can claim only the newly finalized current slot. |
| Claim CAS wins before reprepare | Slot has active account-bound `claimed` adoption; reprepare barrier has no match and must not overwrite it. |
| Concurrent race | Mongo single-document serialization selects one ordering above. Neither old payload authority nor new payload ownership is inherited. |
| Reprepare after completed adoption | A new intentional prepare may replace the completed slot. The former draft remains in canonical `drafts`; C4B0 replay through the slot thereafter addresses only the new slot and cannot re-adopt old payload. |

This retains `DURABLE_REPREPARE_REVOCATION_BARRIER_V1`: a new permitted barrier remains the only way to supersede an unclaimed/completed slot, while an active account-bound claim is a deliberate durable exclusion rather than a stale authority leak. `NO_PREPARATION_BROWSER_CARRIER_V1` remains unchanged.

## Crash, expiry, completion, and cleanup

| Event | Authoritative state and behavior |
| --- | --- |
| Crash after claim | Durable `claimed` account hash/adoption ID persists; only the same authenticated account can resume before `recoveryExpiresAt`. |
| Crash after decrypt / before draft | Same-account retry reuses the claim; payload is not exposed to another account. |
| Draft saved / crash before completion | Deterministic draft idempotency resolves the same draft; binding-only completion CAS records it. |
| Completion race or replay | CAS on binding, `prepared`, adoption ID, account hash, `claimed`; same draft is idempotent, different draft is fail-closed. |
| Different-account claim/completion/replay | Hash mismatch yields generic fail-closed response without payload, IDs, or state disclosure. |
| Logical recovery expiry | Claim is no longer readable, decryptable, or recoverable; reprepare may create a fresh slot and removes the old adoption metadata and encrypted payload. TTL is cleanup only, not authorization. |

Pre-claim authority is a verified C3A session plus the current prepared slot with adoption absent. Post-claim authority is a verified C3A session, canonical authenticated account, matching `accountBindingHash`, `adoption.state="claimed"`, and `recoveryExpiresAt > now`. Authorization is always logical checks; TTL is storage cleanup only.

If C3A expires in five seconds and a claim succeeds now, `recoveryExpiresAt` is that C3A expiry—not `now + 15 minutes`. A crash retry immediately before expiry may resume for the same account. After expiry `verifyAnonymousSession` fails: neither account can decrypt, recover, or learn adoption/draft metadata; the payload is logically unusable; and reprepare may safely establish a fresh slot. This is bounded availability loss, not a security reopening. After the browser has received a canonical `draftId`, ordinary authenticated draft resume uses the canonical draft contract rather than C4B0; the C4B0 endpoint makes no post-C3A-expiry replay promise.

Decrypt occurs only after the same account has an active claim. Completion records the canonical draft ID then atomically unsets `encryptedPayload`; completed replay returns only the same-account draft metadata. On draft-save failure, payload remains until recovery expiry for the bound account. No process-local lock, timing assumption, or browser state is part of the design.

## Boundaries and future implementation plan

`CORE_CONTRACT_COUNT=1` — Atomic C4A1/C4B0 slot adoption lifecycle: claim, same-account replay, cross-account exclusion, reprepare serialization, recovery, and idempotent completion.  
`API_BOUNDARY_COUNT=0` — C4B0 exposes server-internal primitives only; it owns no HTTP route.  
`RUNTIME_FILES_PLANNED=1`, `TEST_FILES_PLANNED=1`, `IMPLEMENTATION_FILES_PLANNED=2`:

| File | Change | Kind | Owner / reason |
| --- | --- | --- | --- |
| `apps/web/src/features/create/createGuestAdoptionPreparation.ts` | MODIFY | runtime | C4A1/C4B0 joint slot contract: conditional reprepare barrier; harden anonymous-only read so any adoption returns `null`; account-bound claimed/completed read/replay helpers; recovery and payload cleanup. |
| `apps/web/tests/create-guest-adoption-preparation.contract.test.ts` | MODIFY | test | Deterministic CAS/race/crash/account-switch/replay/expiry/cleanup coverage, including pre-adoption anonymous success, claimed/completed anonymous failure, same-account claimed read, cross-account decrypt denial, metadata-only completion replay, and stale-finalize coverage. |

No `serverDrafts` change, migration, receipt collection, route, UI, browser carrier, provider/secret/deploy/production activation, C4B implementation, C4C UX, Planner, publication, or C5–C12 work is in C4B0.

Required deterministic tests include A/A and A/B concurrent claim barriers; reprepare-before-claim and claim-before-reprepare; restart-equivalent retry; same/different-account completion; conflicting draft completion; completion/replay cleanup; post-completion intentional reprepare; no carrier; and existing stale C4A1 finalize protection. In addition: (16) the legacy anonymous-only reader succeeds before a claim, (17) returns `null` after `claimed`, (18) returns `null` after `completed`, (19) the same-account account-bound helper may decrypt active claimed payload, (20) a different account cannot decrypt it, and (21) completed replay exposes same-account draft metadata only and never claim text. Cases (22)–(28) prove recovery expiry is `min(now + 15m, C3A expiry)`, never extends authority past C3A, works immediately before expiry and fails for both accounts after expiry without metadata, and allows a fresh reprepare to remove expired adoption metadata and payload. These race tests use explicit `nowMs` and deterministic barriers, never arbitrary sleeps.

## Authorization boundary

This PASS authorizes neither runtime implementation nor C4B. It consumes only the C4B0 preflight authorization. C4B remains blocked until C4B0 is separately implemented and `done`, then C4B requires a new fresh preflight. C4C remains blocked; C5–C12 remain unauthorized.
