# C4B Preflight — Authenticated Guest Adoption / Draft Resume

`BASE_MAIN_SHA=a70ee7c904a803c41078005994287de6d9698baa`  
`TASK=CREATE-AUTHENTICATED-GUEST-ADOPTION-DRAFT-RESUME-01`  
`MODE=PREFLIGHT_ONLY`  
`PREFLIGHT_RESULT=FAIL_SPLIT_REQUIRED`

## Scope and fixed exclusions

C4B is restricted to an authenticated account session plus a verified C3A anonymous session, resolving the current C4A1 prepared slot server-side, and producing/resuming one canonical account draft. It owns no guest intent, login or return UX, browser carrier, Planner, `createHandoff`, C5–C12, publish, provider, secret, deploy, or production activation. `NO_PREPARATION_BROWSER_CARRIER_V1` remains binding: no preparation identity or preparation-derived adoption/resume token may be returned to or persisted by the browser.

## Current authoritative primitives

- Authenticated session: `getSessionUser(req)` in `apps/web/src/lib/server/auth/sessionUser.ts`. It verifies the signed account cookie, requires a valid ObjectId user, reloads the user record, rejects suspended/disabled/revoked sessions, and returns `null` otherwise.
- Anonymous session: `verifyAnonymousSession(req.cookies.get(CREATE_ANON_SESSION_COOKIE)?.value)` in `apps/web/src/features/create/createAnonymousSession.ts`. It HMAC-verifies the server-signed C3A cookie, UUID, bounds, and logical expiry; malformed, missing, expired, or unconfigured sessions return `null`.
- C4A1 read: `readGuestAdoptionPreparationForVerifiedAnonymousSession({ session })` in `apps/web/src/features/create/createGuestAdoptionPreparation.ts`. It derives `anonymousSessionBindingHash` only server-side, reads the single `prepared` non-expired slot, decrypts with purpose `create.guest-adoption-preparation`, validates the claim, and otherwise returns `null`.
- Canonical draft: `saveUserScopedServerDraft(...)` in `apps/web/src/server/serverDrafts.ts`, using `drafts`, `CANONICAL_CREATE_DRAFT_KIND`, deterministic ObjectId for an idempotency key, duplicate-key recovery, and a payload-hash conflict check. The authenticated user ID is the canonical draft owner; no `contribution_drafts` write is permitted.

Thus one request can independently prove both server-side cookies. Failure of either proof, absence/expiry/decrypt failure of the prepared slot, or storage uncertainty must return a minimized non-enumerating response; it must not reveal account, preparation, receipt, or draft identity.

## Atomicity audit and result

`core/db/triMongo.ts` caches `MongoClient` internally but exports collection/Db helpers only. It does not expose a supported transaction/session primitive. The repository contains opportunistic `const client = (db as any)?.client` transaction attempts in unrelated admin routes, but no core transaction contract, replica-set/topology guarantee, or production evidence for a C4B multi-document transaction. Therefore transaction atomicity cannot be claimed.

The only lawful candidate is a durable, crash-recoverable state machine, but the current C4A1 API cannot support its required atomic claim. C4A1 owns one mutable slot per anonymous binding and reprepare replaces that document with a new `preparationId`. Its public read primitive exposes a decrypted `{ preparationId, claim }` snapshot only; it has no compare-and-claim operation conditioned on the current preparation identity and no shared receipt transition.

An independent receipt unique on the old `preparationId` is insufficient. Between C4B's read and its receipt claim, C4A1 can commit its durable reprepare barrier. C4B could then create a draft from stale authority after supersession. Conversely, changing the C4A1 document with downstream adoption states/metadata would expand C4A1's closed `preparing -> prepared` ownership and risks violating `DURABLE_REPREPARE_REVOCATION_BARRIER_V1`.

`ATOMICITY_MODEL=UNSUPPORTED_WITH_CURRENT_CONTRACTS`  
`MONGO_TRANSACTION_SUPPORTED=NOT_PROVEN_OR_EXPOSED`  
`DURABLE_STATE_MACHINE_REQUIRED=true`  
`REPREPARE_RACE_SAFE=false`

This is a split requirement, not a best-effort implementation authorization.

## Required split before a future C4B implementation preflight

A separately governed prerequisite must establish one of the following, with production topology evidence and contracts:

1. a supported core-Mongo transaction primitive and replica-set compatibility that atomically compares the live C4A1 slot, durably binds the authenticated account, creates/resolves the canonical draft, and finalizes the receipt; or
2. a dedicated cross-owner atomic consumption contract, jointly owned at the C4A1/C4B boundary, that conditionally claims the exact live `preparationId`, prevents reprepare supersession from validating a stale claim, and provides durable recovery without adding adoption lifecycle ownership to C4A1 silently.

