# C8 Authenticated Source / Link Analysis — Fresh Preflight

Date: 2026-09-18

```text
TASK=CREATE-AUTHENTICATED-SOURCE-LINK-ANALYSIS-01
ROLE=C8
MODE=FRESH_READ_ONLY_PREFLIGHT
BASE=main@081a706bba3c2da8393445ad602b329d6e204cc6
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
C9_C12_AUTHORIZED=false
SPLIT_REQUIRED=false
BLOCKING_COLLISIONS=NONE
```

## 1. Start condition

C8 requires C4 and C7 to be merged.

C4 is closed. C7 runtime PR #885 was merged as
`4569656ef5012ab4b63ef855144dd1c677c73f60`; its exact runtime head
`02cff3aad1d7cec244edd0d4bb8439ad3a052eed` passed Web CI #2654.
The C7 closure / C8-preflight authorization PR #886 was merged as
`081a706bba3c2da8393445ad602b329d6e204cc6` after exact-head Web CI #2656.

The C8 start condition is therefore satisfied.

## 2. Historical responsibility audited

The runbook identifies C8 source responsibility in #627, especially:

- `fb34133f` — external-input validation;
- `2fe5a15e` — hardened external material intake;
- `32a7569a` — semantic source smoke;
- `c9288245` — external source runtime restoration;
- `719836f8` — PDF parser runtime isolation;
- `545f5c07` — truthful YouTube transcript failure classification;
- `48d22af8` — YouTube transport boundary;
- `eafe3ae5` — serverless YouTube failure truth.

Historical #682 remains integration/security reference only. No whole commit
or stacked branch is authorized.

The historical commits are mixed. In particular they also contain support
ticket UX, editorial-review behavior, allowance copy, broad Create UI changes,
package changes and other responsibilities that are not C8-owned. Those hunks
must not be copied.

## 3. Current-main findings

### 3.1 Already-canonical foundations — reuse, do not replace

Current `/api/create/link-analysis` already:

- authenticates via `getSessionUser` before external work;
- enforces the existing Create mutation-security boundary;
- requires a real `draftId`;
- validates ownership/binding through `verifyCreateDraftBinding`;
- is invoked by `CreateClient` only with the already-saved authenticated
  `savedDraftId`;
- exposes truthful `fetching`, `fetch_failed`, `ai_failed` and
  `result_ready` result states;
- does not auto-publish or activate a graph/review queue.

The canonical Account/Create draft remains the existing `drafts` SSOT,
owned by `apps/web/src/server/serverDrafts.ts`.

The canonical source/evidence vocabulary already exists in
`features/analyze/atomicClaimSourceRelationContract.ts`, including
`SourceArtifact`, `SourceSegment` and `EvidenceAssessment`. C8 may
reference this vocabulary but must not create a second evidence graph.

C3C already owns robust recursive sensitive/signed URL detection in
`createGuestClaimSafety.ts`. C8 must reuse that policy boundary rather than
inventing another credential/signed-URL detector.

### 3.2 Current security/runtime gaps — C8 must repair

The current link-analysis route still contains an inline `fetchSource` that
uses native `fetch` with:

```text
redirect: "follow"
AbortSignal.timeout(12_000)
Buffer.from(await response.arrayBuffer())
```

That is not sufficient for the C8 contract.

Fresh audit proves the following gaps:

- no private / loopback / link-local / metadata-address SSRF rejection;
- no DNS-result validation and no pinned-address connection boundary;
- redirects are followed automatically rather than validated one by one;
- no redirect-count budget;
- no streamed byte ceiling before buffering;
- no `content-length` ceiling;
- no strict supported-content-type boundary;
- arbitrary non-PDF bytes can fall through into HTML/text handling;
- PDF parsing is currently a weak inline literal-string extractor even though
  `pdf-parse` is already installed and externally configured by Next;
- YouTube transcript failures collapse to a generic empty result;
- successful source analysis is returned to the browser but no canonical
  `SourceArtifact` / evidence reference is durably upserted into the already
  existing draft;
- the external fetch/provider execution is not currently protected by the
  existing Create single-flight runtime.

Therefore C8 is not already done.

## 4. Dependency decision

No package or lockfile change is needed.

Current main already contains:

- `pdf-parse@^2.4.5` in `apps/web/package.json`;
- `pdf-parse` in `serverExternalPackages` in
  `apps/web/next.config.ts`;
- the existing root `youtube-transcript` dependency.

Historical #627 added `undici`, but current C8 must not reintroduce that
dependency merely to recover the old implementation. The safe external-fetch
contract can be implemented with Node 20 built-ins:

- `node:dns/promises`;
- `node:net` / `BlockList`;
- `node:http` and `node:https`;
- explicit pinned `lookup`;
- manual redirect handling;
- streamed byte accounting;
- `AbortController` / request timeout.

This preserves the historical security semantics while avoiding package and
lockfile churn.

## 5. Required runtime contract

### 5.1 Source URL safety

Before any network side effect:

