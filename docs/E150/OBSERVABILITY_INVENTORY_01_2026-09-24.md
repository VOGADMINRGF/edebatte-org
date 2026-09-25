# OBSERVABILITY-INVENTORY-01 — Current-main inventory

Date: 2026-09-24  
Issue: #611  
Task: `OBSERVABILITY-INVENTORY-01`  
Audited main: `66475776dfae4b5109308269c156ff8ef488bb95`

## Authority and scope

A task-scoped preflight was executed against the exact audited `main` before the product/audit branch was created. It returned:

- `status=codex_ready`
- `executable=true`
- `branchCreationAllowed=true`

This document is Slice A only. It is an inventory and collision/redaction review. It does **not** authorize Slice B–G and makes no logger-runtime switch, OpenTelemetry rollout, external export, provider activation, MongoDB Atlas tier/auditing change, retention decision, or new telemetry truth store.

## 1. Logger callsite / owner matrix

| Surface | Current owner / role | Redaction | Active use / evidence | Slice-A assessment |
| --- | --- | --- | --- | --- |
| `core/observability/logger.ts` | Core structured Pino logger | Reuses `core/pii/redact.ts` / `PII_REDACT_PATHS` | Canonical core logger surface | Reuse; do not replace |
| `apps/web/src/utils/logger.ts` | Web structured Pino logger | Reuses `PII_REDACT_PATHS` plus `user.mfaSecret` | Actively imported by web/client/server helpers | Reuse; policy drift versus core must be resolved only in a separately authorized Slice B |
| `apps/web/src/lib/logger.ts` | Compatibility facade | Delegates directly to `@/utils/logger` | Broad active `@/lib/logger` callsite set | Not a third implementation; preserve facade |
| `apps/web/src/lib/logging/pino.ts` | Separate/legacy Pino implementation | **No central PII redaction configured** | No active import was found by the current code-search pass | Drift risk; do not delete or rewrite in Slice A |
| direct `console.*` | Ad-hoc fallback / route diagnostics | No central redaction contract | Present in sensitive auth/admin/billing paths | Real hardening gap; requires bounded Slice B decision |

### Confirmed active web logger callsite groups

Current code search shows the central `@/lib/logger` / `@/utils/logger` surfaces in, among others:

- auth and account helpers;
- upload and subscription routes;
- Create analysis/streaming flows;
- OpenAI client code;
- billing/quota and upgrade flows;
- Mongo/auth/JWT/basic-auth helpers;
- search/rooms/notification preferences;
- client telemetry and call/WebRTC support.

The inventory therefore treats `apps/web/src/utils/logger.ts` plus its `apps/web/src/lib/logger.ts` facade as an existing shared owner, not something to duplicate.

## 2. Redaction coverage matrix

The current central redaction owner is `core/pii/redact.ts`.

Its `PII_REDACT_PATHS` currently covers representative secret/PII classes including:

- authorization headers;
- password, passcode, token and TOTP fields;
- email and phone fields;
- user / actor / payload email and phone fields;
- IBAN and payment/card fields;
- payment-profile secret-like fields;
- signature raw/bytes fields;
- top-level email, phone, IBAN and address fields.

It also provides masking helpers for email, phone, IBAN, name and user IDs.

| Path | Normal Pino path | Initialization/fallback path | Current risk |
| --- | --- | --- | --- |
| `core/observability/logger.ts` | central redaction enabled | raw `console.*` fallback can receive the original arguments | Fallback can bypass redaction |
| `apps/web/src/utils/logger.ts` | central redaction enabled + `user.mfaSecret` | raw `console.*` fallback can receive the original arguments | Fallback can bypass redaction |
| `apps/web/src/lib/logging/pino.ts` | no central redaction | raw `console.*` fallback | Both normal and fallback paths lack the canonical policy |
| direct route `console.*` | n/a | direct console | No automatic canonical redaction |

### Sensitive direct-console samples confirmed on audited main

This is a risk sample, not an instruction to mass-rewrite every console call:

- Auth: `apps/web/src/app/api/auth/reset/route.ts`, `request-reset/route.ts`, `login/route.ts`, `me/route.ts`, TOTP/2FA routes and identity-email verification routes.
- Billing: Stripe checkout, portal and webhook routes log error objects/strings directly.
- Admin: health, telemetry, feed runtime, membership and dashboard routes contain direct `console.*` paths.

Some of these calls already log only classified/minimal values; others pass raw `Error` objects or `String(error)`. Slice B must distinguish those cases rather than perform a blind mechanical replacement.

## 3. Event / telemetry reuse matrix

Existing telemetry is already distributed by domain and must be reused rather than replaced by a new generic event store.