That prerequisite must explicitly preserve the C4A1 binding hash, expiry/decrypt behavior, collection and purpose; it must not introduce browser locators. Only after it is decided and implemented can a fresh C4B preflight define a receipt and safe consumer path.

## Proposed future receipt minimum (not authorized)

If the prerequisite exists, a distinct immutable receipt/claim record may contain only: schema version, server-generated adoption ID, preparation ID and preparation binding hash, stable hashed authenticated-account binding, canonical draft ID once known, state, `createdAt`, `completedAt`, expiry/recovery timestamps, and a payload/version hash. The `drafts` document retains the actual `userId` required for canonical ownership. The receipt must not contain raw claim, cookie/session/adoption token, IP, fingerprint, authorization header, or a raw account identifier where the binding hash suffices.

The canonical draft mapping would be: authenticated `userId`; approved decrypted claim in `text`, `textOriginal`, and `textPrepared` as justified by the future contract; `status=draft`; kind `create_contribution`; an explicit C4B source; and existing `reviewFirstOnly`, `noAutoPublish`, and `noSilentMerge` runtime metadata. It must call `saveUserScopedServerDraft`, with an idempotency key scoped to the durable receipt/adoption identity. No Planner, topic/dossier creation, publication, or C5 logic is included.

## Required crash/retry matrix for the split contract

| Point | Required authoritative state | Same-account retry | Different account | Duplicate-draft risk | Cleanup |
| --- | --- | --- | --- | --- | --- |
| before durable claim | current C4A1 slot only | may attempt current slot | no information | NONE | normal slot expiry |
| account bound, before draft | immutable pending receipt conditionally tied to live slot | resumes same receipt | fail closed | NONE | durable recovery worker/next request |
| during draft save | receipt plus deterministic draft identity | resolve same draft | fail closed | NONE | retry duplicate-key recovery |
| draft exists, receipt incomplete | canonical draft plus pending receipt | finalize same receipt | fail closed | NONE | idempotent finalization |
| receipt finalized, before cleanup | completed receipt and draft | return same draft ID | fail closed | NONE | payload cleanup is compensating only |
| same-account replay | completed receipt | return `{ ok: true, draftId }` | n/a | NONE | retain receipt per retention policy |
| different-account replay | receipt account binding mismatch | n/a | minimized rejection/not-found | NONE | no mutation |
| C4A1 reprepare concurrent | atomic live-slot comparison required | stale operation must fail/re-read | fail closed | NONE | new C4A1 slot remains sole live slot |

Mongo TTL can remove expired material but is never an authorization decision. Pending receipts require logical expiry and explicit recovery; completed receipts require a documented retention period. Successful payload cleanup must follow, not substitute for, durable authorization/finalization.

## Future route boundary (not authorized)

At most one Node route is needed after the split: `POST /api/create/adoption-resume` with an empty JSON object body (no preparation identity). It must call `getSessionUser`, verify the C3A cookie, then reuse `enforceCreateMutationSecurity` only with a dedicated `create_authenticated_adoption_resume` scope and documented account/IP/anonymous-session limits. Same-origin, Fetch Metadata, CSRF, honeypot, content-type and bounded-body checks remain mandatory. Safe responses are success `{ ok: true, draftId }`, or generic 400/403/409/429/503 results that do not enumerate ownership or preparation state.

## Contract and candidate file plan after the prerequisite

No C4B implementation is authorized. `IMPLEMENTATION_FILES_PLANNED=0`, `RUNTIME_FILES_PLANNED=0`, and `TEST_FILES_PLANNED=0` for this failed preflight. A future separately authorized implementation is expected to need two core contracts at most: (1) atomic authenticated adoption/one-time consumption, and (2) immutable receipt-to-canonical-draft binding. It should use one API boundary at most. The exact runtime/test file list cannot be safely frozen until the required cross-owner atomicity contract is decided; doing so now would manufacture an implementation path.

Reusable regression evidence to extend—not copy blindly—includes `create-anonymous-session`, `session-user.security`, `create-route-security.contract`, `create-guest-adoption-preparation.contract`, `at-rest-encryption.contract`, `server-drafts.idempotency.contract`, and the repaired `create-mode.save.route` parallel-retry harness.

## Conclusion

`CROSS_ACCOUNT_FAIL_CLOSED=REQUIRED_BUT_NOT_CURRENTLY_PROVABLE`  
`SAME_ACCOUNT_REPLAY_IDEMPOTENT=REQUIRED_BUT_NOT_CURRENTLY_PROVABLE`  
`CRASH_RECOVERY_SAFE=REQUIRED_BUT_NOT_CURRENTLY_PROVABLE`  
`DUPLICATE_DRAFT_RISK=UNACCEPTABLE_UNTIL_SPLIT_CONTRACT_EXISTS`

No implementation, migration, test, runtime, provider/secret/deploy/production activation, C4C UX, or browser carrier is authorized by this preflight.
