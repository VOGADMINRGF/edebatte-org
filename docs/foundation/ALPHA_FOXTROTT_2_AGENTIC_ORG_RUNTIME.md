# Alpha-Foxtrott 2.0 — Agentic Organization Runtime

Status: canonical foundation architecture; production activation remains gated
Stand: 2026-09-02
Scope: eDebatte, VoiceOpenGov, Vote4Gov, Voxy and shared operations

## 1. Purpose

Alpha-Foxtrott remains the orchestration basis for the ecosystem, but it must no longer depend on one long-running chat session or on manual `go` handoffs after every slice. Alpha-Foxtrott 2.0 is a durable control plane that observes state, prioritizes work, delegates bounded jobs, verifies results, learns from validated outcomes and escalates only genuine human decision gates.

The goal is not to create one autonomous super-agent. The goal is to create a persistent organization runtime in which many specialized workers can operate in parallel under a shared canon, shared evidence model, shared memory and explicit human-sovereignty boundaries.

Alpha-Foxtrott 2.0 has two explicit operating phases. These operating phases are distinct from the delivery waves later in this document.

### Phase 1 — Build / Completion Mode

Until production readiness and the autonomous acceptance contract are proven, Alpha2's primary mission is: **finish building eDebatte**. It selects work only from the canonical operative head of `docs/E150/OpenTasks.md` and coordinates bounded engineering, architecture, review, QA, SRE, security, Voxy, research/evidence, Mission Control, observability, governance and product/UX slices. Existing review, security, budget and human gates remain authoritative.

### Phase 2 — Autonomous Operating Mode

Only after the defined production-readiness, end-to-end and recovery gates have passed may Alpha2 become the durable orchestrator of the full specialist fleet. Entering this phase is an explicit, evidenced transition; it is not inferred from the existence of runtime code, Draft PRs or green unit tests.

## 2. Operating principle

Alpha itself should do as little task execution as possible.

Its complete control loop is:

`observe -> prioritize -> claim -> delegate -> execute -> verify -> review / human gate when required -> reconcile SSOT -> learn -> continue -> observe`

Worker agents remain deliberately bounded. A worker may execute one coherent slice or 1–3 `codex_ready` tasks, but Alpha may automatically dispatch the next eligible worker when the previous slice has completed and all gates are satisfied.

This preserves small reviewable changes without requiring a human to restart the organization after every run.

After idle, process restart, worker loss, a queue/Redis loss covered by the runtime contract or completion of a task, Alpha must re-observe canonical state and answer: **what is the next permitted work?** It must never answer from chat memory alone.

## 3. Non-negotiable boundaries

Alpha-Foxtrott 2.0 must preserve the existing foundation canon and the following boundaries:

- no autonomous truth authority;
- no hidden political persuasion or synthetic grassroots activity;
- no fake users, fake supporters, fake comments or fabricated evidence;
- no general auto-publish for new political positions, consequential public claims or high-risk outputs;
- no autonomous spending, contracts, legal commitments or changes to rights without explicit authorization;
- no silent product, governance, pricing, role-model or public/private canon changes;
- every consequential action must be attributable, reversible where practical and backed by a run ledger;
- human responsibility remains final for value choices, political positioning, money, rights, high-impact publication and unresolved conflicts.

Automation may be broader for reversible, low-risk, previously authorized operations.

## 4. Scope of the organization

### Product mission alignment

The public product is citizen-first and Voxy-first. A person should be able to begin with a low-threshold concern, question, observation, proposal, position or source. Existing Place/Registry/Jurisdiction, Signal, Anlassraum, Dossier, Runde, Mandat and Impact contracts remain the domain truth behind that simple interaction.

Voxy is the primary visible AI interface for normal users. It keeps permitted context, asks only necessary clarifying questions, explains evidence and delegates internally. Alpha2 is not a public conversational persona, and normal users do not select or orchestrate specialist agents. Agent selection remains visible only on explicit admin, operator, debug, governance and Mission Control surfaces.

Alpha-Foxtrott 2.0 is not only an engineering orchestrator. It is the common operating layer for:

### eDebatte

