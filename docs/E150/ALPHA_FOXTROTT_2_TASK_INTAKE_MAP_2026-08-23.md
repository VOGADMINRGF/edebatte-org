# Alpha-Foxtrott 2.0 — Task Intake Map

Stand: 2026-08-23
Status: intake scaffold for `docs/E150/OpenTasks.md`

> Reconciliation 2026-09-02: This scaffold is historical mapping evidence. The operative Alpha2 queue, including the GitHub state adapter, transactional OpenTasks single writer, orchestrator loop and autonomous E2E/recovery acceptance, now lives exclusively in the canonical head of `docs/E150/OpenTasks.md`. Current architecture is summarized in `docs/E150/E150_CITIZEN_VOXY_ALPHA2_TARGET_ARCHITECTURE_2026-09-02.md`.

## Purpose

This document is a temporary mapping aid for Issue #632 and Draft-PR #631. It is not an operational task source of truth. `docs/E150/OpenTasks.md` remains canonical.

The repository audit shows that Alpha-Foxtrott 2.0 must **extend the existing V3 agentic integration layer instead of creating a second agent framework**.

Relevant existing building blocks already present on `main` include:

- `.codex/agents/registry.yaml`
- `.codex/prompts/lean-continuous-slice-runner.md`
- `docs/E150/V3_AGENT_REGISTRY_RUNNER_BOOTSTRAP_2026-07-13.md`
- `docs/E150/V3_AGENTIC_RUNTIME_MANIFEST_2026-07-13.md`
- `docs/E150/V3_AGENT_RUN_ARTIFACT_SAFE_TRACE_CONTRACT_2026-07-13.md`
- `scripts/codex/read-agent-registry.mjs`
- `scripts/codex/converge-agentic-metadata.mjs`
- `scripts/codex/validate-agentic-convergence.mjs`
- `.github/workflows/agentic-metadata-check.yml`

The existing layer already provides bounded worker slices, a machine-readable registry, continuous-slice instructions, metadata convergence and safe job/scenario/artifact trace contracts. What it does **not yet provide as a complete system** is a durable always-on control plane independent of a chat/process lifetime, persistent resumable mission state, shared validated memory, organization-wide model/eval routing, or the broader marketing/membership/support/funding operating loops.

## Intake decisions after first repository audit

| Alpha 2 candidate | Existing foundation | Intake decision | Delta still required |
| --- | --- | --- | --- |
| `ALPHA2-RUN-CONTRACT-01` | `V3-AGENT-RUN-ARTIFACT-SAFE-TRACE-CONTRACT-01` / safe job-scenario-artifact contract | **extend** | Add durable lifecycle/checkpoint/parent-child/budget/risk/human-gate semantics without replacing existing safe trace IDs/artifacts. |
| `ALPHA2-AGENT-REGISTRY-01` | `V3-AGENT-REGISTRY-RUNNER-BOOTSTRAP-01`, `.codex/agents/registry.yaml` | **extend** | Preserve registry; add organization-wide logical roles, provider/model indirection, capability/risk/eval metadata and non-engineering domains. |
| `ALPHA2-RISK-GATE-CONTRACT-01` | `AGENTS.md`, completion/readiness and auto-prepare guardrails | **extend** | Central machine-readable action-risk classification for automatic/review/human-only actions across engineering and external operations. |
| `ALPHA2-OPENTASKS-ADAPTER-01` | registry bootstrap + metadata convergence/validation scripts | **extend** | Reuse existing extraction/convergence logic; expose explainable task eligibility/ownership to durable Alpha rather than create a second backlog parser. |
| `ALPHA2-GITHUB-STATE-ADAPTER-01` | existing runner preflight/branch/PR awareness | **audit then extend/new** | Need one structured reusable state adapter for branch/PR/CI/review/exact-head evidence; do not duplicate existing helpers if already present elsewhere. |
| `ALPHA2-PERSISTENT-RUN-LEDGER-01` | safe trace artifacts only | **new** | Persistent mission/run state surviving chat/process termination, idempotent resume/recovery, costs/outcomes and child-run graph. |
| `ALPHA2-ORCHESTRATOR-LOOP-01` | `.codex/prompts/lean-continuous-slice-runner.md` + registry runner bootstrap | **extend** | Preserve bounded 1–3-task worker policy; move continuation into durable runtime so the next eligible slice starts without a human `go`. |
| `ALPHA2-DIRECT-ENGINEERING-WORKER-01` | existing Codex/runner execution paths | **new adapter/worker** | Implement provider-agnostic engineering job contract so direct GPT, Codex and later OSS workers can compete under the same interface. |
| `ALPHA2-INDEPENDENT-REVIEW-WORKER-01` | existing review/preflight conventions | **extend/new role** | Independent run identity, structured findings and non-self-approval; reuse current review contracts where possible. |
| `ALPHA2-CODEX-VS-DIRECT-EVAL-01` | no equivalent decision benchmark found in first audit | **new** | Historical task suite comparing success, regression, review defects, latency, cost and human intervention before reducing/removing Codex. |
| `ALPHA2-MEMORY-LAYERS-01` | docs/trace evidence, but no complete validated shared-memory layer found | **new** | Separate canonical, episodic, semantic and performance memory; raw chat is never canonical. |
| `ALPHA2-LESSON-PROMOTION-01` | no complete equivalent found | **new** | Candidate lesson -> independent check -> evidence/tests -> curator -> accept/reject. |
| `ALPHA2-EVAL-HARNESS-01` | `V3-AGENT-RUN-ARTIFACT-SAFE-TRACE-CONTRACT-01` deep-eval scaffolding | **extend** | Convert safe trace/deep-eval artifacts into repeatable versioned cross-agent/model evaluation suites. |
| `ALPHA2-SUPPORT-TRIAGE-01` | no organization-wide equivalent found in first audit | **new** | Support/bug/security/incident/product-gap classification and clustering. |
| `ALPHA2-INCIDENT-LOOP-01` | existing CI/ops evidence only | **new/extend observability** | Durable incident timeline, automated low-risk diagnostics, engineering handoff and post-incident lesson candidate. |
| `ALPHA2-CONTENT-PIPELINE-01` | existing brand/evidence/Voxy guardrails and downstream preparation work | **extend into organization workflow** | End-to-end signal->research->evidence->red-team->asset->QA->schedule queue->analytics with provenance. |
| `ALPHA2-SOCIAL-CONNECTORS-01` | no approved unified distribution runtime found in first audit | **new behind policy gate** | Remove manual copy/paste through idempotent approved scheduling/connectors without introducing general auto-publish. |
| `ALPHA2-MEMBERSHIP-LIFECYCLE-01` | VoiceOpenGov membership/product work exists, but no Alpha-wide lifecycle agent loop identified | **audit then extend** | Instrument visitor->participant->account->member->active member->ambassador and feed measured friction into Growth/Product. |
| `ALPHA2-COMMUNITY-LEARNING-01` | fragmented feedback/support paths | **new/extend** | Traceable clustering of feedback/questions/objections into product/content/member signals. |
| `ALPHA2-FUNDING-PIPELINE-01` | no durable Alpha funding pipeline found | **new** | Grants/partners discovery, eligibility/deadline/conflict scoring and reviewable application preparation. |
| `ALPHA2-PARTNER-CRM-01` | existing communication work may overlap | **audit then extend/new** | Controlled consent-aware follow-up and response state; no autonomous mass outreach. |
| `ALPHA2-GLOBAL-GOVERNANCE-SCANNER-01` | Vote4Gov content/research structures, no durable scanner identified | **new/extend** | Source-backed comparative governance records with jurisdiction/time/uncertainty fields. |
| `ALPHA2-SYSTEM-CHALLENGER-01` | no dedicated adversarial institutional research role found | **new** | Systematically challenge current structures and VOG/eDebatte hypotheses rather than confirm them. |
| `ALPHA2-MISSION-CONTROL-01` | current docs/queues/PR state are distributed | **new UI/read model** | Unified operational view and human decision inbox backed by the durable run ledger. |

