# C8 Authenticated Source / Link Analysis — Implementation Authorization

Date: 2026-09-18

```text
TASK=CREATE-AUTHENTICATED-SOURCE-LINK-ANALYSIS-01
ROLE=C8
MODE=IMPLEMENTATION_AUTHORIZATION
BASE=main@e9f81364df8635e5fe31b4cdca3986f19db6d5d3
SOURCE_PREFLIGHT_PR=887
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=true
C9_C12_AUTHORIZED=false
SPLIT_REQUIRED=false
```

## Authorization

This authorization consumes the merged fresh C8 preflight in
`docs/E150/CREATE_AUTHENTICATED_SOURCE_LINK_ANALYSIS_C8_FRESH_PREFLIGHT_2026-09-18.md`.

It authorizes exactly one bounded C8 runtime implementation and focused-test slice.

## Authorized runtime boundary

1. `.github/workflows/web-ci.yml`
   - add only focused C8 tests to the existing Focused Create runtime suite.

2. `apps/web/src/app/api/create/link-analysis/route.ts`
   - keep existing auth, draft binding and Create mutation-security gates;
   - route external intake through the bounded C8 adapters;
   - reuse Create single-flight;
   - persist canonical draft source evidence before durable success.

3. `apps/web/src/features/create/createOrchestrationSingleFlight.ts`
   - add only the C8 operation kind required by this slice.

4. `apps/web/src/features/create/externalSourceAnalysis.ts` — new
   - bounded provider-analysis contract extracted from historical #627;
   - no provider-policy redesign.

5. `apps/web/src/features/create/externalSourceIntake.ts` — new
   - bounded HTML/PDF/YouTube intake and resource limits.

6. `apps/web/src/features/create/safety/createGuestClaimSafety.ts`
   - minimal reusable export of the existing sensitive/signed Source-URL policy;
   - no weakening of C3C.

7. `apps/web/src/lib/net/safeExternalFetch.ts` — new
   - Node-built-in SSRF/DNS-pin/manual-redirect/stream-size/timeout boundary;
   - no new dependency.

8. `apps/web/src/server/serverDrafts.ts`
   - one narrow idempotent authenticated-draft source-evidence upsert;
   - no new collection and no second draft writer.

9. `features/ai/sources/youtube.ts`
   - safe transcript metadata/failure classification only.

## Authorized focused tests

Only focused C8 tests may be added/extended, bounded to:

- `apps/web/tests/safe-external-fetch.security.test.ts`
- `apps/web/tests/create-external-source-intake.security.test.ts`
- `apps/web/tests/create-external-source-pdf-timeout.contract.test.ts`
- `apps/web/tests/create-external-source-analysis.contract.test.ts`
- `apps/web/tests/youtube-source.contract.test.ts`
- `apps/web/tests/server-drafts.source-evidence.contract.test.ts`
- `apps/web/tests/create-link-analysis.auth-contract.test.ts`

Existing C8-relevant security/single-flight/source relation regressions remain mandatory but are not authorized for broad edits.

## Hard invariants

- authenticated real `draftId` before any network/provider side effect;
- no guest/pre-adoption fetch path;
- HTTP/HTTPS only, no URL userinfo, no sensitive/signed resource URL;
- exact accepted network target: no fetch of a semantically redacted/mutated substitute;
- DNS result validation plus pinned socket lookup;
- every redirect manually revalidated; maximum 3 redirects;
- blocked private/loopback/link-local/CGNAT/reserved/documentation/multicast IP space;
- declared and streamed byte limits;
- HTML/text <= 2 MiB; PDF <= 10 MiB;
- real PDF signature; first 80 pages; <=120,000 extracted chars; parser <=8s;
- external request <=12s;
- unsupported/binary MIME fails closed;
- YouTube transcript unavailable never becomes source-loaded and triggers no model call;
- existing Create single-flight is the only idempotency runtime;
- recovery after possible prior external execution fails closed rather than blindly repeating;
- no raw fetched body in single-flight result or durable draft evidence;
- successful source evidence is deterministic, idempotent and bound to the same authenticated draft/user;
- source fetch/AI success is never represented as externally verified evidence;
- no C9 review queue, dossier, graph activation, publication or auto-publish;
- ZERO PARALLEL TRUTH / FAIL CLOSED / NO FALSE DONE / EVIDENCE MUST PROVE THE CLAIM.

## Explicit exclusions

No runtime changes are authorized in:

- `CreateClient.tsx`
- `intelligentFollowupResults.ts`
- `inputClassification.ts`
- `next.config.ts`
- package manifests or lockfile
- support ticket modules
- editorial/review queue modules
- handoff routes
- C9-C12 surfaces

If implementation proves one of these exclusions necessary, stop and return to governance rather than silently widening scope.

## Size gate

```text
RUNTIME_OWNER_FILES_MAX=9
FOCUSED_TEST_FILES_MAX=7
TOTAL_CHANGED_FILES_TARGET<=17
CORE_CONTRACTS_CHANGED<=2
API_BOUNDARIES_CHANGED=1
NEW_DB_COLLECTIONS=0
NEW_BROWSER_PERSISTENCE=0
NEW_PACKAGES=0
EXPECTED_NET_LINES_TARGET<=1500
```

This authorization does not mark C8 done. Runtime implementation, exact-head CI, review and post-merge closure remain required.

C9-C12 remain unauthorized.