- product development;
- engineering;
- QA and visual QA;
- evidence and source workflows;
- dossier preparation;
- support and incident response;
- security and reliability;
- analytics and product learning.

### VoiceOpenGov

- membership funnel and onboarding;
- community analysis;
- campaign preparation;
- social content production and distribution queues;
- partner and funding pipeline;
- CRM and member-support workflows;
- conversion, retention and engagement analytics.

### Vote4Gov

- comparative governance research;
- discovery of institutional patterns and structural alternatives;
- global democracy and civic-tech monitoring;
- adversarial system analysis and evidence-backed hypotheses.

### Voxy

- briefing generation;
- script preparation;
- multilingual preparation;
- voice/video rendering pipelines;
- channel adaptation;
- visual/audio QA;
- publication preparation subject to the applicable review gate.

## 5. Agent fleet

The runtime may contain more than five agents. Agent count is not the optimization target. Clear ownership, bounded permissions and measurable performance are.

Initial capability groups:

### Control and critique

- `alpha-orchestrator`: mission state, priorities, budgets, dependencies and escalation;
- `chief-critic`: challenges priorities, plans and self-confirming conclusions;
- `knowledge-curator`: promotes only validated lessons into shared memory;
- `risk-governor`: classifies action risk and enforces human/automatic gates.

### Product and engineering

- `product-agent`: user journeys, product gaps, acceptance logic and instrumentation needs;
- `engineering-agent`: implementation, refactoring and repository changes;
- `review-agent`: independent code/design review;
- `qa-agent`: tests, regression checks, accessibility and contract verification;
- `visual-qa-agent`: responsive/UI/video screenshot review and CI consistency;
- `sre-support-agent`: logs, uptime, incidents, support triage and reproducibility;
- `security-agent`: dependency, secret, permission and abuse review.

### Evidence and democratic intelligence

- `research-agent`: primary research and source acquisition;
- `evidence-agent`: claim/source/uncertainty structuring;
- `dossier-agent`: dossier and participation-format preparation;
- `neutrality-red-team`: political symmetry, suggestiveness and omission checks;
- `global-governance-agent`: international institutional comparison for Vote4Gov;
- `system-challenger`: strongest counter-models and structural alternatives.

### Growth, community and funding

- `growth-agent`: funnel, experiments, conversion and acquisition efficiency;
- `membership-agent`: membership onboarding, activation, retention and lifecycle;
- `community-agent`: feedback clustering, FAQs, sentiment signals and unmet needs;
- `funding-agent`: grants, partners, application pipeline and opportunity scoring;
- `analytics-agent`: impact, experiment and organizational performance measurement.

### Media and distribution

- `editorial-agent`: story selection and content decomposition;
- `voxy-agent`: briefing/script/voice/video preparation;
- `distribution-agent`: platform adaptation, scheduling queues and output handoff;
- `brand-trust-agent`: brand canon, evidence wording and external-risk checks.

Agents are logical roles. Multiple roles may use the same model or process. A role is only instantiated when needed.

The seven civic roles in `docs/E150/V3_AGENTIC_RUNTIME_MANIFEST_2026-07-13.md` remain the canonical public-workflow capability grouping. The broader Alpha2 organization registry refines internal ownership for engineering and operations; it does not replace those civic roles or create a second user-facing agent model.

Research is a multi-stage evidence pipeline, not a generic web-search action:

`question / claim -> discovery -> source retrieval -> source quality -> primary-source preference -> cross-check -> contradiction detection -> evidence mapping -> fact check -> synthesis -> citation / provenance`

Each stage preserves retrieval time, jurisdiction, language, source family, uncertainty and provenance where relevant. Independent sources and primary sources are preferred where available and lawful. Contradictions and access limits remain visible. "Search the whole web" means broad, policy-compliant discovery within legal, technical, licensing, cost and access boundaries; it never authorizes bypassing them or inventing completeness.

## 6. Durable execution

A run must not depend on a chat staying open.

Each job must have persistent state containing at minimum:

