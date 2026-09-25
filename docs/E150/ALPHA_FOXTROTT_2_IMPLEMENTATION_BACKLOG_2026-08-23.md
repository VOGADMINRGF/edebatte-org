# Alpha-Foxtrott 2.0 — Implementation Backlog

Stand: 2026-08-23
Status: proposed execution backlog
Canonical architecture: `docs/foundation/ALPHA_FOXTROTT_2_AGENTIC_ORG_RUNTIME.md`

This backlog decomposes the Alpha-Foxtrott 2.0 foundation architecture into bounded implementation slices. `docs/E150/OpenTasks.md` remains the operational SSOT; the task IDs below must be mirrored there before implementation begins.

## Reconciliation 2026-09-02

This file is historical architecture decomposition, not a current execution queue. The operative Alpha2 statuses and dependencies are exclusively in the canonical head of `docs/E150/OpenTasks.md`; the cross-cutting target is reconciled in `docs/E150/E150_CITIZEN_VOXY_ALPHA2_TARGET_ARCHITECTURE_2026-09-02.md`.

The current critical autonomy path is:

1. central GitHub state adapter;
2. controlled transactional OpenTasks single writer;
3. durable orchestrator loop;
4. convergence of the existing continuous-dispatch Draft PR;
5. convergence of the existing bounded-repair Draft PR;
6. production-capable Mission Control and observability linkage;
7. autonomous end-to-end and recovery acceptance.

The earlier wave descriptions below remain useful design evidence but must not be used to reopen completed runtime work or bypass current PR ownership.

## Priority 0 — Control plane foundation

### ALPHA2-RUN-CONTRACT-01

- Status: proposed `codex_ready` after OpenTasks intake
- Priority: critical
- Scope: shared package / server-side contracts only
- Goal: define canonical durable run/job schema, lifecycle states, parent/child relationships, checkpoint metadata, budget/risk fields, artifact/evidence references and human-gate state.
- Acceptance:
  - typed schema with validation;
  - explicit states for queued/running/waiting/review/human_gate/failed/completed/cancelled;
  - no runtime provider commitment yet;
  - tests for valid/invalid transitions;
  - docs synchronized.

### ALPHA2-AGENT-REGISTRY-01

- Status: proposed `codex_ready` after RUN-CONTRACT
- Priority: critical
- Goal: create canonical role registry with capability, tool permission, risk ceiling, default model class and evaluation suite references.
- Acceptance:
  - no agent is defined only by a chat prompt;
  - registry separates logical role from model/provider;
  - role permissions are machine-readable;
  - initial engineering/review/qa/research/growth/membership/support roles represented.

### ALPHA2-RISK-GATE-CONTRACT-01

- Status: proposed `codex_ready` after RUN-CONTRACT
- Priority: critical
- Goal: define action risk classes and whether execution is automatic, review-required or human-only.
- Acceptance:
  - public political claims, spending/contracts, rights changes and destructive infrastructure actions cannot become general auto-actions;
  - reversible low-risk operations can be authorized for automatic continuation;
  - every gate decision is ledgered with reason/evidence.

## Priority 1 — Durable orchestration

### ALPHA2-PERSISTENT-RUN-LEDGER-01

- Status: proposed `blocked` on runtime/storage decision
- Priority: critical
- Goal: persist run state, checkpoints, child jobs, evidence, cost and outcomes independent of chat/session lifetime.
- Required decision before implementation: storage/runtime choice and migration policy.
- Acceptance:
  - restart does not lose active mission state;
  - idempotent resume;
  - audit history retained;
  - explicit failure/recovery states.

### ALPHA2-ORCHESTRATOR-LOOP-01

- Status: proposed `blocked` on persistent run ledger
- Priority: critical
- Goal: implement `observe -> prioritize -> delegate -> verify -> learn -> continue/escalate` loop.
- Acceptance:
  - Alpha dispatches bounded child workers;
  - eligible next slice can start without human `go`;
  - real product/governance/manual gates still stop safely;
  - concurrency and budget ceilings respected.

### ALPHA2-OPENTASKS-ADAPTER-01

