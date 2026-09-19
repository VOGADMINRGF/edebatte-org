# C7 Official Jurisdiction Index and Confirmation — Closure

Date: 2026-09-18

```text
TASK=CREATE-OFFICIAL-JURISDICTION-INDEX-CONFIRMATION-01
ROLE=C7
STATUS=done
IMPLEMENTED=true
DONE=true
RUNTIME_PR=#885
RUNTIME_HEAD=02cff3aad1d7cec244edd0d4bb8439ad3a052eed
RUNTIME_MERGE=4569656ef5012ab4b63ef855144dd1c677c73f60
EXACT_HEAD_WEB_CI_RUN=2654
EXACT_HEAD_WEB_CI_CONCLUSION=success
C8_PREFLIGHT_AUTHORIZED=true
C8_IMPLEMENTATION_AUTHORIZED=false
C9_C12_AUTHORIZED=false
```

## Closure evidence

C7 is complete on main after runtime PR #885 merged as
`4569656ef5012ab4b63ef855144dd1c677c73f60`.

The exact runtime head
`02cff3aad1d7cec244edd0d4bb8439ad3a052eed`
passed Web CI run #2654 with no waived failures. The run included:

- repository integrity guards;
- Decision Dossier T0 regression;
- web critical guardrails;
- production guardrails;
- focused AI/public-discovery contracts;
- organization-registry contracts;
- Voxy contracts;
- focused Create runtime contracts;
- Create save-domain contracts;
- gitleaks/security checks;
- lint;
- typecheck;
- production build.

## Contract closed

C7 now reuses the existing cached official `@features/region` directory as
the server-authoritative source for place identity and administrative level.
It does not introduce a second municipality dataset or a second resolver
truth.

The jurisdiction contract is administrative-level aware:

- Wuppertal remains a municipality/city candidate;
- Dithmarschen remains a district/county candidate;
- federal and EU scope remain federal/EU rather than being reduced to a
  municipality;
- ambiguous or unknown jurisdiction remains unconfirmed.

Candidate keys are derived from server-owned candidates. A client-supplied
confirmation is not trusted merely because its shape is valid: Save and
Handoff revalidate the key against server-owned context before persistence.
Manipulated or invented authority keys fail closed.

The browser may carry an explicit citizen confirmation choice as UI state, but
it does not become jurisdiction authority. Handoff transport remains
untrusted until server validation.

The confirmation UX is explicit and localized in German and English. A profile
location remains an editable suggestion rather than an implicitly confirmed
jurisdiction.

The official place index is cached and reused instead of rescanning the full
directory for each request.

## Scope preserved

C7 introduced no new Create API, no new persistence system, no new browser
storage authority, no new cookie, no new municipality dataset, no C8 source
fetching behavior, no C9 review-queue activation and no auto-publish behavior.

Save/Handoff changes are limited to C7 revalidation and transport of the
validated jurisdiction result. They do not change queue ownership, graph
activation, publication or review semantics.

## Next authorized action

C7 is the prerequisite for C8. This closure authorizes exactly one fresh
read-only preflight for:

`CREATE-AUTHENTICATED-SOURCE-LINK-ANALYSIS-01` (C8)

The C8 preflight must start from the then-current `main` and audit the modern
runtime before extracting historical #627/#682 responsibility.

It must specifically prove:

- source/link analysis runs only after a real authenticated canonical
  `draftId` exists;
- no guest/pre-adoption source fetch, planner call or browser-carried recovery
  authority is introduced;
- URL validation is server-authoritative and fails closed for unsupported or
  unsafe URLs;
- SSRF protection covers private, loopback, link-local and otherwise
  non-public network targets, including redirects and resolution changes;
- response size, content type, redirect count and timeout are bounded;
- fetch failure cannot masquerade as verified evidence;
- source material is persisted through the existing canonical
  SourceArtifact/EvidenceReference path rather than a parallel source store;
- retries remain draft/correlation bound and do not create duplicate logical
  source artifacts or uncontrolled provider/fetch executions;
- raw credentials, secrets, signed URLs or unnecessary query-token material
  are not persisted or exposed to UI/telemetry;
- C9 handoff/review persistence remains outside C8 ownership;
- existing link-analysis code on current main is classified hunk-by-hunk as
  reusable, already-canonical, stale or out-of-scope before any runtime edit.

C8 implementation remains unauthorized until that fresh preflight is merged
and a separate bounded implementation authorization is approved.

C9-C12 remain unauthorized.
