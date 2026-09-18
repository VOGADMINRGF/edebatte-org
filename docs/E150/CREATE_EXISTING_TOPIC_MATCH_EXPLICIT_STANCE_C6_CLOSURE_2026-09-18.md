# C6 Existing-Topic Match and Explicit Stance — Closure

Date: 2026-09-18

```text
TASK=CREATE-EXISTING-TOPIC-MATCH-EXPLICIT-STANCE-01
ROLE=C6
STATUS=done
IMPLEMENTED=true
DONE=true
RUNTIME_PR=#881
RUNTIME_HEAD=953efcd02b1f888b4d28b191c41eb7b861f66749
RUNTIME_MERGE=e3915d9e92b49dd74ff997b258de19d5893c5ed5
EXACT_HEAD_WEB_CI_RUN=2643
EXACT_HEAD_WEB_CI_CONCLUSION=success
C7_PREFLIGHT_AUTHORIZED=true
C7_IMPLEMENTATION_AUTHORIZED=false
C8_C12_AUTHORIZED=false
```

## Closure evidence

C6 is complete on main after runtime PR #881 merged as
`e3915d9e92b49dd74ff997b258de19d5893c5ed5`.

The runtime head
`953efcd02b1f888b4d28b191c41eb7b861f66749`
passed exact-head Web CI run #2643 including:

- repository integrity guards;
- Decision Dossier T0 regression;
- web critical guardrails;
- production guardrails;
- focused AI/public-discovery contracts;
- organization-registry contracts;
- Voxy contracts;
- focused Create runtime contracts;
- Create save-domain contracts;
- lint;
- typecheck;
- production build.

No failing check was waived.

## Contract closed

C6 now exposes exactly four explicit citizen choices for an existing-topic
match:

- `count_my_position`
- `count_as_opposition`
- `add_as_nuance`
- `keep_separate`

Missing or invalid selection remains `null` / unknown. A descriptive
`related` or `opposing` relation never becomes the citizen's stance.

The runtime carries only an explicit allowlisted decision into preparatory
`CreateHandoffDraft` and review-queue objects. It does not perform durable
handoff persistence, graph activation, counting, merging, publication or any
other C9 responsibility.

The C6 UI remains confirm-first. Its selected-state notice explicitly states
that nothing was merged or published.

The relation helper is deliberately conservative: incidental negation does
not create an opposing relation; explicit policy rejection can mark a match
as a possible opposing relation, but the user's stance still requires one of
the four explicit choices.

## Scope preserved

C6 introduced no new API, database schema, cookie, browser-storage authority,
provider flow, C7 jurisdiction-confirmation authority, C8 source-analysis
authority, or C9 durable persistence.

`autoCreate=false` and `autoPublish=false` remain preserved in preparatory
handoff/review objects.

## Next authorized action

C6 is the prerequisite for C7. This closure authorizes exactly one fresh
read-only preflight for:

`CREATE-OFFICIAL-JURISDICTION-INDEX-CONFIRMATION-01` (C7)

The C7 preflight must start from the then-current `main` and must prove the
modern boundary against the already merged C5 resolver instead of blindly
copying the historical #682 generated-index implementation.

The preflight must specifically determine:

- how server-authoritative candidate keys are derived and validated;
- how the existing canonical `features/region` directory supplies
  administrative-unit type and official authority without a second resolver
  truth;
- that Wuppertal remains municipality/city;
- that Dithmarschen remains district/county;
- that federal and EU scopes remain unchanged;
- that ambiguous jurisdiction stays unconfirmed;
- how confirmed jurisdiction survives the existing authenticated
  save/handoff path without introducing browser authority;
- how guest/adoption state cannot overwrite a later legitimate confirmation;
- how cached lookup avoids a full official-directory scan per request;
- how the known historical P2 localization gap is closed with complete DE/EN
  confirmation-panel copy.

C7 implementation remains unauthorized until its fresh preflight is merged
and a separate bounded implementation authorization is approved.

C8-C12 remain unauthorized.