- Status: proposed `codex_ready` after RUN-CONTRACT
- Priority: high
- Goal: parse operative OpenTasks entries into machine-readable task candidates without creating a second backlog truth.
- Acceptance:
  - respects canonical statuses;
  - never starts blocked/review/manual_gate work as implementation;
  - detects existing branch/PR ownership;
  - produces explainable eligibility result.

### ALPHA2-GITHUB-STATE-ADAPTER-01

- Status: proposed `codex_ready` after RUN-CONTRACT
- Priority: high
- Goal: expose branch/PR/CI/review/merge-base state to Alpha as structured evidence.
- Acceptance:
  - duplicate worktree/PR prevention;
  - exact-head evidence available;
  - stale/failed CI represented explicitly;
  - no implicit merge authorization.

## Priority 2 — Engineering fleet and Codex benchmark

### ALPHA2-DIRECT-ENGINEERING-WORKER-01

- Status: proposed `blocked` on orchestrator + agent registry
- Priority: high
- Goal: implement a provider-agnostic engineering worker able to inspect repo, edit, run tests, produce evidence and hand off to independent review.
- Acceptance:
  - same task contract whether worker is direct GPT, Codex or later OSS;
  - isolated branch/worktree ownership;
  - tests/evidence mandatory;
  - cannot self-approve merge.

### ALPHA2-INDEPENDENT-REVIEW-WORKER-01

- Status: proposed `blocked` on agent registry
- Priority: high
- Goal: independent reviewer evaluates code, tests, docs/canon drift and regression risk.
- Acceptance:
  - separate run identity from implementer;
  - blocking findings structured;
  - reviewer cannot silently alter product canon.

### ALPHA2-CODEX-VS-DIRECT-EVAL-01

- Status: proposed `blocked` on direct engineering worker
- Priority: high
- Goal: benchmark Codex against direct Alpha engineering workers on a fixed historical eDebatte task suite.
- Metrics: success, regression, review defects, latency, cost, human interventions.
- Acceptance:
  - repeatable corpus and scoring;
  - provider-blind result summary where practical;
  - routing recommendation based on evidence;
  - no Codex removal before this evaluation.

## Priority 3 — Memory and learning

### ALPHA2-MEMORY-LAYERS-01

- Status: proposed `blocked` on persistent ledger
- Priority: high
- Goal: implement canonical/episodic/semantic/performance memory separation.
- Acceptance:
  - raw chat history is not canonical memory;
  - semantic memory contains only promoted lessons;
  - performance memory links result to agent/model/prompt/tool version.

### ALPHA2-LESSON-PROMOTION-01

- Status: proposed `blocked` on memory layers
- Priority: high
- Goal: implement candidate lesson -> independent check -> evidence/tests -> curator -> accept/reject.
- Acceptance:
  - one agent cannot make an assertion globally true;
  - evidence attached to accepted lesson;
  - contradiction/update path exists.

### ALPHA2-EVAL-HARNESS-01

- Status: proposed `blocked` on run ledger
- Priority: high
- Goal: common evaluation harness for engineering, research/evidence, support and growth workflows.
- Acceptance:
  - versioned eval suites;
  - reproducible scoring;
  - quality/cost/latency/human-intervention metrics;
  - model/prompt promotion requires evidence.

## Priority 4 — IT support and reliability

### ALPHA2-SUPPORT-TRIAGE-01

- Status: proposed `blocked` on orchestrator
- Priority: high
- Goal: classify incoming support/product symptoms into support, known issue, bug, security, incident or product gap.
- Acceptance:
  - duplicate symptom clustering;
  - escalation thresholds;
  - reproducibility evidence;
  - no unsupported automatic user-facing claims.

### ALPHA2-INCIDENT-LOOP-01

- Status: proposed `blocked` on support triage + telemetry adapters
- Priority: high
- Goal: detect, reproduce, route and track operational incidents with recoverable child runs.
- Acceptance:
  - incident timeline;
  - automatic low-risk diagnostics;
  - engineering handoff;
  - post-incident lesson candidate.

## Priority 5 — Marketing, membership and community

### ALPHA2-CONTENT-PIPELINE-01

