# Alpha-Foxtrott 2.0 — Durable Runtime Storage Decision

Status: **approved architecture decision**
Stand: 2026-08-23
Scope: Alpha-Foxtrott 2.0 control plane for eDebatte, VoiceOpenGov, Vote4Gov, Voxy and shared operations

## Decision

Alpha-Foxtrott 2.0 uses the repository's existing infrastructure split:

- **MongoDB is the durable source of truth for missions, runs, checkpoints, leases, recovery metadata, outcomes and resumable state.**
- **BullMQ + Redis is the execution and dispatch layer for queued work, delayed retries and worker delivery.**
- **Redis is never the canonical run truth.** A Redis loss or worker restart must be recoverable from MongoDB-backed ledger state.

This decision extends the existing platform instead of introducing Temporal, LangGraph Cloud or another external orchestration service at this stage.

## Why this decision

The repository already contains MongoDB/Mongoose persistence and BullMQ/Redis worker infrastructure. Reusing both reduces time-to-runtime, provider dependency, operating cost and migration risk while preserving the Architecture Canon requirement to extend existing capabilities before creating parallel paths.

The runtime must solve the current operational failure mode: work may not disappear because a chat, HTTP request, worker process or Redis queue entry ended. The durable run ledger therefore outranks the execution queue.

## Required invariants

1. Every executable run has a persistent MongoDB record before dispatch.
2. Every run has an idempotency key and optimistic version.
3. Worker ownership is attempt-specific and lease-based. Every external or mutating executor effect must cross the lease-fenced effect boundary; the sink must atomically deduplicate a stable run/effect idempotency key and reject stale monotonic fence generations. Lease loss aborts the executor and blocks further effects.
4. A worker may resume only from a persisted checkpoint/state.
5. Queue delivery is at-least-once; execution must therefore be idempotent.
6. Terminal, review and human-gate states are not automatically re-dispatched.
7. Scheduled waiting/retry state carries a persistent `resumeAt` timestamp so Redis loss does not erase timing intent.
8. Recovery scans may recreate missing BullMQ jobs from due MongoDB ledger records.
9. Queue success is not proof of mission success; the MongoDB run state is authoritative.
10. No queue or recovery loop may bypass OpenTasks eligibility, risk gates, human-sovereignty gates, budgets or review requirements.
11. Exact-head authorization evidence is resolved under the acquired lease, bound to a concrete commit SHA and observation time, and rejected when missing, stale or mismatched.

## Human sovereignty

This architecture decision does not authorize autonomous:

- merge or deploy;
- external publication of consequential political claims;
- external notifications without an approved policy;
- spending, contracts or legal commitments;
- rights/entitlement changes;
- destructive infrastructure changes;
- secret/security changes.

Low-risk reversible operations may become automatic only behind an explicit policy and the central Alpha risk gate.

## Failure and recovery model

Canonical flow:

`persist run -> dispatch BullMQ job -> acquire Mongo lease -> execute bounded worker step -> persist checkpoint/outcome -> release lease -> dispatch next due step`

If the worker dies after acquiring a lease, the lease expires and the run becomes recoverable.

If Redis loses a job, a recovery scan reads due MongoDB states and re-dispatches an idempotent BullMQ job.

If a worker step fails, the failure and `resumeAt` are persisted before any retry is scheduled.

If human review is required, the run enters `review` or `human_gate` and recovery stops until an explicit decision changes the state.

## Migration path

This is not a permanent ban on another workflow engine. A later migration is allowed only if measured evidence shows that the existing MongoDB/BullMQ runtime cannot meet reliability, observability, scale or operational-cost requirements. The durable run contract must remain provider/runtime agnostic so a migration does not change mission semantics.

## Relation to other canon

This decision is subordinate to:

1. `docs/foundation/Constitution.md`
2. `docs/foundation/Vision.md`
3. `docs/foundation/Grundwerte.md`
4. `docs/foundation/Architecture-Canon.md`
5. `docs/foundation/Engineering-Canon.md`
6. `docs/foundation/ALPHA_FOXTROTT_2_AGENTIC_ORG_RUNTIME.md`

It concretizes Phase 1 durable execution without changing the no-general-auto-publish or human-responsibility principles.