- `run_id`;
- `mission_id`;
- `parent_run_id`;
- `task_id` or external trigger;
- agent role and model version;
- input snapshot and canonical-context references;
- tool permissions;
- risk level;
- budget and timeout policy;
- current state/checkpoint;
- artifacts and evidence;
- tests/evaluations;
- critic/reviewer results;
- cost and latency;
- lessons proposed;
- next actions;
- human-gate state.

A worker can fail, time out or restart without losing the mission. The runtime resumes from persisted state or explicitly marks the run failed and dispatches a recovery path.

## 7. Canonical memory model

Agent chat history is not canonical memory.

Four memory classes are required:

### Canonical memory

Foundation documents, brand canon, architecture, `AGENTS.md`, `OpenTasks.md`, accepted ADRs and explicit decisions. This is the highest operational truth available to agents.

### Episodic memory

What happened in previous runs: attempts, failures, fixes, test results, incidents and outcomes.

### Semantic memory

Validated reusable lessons distilled from episodes. A lesson is not promoted merely because one agent asserted it.

### Performance memory

Empirical performance of agent/model/prompt/tool combinations by task type: completion rate, reviewer defects, regressions, cost, latency and human interventions.

## 8. Learning contract

Agents must not directly teach each other by writing unverified assertions into shared memory.

The promotion path is:

`candidate lesson -> independent check -> evidence/tests -> knowledge curator -> accepted/rejected -> shared semantic memory`

Rejected lessons remain traceable but must not become operational truth.

## 9. Evaluation and routing

The system must maintain repeatable evaluation suites for major capability groups, including historical real tasks where possible.

At minimum evaluate:

- task success;
- regression rate;
- reviewer defect rate;
- evidence fidelity;
- policy/canon compliance;
- latency;
- token/compute cost;
- required human interventions.

Model choice is empirical, not ideological. OpenAI models are the default preferred reasoning layer, but Alpha may benchmark Codex, direct GPT/Responses workers, open-weight models and optional external models. A tool or model remains in the fleet only while it adds measurable value.

Codex is therefore optional infrastructure, not a canonical dependency. Engineering must be expressible through the common agent/job contract so that Codex can be retained, reduced or replaced based on evaluations.

## 10. Marketing and social operating loop

Marketing is a first-class Alpha mission, not a manual downstream task.

The default pipeline is:

`signal -> research -> evidence -> red team -> dossier/context -> story -> asset generation -> visual/brand/trust QA -> channel adaptation -> review/scheduling gate -> analytics -> learning`

One strong source-backed topic may generate multiple assets for Instagram, TikTok, YouTube, Facebook, LinkedIn, web and Voxy, but every derivative must retain provenance back to the underlying evidence/context.

No agent may simulate supporters or use deceptive political microtargeting. Synthetic personas may be used only as clearly internal simulations for UX/policy testing.

## 11. Membership operating loop

VoiceOpenGov membership is a measurable lifecycle:

`visitor -> participant -> account -> member -> active member -> ambassador`

The membership/growth agents must identify friction between stages, propose experiments and measure actual outcomes. The system should optimize for durable participation and trust, not vanity metrics alone.

## 12. IT support and incident loop

The runtime should ingest product/support/observability signals and classify them into:

- support question;
- known issue;
- reproducible bug;
- security concern;
- infrastructure incident;
- product gap.

Repeated support symptoms may be promoted into a product or incident priority. Low-risk support replies can be drafted or automatically sent only where an explicit approved policy permits it. Engineering fixes still pass repository tests and risk gates.

## 13. Human sovereignty gate

Alpha should minimize human interruptions, not remove accountability.

The default human inbox should contain only decisions that cannot be resolved safely from existing canon and permissions, such as:

- new political position or high-impact public claim;
- unresolved governance/product decision;
- expenditure or contractual commitment beyond an approved budget policy;
- rights/permissions changes;
- high-risk publication;
- legal/compliance ambiguity;
- destructive or difficult-to-reverse infrastructure action;
- conflict between foundation documents.

Every escalation should present: decision required, evidence, alternatives, recommendation, risk and consequence of no decision.

## 14. Mission Control

The human interface should summarize organization state rather than expose raw agent chats.

Minimum views:

