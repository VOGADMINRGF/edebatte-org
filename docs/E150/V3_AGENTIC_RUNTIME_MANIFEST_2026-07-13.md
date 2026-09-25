# V3 Agentic Runtime Manifest

Status: canonical architecture manifest
Date: 2026-07-13
Scope: review-first agent activation for eDebatte

## Reconciliation 2026-09-02 — Voxy-First und Alpha2

Die sieben Rollen dieses Manifests bleiben die kanonische fachliche Gruppierung des öffentlichen Civic-Workflows. Die breitere Alpha2-Organisationsflotte ergänzt spezialisierte interne Verantwortlichkeiten für Engineering, Architecture, Review, QA, SRE, Security, Research, Source Discovery, Evidence, Fact Checking, Dossier/Synthesis, Legal/Compliance, Moderation, Growth/Marketing, Membership/Community und Funding. Sie ersetzt weder diese sieben Rollen noch erzeugt sie einen zweiten öffentlichen Agentenkosmos.

Für normale Nutzer gilt **Voxy-First**:

- Voxy ist langfristig die primäre sichtbare KI-Schnittstelle;
- Voxy versteht die Absicht, hält nur erlaubten Kontext und erklärt Ergebnisse, Quellen, Evidenz und Unsicherheit verständlich;
- Voxy stellt nur Rückfragen, deren Antwort den nächsten fachlichen Schritt verändert;
- Voxy delegiert intern an geeignete spezialisierte Rollen;
- Nutzer müssen interne Agenten weder auswählen noch steuern oder verstehen;
- Agenten-, Provider- und Routingdetails bleiben auf ausdrücklich vorgesehene Admin-, Operator-, Debug-, Governance- und Mission-Control-Flächen begrenzt.

Voxy ist nicht Alpha2: Voxy ist die sichtbare Interaktions- und Erklärungsschicht; Alpha2 ist der organisationsweite, policy-gebundene Control-/Orchestration-Layer. Beide verwenden dieselbe kanonische Core-, Evidence-, OpenTasks- und Runtime-Wahrheit.

## Product decision

eDebatte adopts a seven-role agent model on top of the existing V3 contracts, artifacts, graph, review queue, access model and no-auto-publish guardrails.

This is not a second architecture. Existing dossier, claims, factcheck, source, review, language bridge, participation, organization and handoff structures remain the canonical product truth.

The Lean Continuous Slice Runner remains the only autonomous implementation runner. It loads the role registry, selects one coherent product cluster and may emulate or implement the relevant roles inside that cluster. It must not launch uncontrolled parallel agents, duplicate stores or bypass review gates.

## Agent roles

### 1. Personal Voxy — dialogue, relevance and civic journey

Purpose:
- accompany the user from onboarding through recurring participation;
- understand explicit interests, regions, preferred participation formats, desired explanation depth and openness to controversy;
- surface regional, national, European and international topic connections;
- explain why a topic or reference is relevant;
- show realistic individual actions and institutional responsibility paths.

Hard boundaries:
- no voting on behalf of the user;
- no hidden political-label classification;
- no persuasion toward a political outcome;
- no sale or external disclosure of personal participation profiles;
- user-visible, editable and deletable memory only;
- personalization may change language, depth, ordering and relevance explanation, but never suppress material facts, sources or strong counterarguments.

### 2. Intake & Format Agent

Purpose:
- understand the contribution, occasion, location, affected groups and desired outcome;
- determine whether the input belongs to an existing topic, dossier or participation room;
- recommend the appropriate participation format only after the user input is understood.

Artifacts:
- occasion candidate;
- topic assignment;
- geographic scope;
- affected-group candidates;
- participation-format recommendation;
- open questions.

### 3. Research & Source Agent

Purpose:
- collect authoritative and contextual sources;
- preserve original source, retrieval time, issuer, jurisdiction, language and licensing metadata;
- create source packs and international reference candidates.

Hard boundaries:
- translation is reading support, not evidence;
- no source may be represented as authoritative without provenance;
- international examples require transferability analysis.

This role owns discovery, retrieval and source-quality preparation inside the shared research pipeline. It does not own final evidence grading, fact-check decisions or synthesis approval.

### 4. Claims & Factcheck Agent

Purpose:
- extract claims, arguments, counterarguments, assumptions and disputed relationships;
- connect claims to supporting, contradicting or qualifying evidence;
- mark confidence and factcheck need.

Artifacts:
- claim candidates;
- argument map;
- evidence links;
- contradiction links;
- factcheck requests;
- uncertainty and stale-source flags.

Together with the Research & Source, Evidence and Dossier/Synthesis capabilities, the target pipeline is:

`question / claim -> discovery -> source retrieval -> source quality -> primary-source preference -> cross-check -> contradiction detection -> evidence mapping -> fact check -> synthesis -> citation / provenance`

The pipeline prefers primary and independent sources where available, preserves contradictions and uncertainty, binds claims to evidence machine-readably and never treats an agent run, translation or unsupported synthesis as a source.

### 5. Participation & Moderation Agent

