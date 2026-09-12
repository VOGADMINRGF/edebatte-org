# C4A Fresh Preflight Evidence

```text
BASE_MAIN_SHA=232f390df68e9b46a01082a73d9f3259f4a61e38
TASK=CREATE-GUEST-ADOPTION-PREPARATION-FOUNDATION-01
RESULT=FAIL_SPLIT_REQUIRED
COLLISION_RESULT=SPLIT_REQUIRED
BLOCKING_COLLISION=VISIBLE_PRE_SUBMIT_INTENT_CANNOT_TRUTHFULLY_COMPLETE_BEFORE_C4B
CORE_CONTRACT_COUNT=3
SECURITY_DOMAIN_COUNT=5
```

Positive findings: the merged At-Rest interface is reusable without modification; `inspectGuestClaim` is reusable; C3D remains ephemerally unchanged with no browser persistence; plaintext is claim-only UTF-8 and is never persisted; the candidate durable core-Mongo preparation stores only the structured encrypted envelope, a domain-separated anonymous-session binding hash, opaque server preparation ID and logical expiry. C3B mutation security is reusable, with a new finite preparation limiter scope to be verified. Runtime invocation without At-Rest configuration must fail closed; no production secret is required for a code merge.

The server preparation/carrier foundation and the visible Guest intent/Login transition are independent contracts. A visible pre-submit action would be a dead-end before C4B can consume the preparation; post-submit continuity would violate C3D clearing. Therefore C4A is a blocked decomposition parent. C4A1 is registered only for a fresh preflight; C4B follows C4A1 done; C4C follows C4B done.

```text
AT_REST_FOCUSED_TESTS=PASS; 13/13
C3A_REGRESSIONS=PASS; 11/11
C3B_REGRESSIONS=PASS; 36/36
C3C_REGRESSIONS=PASS; 47/47
C3D_REGRESSIONS=PASS; 13/13
GOVERNANCE_TESTS=PASS; 4/4
OPENTASKS_CONTROL_PLANE_TESTS=PASS; 126/126
```