## Important architectural correction

The first backlog draft described `ALPHA2-RUN-CONTRACT-01` and `ALPHA2-AGENT-REGISTRY-01` as if they started from zero. The repository audit disproves that assumption.

Therefore the implementation must follow these rules:

1. **No second registry.** Extend `.codex/agents/registry.yaml` or its canonical successor.
2. **No second runner canon.** The durable orchestrator wraps/extends the behavioral guarantees from `.codex/prompts/lean-continuous-slice-runner.md` rather than replacing them with a competing instruction set.
3. **No second trace identity model.** Extend the existing safe job/scenario/artifact trace contract into durable mission/run lifecycle semantics.
4. **No second OpenTasks truth.** Reuse the current metadata convergence/extraction path and keep `docs/E150/OpenTasks.md` as the only operational backlog SSOT.
5. **Preserve completed evidence.** Existing V3 bootstrap/manifest/trace work remains valid foundation and must not be reopened merely to rename it ALPHA2.

## Refined first implementation wave

After Issue #632 completes the OpenTasks intake, the recommended first executable wave is now:

1. **Extend existing safe trace into a durable Alpha run lifecycle contract** — lifecycle/checkpoints/parent-child/risk/budget/human gate while preserving current identifiers and artifact safety.
2. **Extend existing agent registry** — provider/model-indirection, organization domains, capability/risk/eval metadata; no replacement registry.
3. **Centralize the risk/action gate** — derive machine-readable automatic/review/human-only policy from existing foundation and readiness guardrails.
4. **Expose existing OpenTasks/registry convergence as an Alpha eligibility adapter** — no duplicate parser.
5. **Audit and then centralize GitHub state evidence** — branch/PR/CI/review/exact-head.
6. **Only then implement the persistent run ledger and durable orchestrator runtime.**

The missing step that actually solves the user's current pain is therefore **not another prompt**. It is the persistent run ledger + durable orchestrator built on top of the already-working bounded registry/runner contracts.

## Remaining targeted audit

Before editing the operative OpenTasks head, continue targeted mapping for:

- existing membership lifecycle tasks;
- existing social scheduling/publish connector tasks;
- existing support/SRE/incident tasks;
- existing funding/CRM tasks;
- existing GitHub exact-head/CI evidence helpers;
- existing Voxy distribution/publish handoffs.

For each relevant existing task record:

1. capture existing task ID and state;
2. record existing owner branch/PR if any;
3. compare acceptance criteria against the ALPHA2 candidate;
4. prefer reuse/extension over duplicate task creation;
5. mark supersession only when the new foundation architecture genuinely changes the contract;
6. preserve completed evidence instead of reopening solved work.

## Completion rule

This map is complete only when every proposed Alpha 2 capability has one of:

- `reuse <existing-id>`;
- `extend <existing-id>`;
- `new`;
- `drop`.

Only `new` and explicitly `extend` entries should result in OpenTasks edits.