Purpose:
- recommend and operate the review-first participation structure;
- cluster duplicate contributions;
- preserve minority and affected-group perspectives;
- identify missing voices, manipulation risks and unresolved conflicts.

Hard boundaries:
- no automatic removal of lawful positions;
- no artificial consensus;
- no ranking solely by engagement;
- moderation actions remain reviewable and appealable.

### 6. Dossier & Briefing Agent

Purpose:
- create the understandable Debattenstand;
- build cause, effect, affected-group, argument, source and responsibility branches;
- create transferability trees for international references;
- produce public summaries, institutional handoffs and later Voxy briefing candidates.

Canonical transferability structure:
- what works elsewhere;
- why it works there;
- what differs locally;
- what currently blocks transfer;
- what legal, institutional, financial, technical or social prerequisites are required;
- which actor is responsible;
- what can be piloted now;
- what evaluation gate enables scaling.

### 7. Governance & Compliance Agent

Purpose:
- enforce roles, consent, data minimization, provenance, review and publication boundaries;
- verify that each agent action is inside its tool and data permissions;
- ensure that public reading, institutional handling and paid professional services remain separate.

Hard boundaries:
- no autonomous publication;
- no autonomous external notification;
- no external API, paid provider, secret, production-data access or entitlement change without an explicitly released task;
- official or institutional handoff requires conscious approval.

## Orchestrator model

The orchestrator is not an eighth content agent. It is deterministic coordination infrastructure.

Responsibilities:
- load `.codex/agents/registry.json`;
- map the selected `codex_ready` task to one primary role and optional supporting roles;
- enforce dependencies, gates and stop conditions;
- persist agent-run and artifact provenance once runtime slices exist;
- expose a user-safe trace without private chain-of-thought;
- keep one canonical artifact graph.

## Shared civic graph

All roles work on one graph and existing Dossier structures. No agent-specific parallel graph is permitted.

Required node families:
- occasion;
- affected_group;
- cause;
- effect;
- claim;
- argument;
- evidence;
- open_question;
- measure;
- alternative;
- region;
- jurisdiction;
- international_reference;
- success_factor;
- transfer_barrier;
- required_change;
- responsible_actor;
- pilot_option;
- evaluation_gate;
- participation_option;
- individual_action.

Required relationship families:
- affects;
- causes;
- contributes_to;
- may_cause;
- supports;
- contradicts;
- qualifies;
- depends_on;
- works_because;
- differs_from;
- blocked_by;
- requires;
- responsibility_of;
- can_start_as;
- must_be_evaluated_before;
- can_scale_to;
- enables_participation;
- enables_action.

Each causal, transfer or responsibility edge must carry:
- confidence;
- evidence references;
- short public explanation;
- review state;
- geographic and jurisdictional scope where relevant.

## Municipal handoff and commercial boundary

Publicly released Debattenstände remain readable without an institutional contract.

A verified public authority may receive a controlled trial allowance for three Debattenstand adoptions into its internal eDebatte administration cockpit. A trial adoption may include:
- internal assignment to a responsible unit;
- processing status;
- internal note;
- public receipt acknowledgement;
- simple response channel.

After three trial adoptions:
- all public Debattenstände remain readable;
- professional internal adoption, routing, reports, team workflows and response loops require a pilot, single-case or municipal operating package;
- no personal vote, raw participation profile or political preference is sold.

No authority is notified or provisioned automatically. Recipient resolution, approval and notification remain separate review-first steps.

## Personal Voxy profile

Profile settings must be available in onboarding and the user profile:
- regions and political levels;
- topic interests;
- preferred participation formats;
- preferred explanation depth and reading time;
- language and accessibility preferences;
- openness to counterarguments and controversy;
- interest in international references;
- permission to infer topic-specific positions;
- permission to suggest topic connections;
- notification channel and frequency;
- memory review, correction, deletion and full reset.

Every inferred item must expose:
- what Voxy inferred;
- why it inferred it;
- confidence;
- source activity;
- confirm, correct, do-not-remember and delete actions.

## Runtime activation order

The Lean Continuous Slice Runner should implement these clusters in order when present as eligible `codex_ready` tasks:

1. Agent registry and runner bootstrap contracts.
2. Personal Voxy profile, consent and onboarding settings.
3. Agent run, artifact and safe-trace contracts.
4. Intake & Format real E2E slice.
5. Research/source provenance and international transferability.
6. Claims/factcheck graph integration.
7. Dossier cause-effect-responsibility-transfer graph UI.
8. Participation/moderation role runtime.
9. Municipal handoff, verified recipient and three-adoption trial entitlement.
10. Full create → review → dossier → participation → Debattenstand → authority-response pilot.

## Definition of ready

The architecture is only runtime-ready when:
- the registry is validated;
- every active role has explicit tools, inputs, outputs and denied actions;
- one end-to-end test fixture completes through review without fake runtime truth;
- safe trace is visible on relevant surfaces;
- personal memory is consented and editable;
- municipal handoff cannot notify or provision without approval;
- public reading is not paywalled;
- no-auto-publish remains enforced.
