# C4A1 Carrier-Race Exact-Head Review

```text
BASE_MAIN_SHA=daf75eba8a3426309e294aa09417c88e0cea3cda
ACTIVE_PR=762
REVIEW_HEAD=3164210f7aad2151a9ef420e1a14dbe7c4f461a2
P0=0
P1=1
P2=2
P1=PER_PREPARATION_BROWSER_CARRIER_RESPONSE_RACE
RESOLUTION=NO_PREPARATION_BROWSER_CARRIER_V1
CORE_CONTRACT_COUNT=2
```

The exact-head review found that a fixed preparation cookie could be changed by
out-of-order concurrent responses. A stale successful response could overwrite
the newest locator, and a stale post-barrier failure could clear it. Mongo
authority remains fail-closed, but a valid latest preparation could become
unreachable from the browser.

`NO_PREPARATION_BROWSER_CARRIER_V1` removes that race. C4A1 must not set or
clear a preparation cookie, expose `preparationId`, place a locator in a URL,
or create browser storage or a second transition token. The signed verified
C3A anonymous session remains the sole browser-side transition binding.

The unique `anonymousSessionBindingHash` slot remains authoritative. A fresh
server UUID remains internal CAS-attempt identity only. Future C4B, after its
own preflight and authorization, must require both the authenticated account
session and the verified C3A session, derive the binding hash, load the one
prepared and logically unexpired slot, decrypt it, and atomically consume it.
No browser-provided preparation locator is part of that future contract.

The active #762 implementation may be repaired only on its existing branch
and within its already authorized six-file boundary. The repair must narrow
duplicate-key handling to a single retry only for the unique binding-hash
first-upsert race; duplicate preparation IDs or unrelated duplicate keys fail
closed. Its existing test files must cover that bounded race, supersession,
post-barrier failures, binding-only reads, TTL/indexes, minimized persistence,
and absence of any browser preparation carrier.

```text
STALE_SUCCESS_RESPONSE_CAN_OVERWRITE_CARRIER=false
STALE_FAILURE_RESPONSE_CAN_CLEAR_NEW_CARRIER=false
CARRIER_RESPONSE_ORDER_RACE_ELIMINATED=true
SEPARATE_PREPARATION_COOKIE_REQUIRED=false
PREPARATION_ID_BROWSER_EXPOSED=false
C3A_SESSION_IS_TRANSITION_BINDING=true
C4B_LOOKUP_BY_BINDING_RECORDED=true
C4C_NO_LOCATOR_FLOW_RECORDED=true
IMPLEMENTATION_AUTHORIZATION_CONSUMED=true
NEW_IMPLEMENTATION_DISPATCH_ALLOWED=false
REVIEW_REPAIR_AUTHORIZED=true
C4B_STATUS=blocked
C4C_STATUS=blocked
C5_C12_UNAUTHORIZED=true
WHISTLEBLOWER_TASK_REGISTRATION_DEFERRED=true
```