- Status: proposed `blocked` on orchestrator + risk gate + evidence contracts
- Priority: high
- Goal: implement signal -> research -> evidence -> red-team -> story -> asset -> QA -> scheduling queue -> analytics.
- Acceptance:
  - provenance retained from asset to evidence/context;
  - channel derivatives tracked as one campaign family;
  - new political positions/high-risk claims remain review-gated;
  - no synthetic grassroots activity.

### ALPHA2-SOCIAL-CONNECTORS-01

- Status: proposed `blocked` on content pipeline and explicit connector/provider choices
- Priority: high
- Goal: scheduling/distribution integrations so approved assets do not require manual copy/paste.
- Acceptance:
  - credentials isolated;
  - idempotent scheduling;
  - per-channel status/error feedback;
  - publication policy enforced centrally.

### ALPHA2-MEMBERSHIP-LIFECYCLE-01

- Status: proposed `blocked` on analytics schema
- Priority: high
- Goal: instrument visitor -> participant -> account -> member -> active member -> ambassador lifecycle for VoiceOpenGov.
- Acceptance:
  - privacy-respecting funnel metrics;
  - friction points measurable;
  - experiments traceable;
  - no political profiling based on sensitive traits.

### ALPHA2-COMMUNITY-LEARNING-01

- Status: proposed `blocked` on membership/support inputs
- Priority: medium
- Goal: cluster feedback, questions, recurring objections and unmet needs into product/content/member-service signals.
- Acceptance:
  - source traceability;
  - spam/abuse separation;
  - proposed insights require evidence threshold before semantic-memory promotion.

## Priority 6 — Funding and partnerships

### ALPHA2-FUNDING-PIPELINE-01

- Status: proposed `blocked` on external data/connector decisions
- Priority: high
- Goal: continuously discover and score grants, partnerships and eligible opportunities for VoiceOpenGov/eDebatte.
- Acceptance:
  - deadline and eligibility tracking;
  - conflict-of-interest fields;
  - application drafts remain reviewable;
  - no autonomous contractual or financial commitment.

### ALPHA2-PARTNER-CRM-01

- Status: proposed `blocked` on CRM/provider decision
- Priority: medium
- Goal: persistent partner/member/funding follow-up queue with controlled outreach drafts and response tracking.
- Acceptance:
  - consent/compliance fields;
  - no uncontrolled mass outreach;
  - all external actions attributable.

## Priority 7 — Vote4Gov global governance intelligence

### ALPHA2-GLOBAL-GOVERNANCE-SCANNER-01

- Status: proposed `blocked` on research runtime
- Priority: medium
- Goal: compare governance, participation and institutional structures internationally for Vote4Gov.
- Acceptance:
  - sourced comparative records;
  - uncertainty and jurisdiction/time fields;
  - no normative conclusion without explicit argument/evidence separation.

### ALPHA2-SYSTEM-CHALLENGER-01

- Status: proposed `blocked` on governance scanner + evidence model
- Priority: medium
- Goal: generate strongest alternative structures and counterarguments to current institutions and to VOG/eDebatte hypotheses themselves.
- Acceptance:
  - adversarial rather than confirmatory behavior;
  - alternatives sourced or labeled hypothetical;
  - outputs remain research input unless separately approved.

## Priority 8 — Mission Control

### ALPHA2-MISSION-CONTROL-01

- Status: proposed `blocked` on persistent ledger + core adapters
- Priority: high
- Goal: one operational UI for North-Star health, active missions, incidents, engineering, evidence, content, membership, funding, agent performance and human decisions.
- Acceptance:
  - human inbox contains only genuine decision gates;
  - no requirement to inspect raw agent chats for normal operation;
  - each card links to evidence/run history;
  - cost and concurrency visible.

## Historical first implementation wave

The original recommended first wave after OpenTasks intake was:

1. `ALPHA2-RUN-CONTRACT-01`
2. `ALPHA2-AGENT-REGISTRY-01`
3. `ALPHA2-RISK-GATE-CONTRACT-01`
4. `ALPHA2-OPENTASKS-ADAPTER-01`
5. `ALPHA2-GITHUB-STATE-ADAPTER-01`

The canonical operative head records the current outcome of these slices. This historical list creates no new implementation authorization.