- North-Star health;
- active/blocked/completed missions;
- engineering/product readiness;
- incidents/support;
- evidence/research queue;
- content/social queue;
- membership funnel;
- funding pipeline;
- cost/budget;
- agent/model performance;
- human decision inbox.

## 15. Delivery sequence inside the phase transition

The following delivery waves do not redefine the two operating phases. All of them remain in Phase 1 until the Phase-2 acceptance gate in section 16 is met.

### Phase 0 — canon and contracts

1. Canonize Alpha 2.0 architecture and its relationship to existing `AGENTS.md`/OpenTasks.
2. Define the job/run schema, risk classes, gate contract and agent registry.
3. Define the memory promotion and evaluation contracts.

### Phase 1 — durable engineering loop

1. persistent orchestrator/runtime;
2. GitHub/OpenTasks ingestion;
3. bounded engineering/review/QA workers;
4. run ledger and resumable checkpoints;
5. automatic continuation across eligible small slices;
6. human escalation only at real gates.

### Phase 2 — operations and support

1. telemetry/incident ingestion;
2. SRE/support triage;
3. product/bug escalation;
4. recovery and incident evidence.

### Phase 3 — growth and membership

1. content and campaign pipeline;
2. membership lifecycle instrumentation;
3. community feedback loop;
4. analytics and experiments;
5. social scheduling integrations behind review/risk policies.

### Phase 4 — funding and external operations

1. grant/partner pipeline;
2. CRM and follow-up workflows;
3. opportunity scoring;
4. controlled external communications.

### Phase 5 — shared learning and model router

1. reusable evaluation suites;
2. agent performance memory;
3. model/prompt routing;
4. controlled introduction of open-weight/local workers;
5. training corpus derived only from reviewed, rights-compatible runs.

## 16. Success criteria

Alpha-Foxtrott 2.0 is successful when:

- work continues safely after a chat ends;
- no human `go` is needed between ordinary eligible worker slices;
- agent runs share validated organizational memory rather than chat recollection;
- engineering, support, marketing, membership and research use the same durable control plane;
- human attention is concentrated on genuine decisions;
- agent/model quality is measured through repeatable evaluations;
- all public/evidentiary work preserves provenance and review boundaries;
- the system can operate for at least 48 hours without human prompting while continuing authorized low-risk work and surfacing a concise human decision inbox.

### Phase-2 acceptance gate

"Alpha2 operates autonomously" may be claimed only when one reproducible end-to-end test proves this entire chain against exact state:

`read OpenTasks -> read GitHub state -> select permitted task -> atomically claim -> persist run -> select specialist -> check risk/budget/policy -> dispatch -> execute -> create tests/evidence -> verify exact-head CI/review -> reconcile OpenTasks -> continue or persist review/human_gate`

The same acceptance program must then terminate a worker during a run, restart the relevant runtime, exercise queue/Redis recovery as defined by the storage decision, prove that no duplicate side effects occur, resume the run correctly and show that Alpha2 subsequently finds the next permitted work on its own.

Merge, deploy, publish, spending, contracts, rights, secrets and other high-risk actions remain subject to their existing policy and human gates. Autonomy is durable policy-bound continuation, not unrestricted authority.

### Remaining critical autonomy path

The remaining path must converge existing components in this order:

1. central GitHub state adapter;
2. controlled transactional OpenTasks single writer;
3. durable Alpha2 orchestrator loop;
4. convergence of the existing continuous-dispatch stack;
5. convergence of the existing bounded repair/self-healing stack;
6. production-capable Mission Control and observability linkage;
7. end-to-end autonomous operating and recovery acceptance.

No step reimplements the durable Mongo ledger, BullMQ/Redis execution layer, lease/fencing/idempotency contract, existing agent-fleet work, learning/eval work, Mission Control work, continuous dispatch or bounded repair work.

## 17. Immediate architectural decision

The first implementation target is not a broad replacement of every existing tool.

Build a model-agnostic durable Alpha control plane first. Keep Codex available as one engineering worker until direct Alpha engineering workers are benchmarked against the same historical task suite. Remove or reduce Codex only when measured performance supports that decision.

This avoids replacing one dependency with another before the organization runtime itself exists.
