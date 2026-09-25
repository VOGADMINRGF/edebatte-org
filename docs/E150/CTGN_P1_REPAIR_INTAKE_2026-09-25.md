# C/T/G/N P1 Repair Intake — 2026-09-25

Status: `prepared_intake`

Base: `main@1868ccb4cb2c69672bd06e043704b7a871855816`

Purpose: preserve the independent Work audit findings as bounded repair evidence for the existing canonical owners. This file is **not** an implementation authorization, does **not** change `docs/E150/OpenTasks.md`, and does **not** make any task `codex_ready`.

Hard rules:
- existing owners only; no duplicate runtime/store/queue/orchestrator;
- no production activation, provider/secret changes, auto-publish, auto-approve or political profiling;
- before any code branch: current `main`, single-writer SSOT reconciliation where required, task-specific preflight, explicit bounded authorization, exact scope and owner collision check;
- Node-20 Web CI, focused contracts, repository integrity, lint, typecheck, build, `git diff --check`, zero unresolved review threads before merge.

## F1 — P1 Newsletter consent freshness

Owner: Issue #865 / existing N1–N9 newsletter runtime.

Affected surfaces:
- `apps/web/src/features/newsletter/newsletterProductionRuntime.ts`
- `apps/web/src/features/newsletter/newsletterRuntime.ts`
- existing canonical subscription truth `public_updates_subscribers`

Observed failure: a subscriber selected as `active` can become unsubscribed/suppressed/stale-consent before external handoff, while the send path keeps using the earlier snapshot.

Bounded repair target after authorization:
1. acquire the existing delivery lease;
2. reload current eligibility/preferences from the canonical subscription SSOT;
3. fail closed on read error or any non-sendable current state;
4. bind the send decision to the current consent/status revision at the external handoff boundary.

Required regressions: unsubscribe, suppression, stale consent, cadence/frequency opt-out and canonical read failure between selection → lease → send. No provider call for invalid current state.

Forbidden: second subscription store, production send activation, real-recipient test without controlled operator gate.

## F2 — P1 Newsletter ambiguous delivery replay

Owner: Issue #865 / existing newsletter ledger + lease.

Affected surfaces:
- `apps/web/src/features/newsletter/newsletterRuntime.ts`
- `apps/web/src/features/newsletter/newsletterProductionRuntime.ts`
- `apps/web/src/features/newsletter/newsletterDeliveryLease.ts`
- existing `newsletter_delivery_ledger`

Observed failure: SMTP/provider handoff can succeed while the later `sent` persistence fails. The record remains `sending` and can become automatically sendable again after timeout, producing a duplicate.

Bounded repair target after authorization:
- keep the existing delivery ledger as the single delivery truth;
- persist an unambiguous external-attempt boundary;
- `attempted` / `ambiguous` must not become automatically retryable solely because time elapsed;
- only failures proven to occur before provider handoff may auto-retry;
- consume provider idempotency only if the actual configured provider supports it.

Required regressions: crash before provider handoff, crash after successful handoff, failed `sent` write, lease expiry, provider timeout with unknown delivery, concurrent recovery, retry/idempotency.

Forbidden: second delivery store, claiming exactly-once transport where provider semantics cannot prove it.

## F3 — P1 QR internal-target origin escape

Canonical intake: Issue #540 `QR-INTERNAL-REDIRECT-HARDENING-01`.
Parent context: Issue #837 / G4B. Historical evidence: PR #520 only; do not replay wholesale.

Affected bounded candidate scope:
- `features/qr/qrStudioTargetContract.ts::resolveQrStudioTarget`
- `apps/web/tests/qr-studio-target.contract.test.ts`

Observed failure: target `/\\audit-attacker.example/path` can be classified as `internal` while WHATWG URL resolution produces an external origin.

Bounded repair target after current G4B/security authorization:
- reject raw/encoded/double-encoded backslashes and unsafe network-path/control variants;
- retain current domain ownership; no new cross-layer security truth;
- for targets classified `internal`, verify resolved origin equals the expected origin before returning `ready`.

Required regressions: raw/encoded/double-encoded backslash, `//host`, control chars, origin mismatch, safe same-origin path with query/fragment, currently permitted external HTTPS cases if contractually intended.

Separate follow-up only after its own convergence: Stream Agenda QR target POST/PATCH validation. Not implicitly authorized here.

Forbidden: whole #520 replay, new QR release store, Studio/Voxy scope, auth-wide rewrite.

## F4 — P1 Dossier revision CAS / atomicity

Owner: existing Dossier persistence/revision owner; T-track parent Issue #787. This finding does not authorize T6.

Affected surfaces:
- `features/dossier/revisions.ts::logDossierRevision`
- `features/dossier/db.ts::appendRevision`
- existing Dossier head + `dossier_revisions`

Observed failures:
1. after exhausted head CAS attempts, a revision can still be inserted/returned without the expected hash chain;
2. after a successful head update, failure to persist the revision entry can leave an advanced head without its durable revision entry;
3. two write implementations mutate the same revision truth.

Bounded repair target after authorization:
- converge to one shared revision writer;
- CAS exhaustion hard-fails before any unchained revision is persisted;
- head and durable revision entry use one DB-supported atomic boundary or an explicitly recoverable protocol whose invariants are proven;
- callers must not perform irreversible domain mutation and only afterwards best-effort audit it.

Required preflight before implementation: confirm current Mongo/DB transaction and retry capabilities in the canonical owner.

Required regressions: two concurrent writers, CAS exhaustion, revision insert failure after head-CAS, same-operation retry/idempotency, recovery without orphan/unlinked revision, both former writer call paths.

Forbidden: new Dossier/revision collection, T6 activation, graph/truth changes.

## Governance / SSOT reconciliation required

Issue #447 remains the only `OpenTasks.md` single-writer anchor.

Evidence-backed status drift to reconcile separately from these repairs:
- C10 technical code phase closed; target `manual_gate`, provider/inbox evidence remains;
- C13 authorized scope consumed by #955/#956/#987; mechanical `codex_ready` must not redispatch a fourth product slice;
- T0 and T1 implemented/accepted at their bounded scopes; T2A/T2B merged while T2C remains split-required/blocked; do not unlock T3+;
- G1 completed via current canonical implementation/hardening; do not treat historical #708 as operative review truth;
- #629 remains `review`; T9/G6 remain blocked;
- C11/C12, G4B/G5/GX remain blocked/not-authorized until their explicit gates change.

PR #798 was closed without merge on 2026-09-25 as a stale 964-commit-behind branch. Its old OpenTasks mutation must not be revived; its runtime/test hunks remain historical #617 evidence only.

## Promotion rule

A repair may move from `prepared_intake` to an executable implementation only through the repository's canonical governance flow. This document itself grants no branch creation, implementation, merge, provider or production authority.