1. only `http:` and `https:` are accepted;
2. URL userinfo is rejected;
3. local/internal hostnames are rejected;
4. C3C sensitive/signed-resource URL policy is reused;
5. the URL is never semantically rewritten into a different fetch target to
   hide credentials or tokens;
6. if the supplied URL is sensitive, C8 fails closed with a fixed safe error
   state.

Ordinary non-secret tracking parameters may be omitted from a persisted
display/reference form only if this does not alter the URL actually fetched.
The network request must use the exact accepted URL.

### 5.2 SSRF and redirect boundary

Each request hop must:

- resolve the hostname server-side;
- reject every resolved private, loopback, carrier-grade NAT, link-local,
  documentation/test, multicast/reserved or otherwise non-public address;
- pin the actual socket lookup to the already-validated public address;
- use manual redirects;
- resolve and validate every redirect target again;
- cap redirects at 3;
- fail closed if DNS has no public result or a redirect becomes unsafe.

This closes both ordinary SSRF and validate-then-re-resolve DNS rebinding at
the application fetch boundary.

### 5.3 Resource limits

C8 should preserve the proven historical budgets unless a focused test proves
a smaller safe bound:

- HTML/text: maximum 2 MiB;
- PDF: maximum 10 MiB;
- PDF extraction: first 80 pages maximum;
- PDF extracted text: maximum 120,000 characters;
- PDF parser timeout: 8 seconds;
- external request timeout: 12 seconds.

Both declared `content-length` and actual streamed bytes must be bounded.

PDF content must carry a real PDF signature before PDF parsing. Text/HTML must
be restricted to supported textual MIME types and reject obvious binary
payloads.

`pdf-parse` must remain dynamically loaded only inside the PDF path.

### 5.4 YouTube

The existing YouTube adapter remains the only YouTube transcript source.
C8 may extend it only to expose safe bounded metadata:

- transcript language;
- segment count;
- safe failure reason.

A missing, disabled, rate-limited or unavailable transcript must not cause
page HTML or invented transcript text to be analyzed as if it were a
transcript. No model call follows an empty transcript.

### 5.5 Provider execution and single flight

The existing `runCreateOrchestrationSingleFlight` contract must be reused,
extended only with a C8 operation kind.

C8 uses a server-derived deterministic operation key based on the authenticated
draft and accepted source/input fingerprint. The browser correlation may remain
a trace/support reference but must not be the sole idempotency authority.

An exact retry must not create uncontrolled duplicate fetch/provider runs.

If a previous external execution may already have started and the lease is
recovered, the recovery path must fail closed without blindly repeating the
external side effect.

No raw fetched document body may be stored in the single-flight claim result.

### 5.6 Canonical draft source evidence

A successful source load/analysis must durably bind provenance to the existing
authenticated draft before reporting durable source success.

No new source collection is authorized.

The sole canonical-draft writer remains
`apps/web/src/server/serverDrafts.ts`. C8 may add one narrow idempotent source
evidence upsert there.

The upsert must:

- require the same authenticated `draftId + userId`;
- reject finalized, missing or legacy-read-only drafts;
- use a deterministic source key;
- store a canonical `SourceArtifact`-compatible object referencing the safe
  canonical/final source URL and cryptographic content hash;
- store only a pointer/reference used by the Create analysis result;
- overwrite/reuse the same logical source entry for the same draft/source
  rather than append duplicates;
- keep `reviewFirstOnly`, `noAutoPublish` and `noSilentMerge` truth;
- never promote the source to verified evidence merely because fetching or AI
  analysis succeeded.

For C8, `user_provided_material` is the safe default SourceArtifact type
unless a stronger type is deterministically known. The fetched local copy may
be represented as a copy/reading artifact; C8 must not claim publisher
authorship, rights, independence or external verification that it has not
proven.

C9 remains owner of review/handoff persistence. C8 source evidence must not
enqueue review, create a dossier, activate graph relations or publish content.

## 6. Exact implementation boundary

A separate implementation authorization may permit only the following runtime
files/hunks:

1. `.github/workflows/web-ci.yml`
   - add the new focused C8 tests to the existing Focused Create runtime suite.

2. `apps/web/src/app/api/create/link-analysis/route.ts`
   - replace inline fetch/parser/provider responsibility with bounded C8
     adapters;
   - retain existing auth, draft binding, mutation security and existing
     support-failure behavior without expanding support ownership;
   - single-flight the external operation;
   - persist canonical source evidence before durable success return.

3. `apps/web/src/features/create/createOrchestrationSingleFlight.ts`
   - add only the C8 operation kind required for reuse of the existing
     single-flight runtime.

4. `apps/web/src/features/create/externalSourceAnalysis.ts` — new
   - hunk-extract the bounded provider analysis contract from #627;
   - no provider-policy redesign.

5. `apps/web/src/features/create/externalSourceIntake.ts` — new
   - HTML/PDF/YouTube intake and resource limits;
   - no browser state or guest path.