| Domain/surface | Existing evidence on current main | Reuse rule |
| --- | --- | --- |
| AI operations | `core/telemetry/aiUsage.ts`, `core/telemetry/aiUsageTypes.ts`, `features/ai/telemetry.ts`, admin AI telemetry APIs/UI | Keep domain event/usage contracts; logging foundation must not become AI truth |
| Identity | `core/telemetry/*` identity surfaces and admin identity telemetry routes/UI | Reuse; do not duplicate identity funnel state |
| Themenradar | `features/themenradar/telemetry.ts` plus admin telemetry route | Reuse domain event names |
| Admin telemetry | `apps/web/src/app/api/admin/telemetry/*` and `/app/admin/telemetry/*` | Treat as read/aggregation surfaces, not logging SSOT |
| Output/Voxy | Existing feature-specific telemetry/contracts referenced by #611 | Preserve domain boundaries; no new Voxy logging truth |
| Runtime logger | Core + web Pino owners above | Logging is diagnostic evidence, never business state |

Current repository search does **not** confirm the older inventory paths `apps/web/src/lib/net/requestContext.ts`, `core/observability/eventStore.ts`, or `packages/telemetry/src/throughput.redact.ts` on the audited main. They are therefore not treated as current canonical owners in this report. Any later correlation/export slice must rediscover the current owner instead of reviving stale paths.

## 4. Collision matrix

| Concurrent work | Collision level | Evidence / handling |
| --- | --- | --- |
| PR #987 — C13 canonical source intake adapter | none for logger owners | Declared scope is two Create source-adapter/test files; no observability ownership |
| PR #968 — VOG→eDebatte auth / Mongo isolation | **functional adjacency** | Touches auth, Mongo trust zones and CI; current PR file scan found no direct edit of the three logger implementation files. Any future auth/logger hardening must rebase/recheck this PR before changing sensitive auth paths |
| Other open PRs | no direct logger-owner collision established in Slice-A scan | Do not infer safety for future implementation solely from this inventory; repeat exact-file collision scan immediately before Slice B |

No separate open observability/logger product branch was found before `audit/observability-inventory-01` was created.

## 5. Confirmed gaps

### G1 — Logger policy drift

`apps/web/src/lib/logging/pino.ts` does not use `PII_REDACT_PATHS`, while the core and primary web loggers do.

**Failure mode:** a caller reaching the legacy logger can emit fields that would have been censored by the canonical redaction list.

**Minimal later repair:** align the existing implementation/facade to the existing policy; no new logger store or generic logging framework.

### G2 — Fallback redaction bypass

Both central redacting Pino implementations fall back to raw `console.*` when logger initialization fails. The fallback receives original arguments without applying the PII policy.

**Failure mode:** the precise degraded path in which structured logging is unavailable is also the path in which redaction can be bypassed.

**Minimal later repair:** a redaction-preserving fallback plus leak fixtures for normal and forced-fallback execution.

### G3 — Sensitive direct-console paths

Auth, billing and admin routes still contain direct `console.*` calls, including raw `Error`/`String(error)` paths.

**Failure mode:** provider/runtime error text can contain URLs, payload fragments, identifiers or other values that bypass structured logger redaction.

**Minimal later repair:** classify and migrate only sensitive runtime callsites; do not mass-rewrite benign build/dev diagnostics.

### G4 — Correlation owner must be rediscovered on current main

Historical inventory references to a request-context owner are not present at the previously recorded path on audited main.

**Failure mode if ignored:** Slice C could create a second request/correlation ID authority based on stale assumptions.

**Minimal later repair:** Slice C must begin with an exact current-main owner search and reuse the live request/job IDs it finds.

### G5 — Retention/export remains a manual policy boundary

No Slice-A evidence authorizes external log/trace/metric export, Atlas Database Auditing, or fixed production retention periods.

**Failure mode if ignored:** observability work could silently become a new data processor/retention path.

**Required handling:** keep external export disabled and defer retention/provider decisions to the explicit later gates in #611.

## 6. What Slice A proves

1. A canonical PII redaction module already exists and is reused by the two main structured loggers.
2. `apps/web/src/lib/logger.ts` is a facade, not a competing logger truth.
3. A separate legacy Pino implementation is materially weaker because it omits canonical redaction.
4. Redaction can be bypassed by raw console fallback and direct console paths.
5. Domain telemetry already exists in multiple bounded contexts; a new all-purpose telemetry/event truth store would be a duplicate architecture.
6. No external exporter/provider activation is needed to repair the confirmed logging gaps.
7. Historical observability paths must not be assumed to exist on current main.

## 7. Recommended bounded follow-up slices — not authorized by this report

The evidence supports the existing #611 order, without changing architecture:

1. `LOGGER-SSOT-PII-REDACTION-01`: align existing logger policy/fallbacks and add PII/token leak regressions.
2. `OBSERVABILITY-CORRELATION-CONTRACT-01`: only after rediscovering the live correlation/request/job owners on then-current main.
3. OpenTelemetry/export, Mongo Atlas auditing, alerting/runbooks and SIEM evaluation remain later explicit gates; default external export stays off.

**Stop condition:** completion of this report does not grant branch creation for Slice B or any later slice. The next slice requires its own canonical serialization/preflight according to #611/#447 governance.