6. `apps/web/src/features/create/safety/createGuestClaimSafety.ts`
   - minimal reusable export for existing signed/sensitive Source-URL policy;
   - no C3C behavior weakening.

7. `apps/web/src/lib/net/safeExternalFetch.ts` — new
   - Node-built-in implementation of the historical SSRF/redirect/size
     contract; no new dependency.

8. `apps/web/src/server/serverDrafts.ts`
   - one narrow canonical-draft source-evidence upsert; no new collection and
     no second generic draft writer.

9. `features/ai/sources/youtube.ts`
   - safe transcript metadata/failure classification only.

No implementation change is required or authorized in:

- `CreateClient.tsx`;
- `intelligentFollowupResults.ts`;
- `inputClassification.ts`;
- `next.config.ts`;
- package manifests or `pnpm-lock.yaml`;
- support ticket modules;
- editorial/review queue modules;
- handoff routes;
- C9+ surfaces.

If implementation evidence proves one of those exclusions is actually
necessary, implementation must stop and return to governance rather than
silently widening scope.

## 7. Authorized focused tests

The implementation authorization may add/modify only focused C8 tests such as:

- `apps/web/tests/safe-external-fetch.security.test.ts` — new;
- `apps/web/tests/create-external-source-intake.security.test.ts` — new;
- `apps/web/tests/create-external-source-pdf-timeout.contract.test.ts` — new;
- `apps/web/tests/create-external-source-analysis.contract.test.ts` — new;
- `apps/web/tests/youtube-source.contract.test.ts` — new;
- `apps/web/tests/server-drafts.source-evidence.contract.test.ts` — new;
- `apps/web/tests/create-link-analysis.auth-contract.test.ts` — extend.

Existing single-flight, Create route-security and atomic-claim/source-relation
tests remain mandatory regressions and should be run, but need not be modified
unless the exact C8 operation-kind addition requires one focused assertion.

## 8. Required adversarial acceptance

At minimum, tests must prove:

### Auth / sequencing

- unauthenticated source analysis is rejected before network/provider work;
- missing, foreign or invalid draft is rejected before network/provider work;
- no guest/pre-adoption source analysis path exists;
- ordinary `/create` URL detection alone performs no fetch/provider work.

### SSRF

Reject without request dispatch:

- `localhost` and subdomains;
- `.local`, `.internal`, `.home.arpa`;
- `127.0.0.0/8`;
- `10.0.0.0/8`;
- `172.16.0.0/12`;
- `192.168.0.0/16`;
- `169.254.0.0/16` including cloud metadata;
- CGNAT;
- IPv6 loopback/link-local/ULA;
- IPv4-mapped IPv6 private addresses;
- a public hostname resolving to any blocked address.

A public first hop redirecting to a blocked destination must fail closed.

### URL secrets

Reject:

- URL userinfo;
- AWS presigned parameters;
- Google signed URL parameters;
- Azure SAS parameters;
- generic signature/credential/auth/token query keys;
- recursively percent-encoded signed parameters;
- malformed percent-encoding where safe interpretation is ambiguous.

No test may “solve” this by fetching a redacted/mutated target.

### Resources and media

- declared oversize response rejected;
- chunked body exceeding the byte budget rejected during streaming;
- redirect limit enforced;
- timeout enforced;
- unsupported MIME rejected;
- binary payload masquerading as text rejected;
- PDF suffix/MIME mismatch with invalid signature rejected;
- PDF parser timeout bounded;
- PDF page/text budgets enforced;
- valid HTML, valid PDF and valid YouTube transcript produce truthful source
  loading.

### Provenance / idempotency

- successful source analysis writes exactly one deterministic source evidence
  entry into the same canonical authenticated draft;
- stored artifact carries canonical reference + cryptographic content hash and
  no raw document body;
- same draft + same source reuses/upserts rather than duplicates;
- a different draft cannot mutate the first draft's source evidence;
- failed fetch or failed provider analysis does not persist a false
  source-verified state;
- exact retry does not cause uncontrolled duplicate provider/fetch execution;
- no C9 review item or publication/graph state is created by C8.

### Truthful UX/API

- source pending/loading remains visibly provisional;
- fetch failure remains `fetch_failed`;
- provider failure remains `ai_failed`;
- transcript unavailable is not represented as source-loaded;
- successful fetch/analysis is not labeled externally verified.

## 9. Size / collision gate

The bounded target remains below the structural limits:

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

The implementation must stop and split before runtime work if the projected
diff exceeds these limits, especially the approximately 1500-net-line target.

## 10. Decision

```text
PREFLIGHT_RESULT=PASS_FOR_SEPARATE_GOVERNANCE_AUTHORIZATION
IMPLEMENTATION_AUTHORIZED=false
NEXT_ACTION=MERGE_THIS_PREFLIGHT_AFTER_EXACT_HEAD_CI_THEN_OPEN_ONE_C8_IMPLEMENTATION_AUTHORIZATION
```

C8 is implementable without Codex and without a new dependency or database.
No runtime change is authorized by this document itself.

C9-C12 remain unauthorized.
