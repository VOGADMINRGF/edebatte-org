# AGENTS.md

## Purpose

This repository is operated with a documentation-first, task-driven workflow.

The single operational source of truth for implementation work is:

- `docs/E150/OpenTasks.md`

Codex and other coding agents must treat `OpenTasks.md` as the canonical work queue for implementation slices, documentation harmonization, follow-up hardening, and backlog hygiene.

---

## Core Operating Rules

### 1. OpenTasks is the SSOT
Agents must not invent their own backlog when a relevant task already exists in `docs/E150/OpenTasks.md`.

Before starting work, always:
1. read the relevant section(s) in `docs/E150/OpenTasks.md`
2. determine whether the task is:
   - `blocked`
   - `codex_ready`
   - `in_progress`
   - `review`
   - `manual_gate`
   - `done`

Only `codex_ready` tasks may start a new implementation slice without further documented authorization. `in_progress` work must reuse its existing branch/PR when one exists. `review` and `manual_gate` are not implicit implementation or merge authorization.

### 2. Never silently decide product questions
If a task touches:
- naming of core surfaces
- canonical routing rules
- role model changes
- dossier/anlassraum/governance semantics
- pricing/paywall/product packaging
- visibility/public-vs-private rules
- workflow canonization

and the decision is not already documented, the agent must:
1. stop at the decision boundary
2. leave code unchanged or keep changes local and reversible
3. ask one short targeted clarification

Do not silently “harmonize” product strategy by guessing.

### 3. Work in small slices
Default execution unit:
- 1 to 3 `codex_ready` tasks
- or one coherent PR-sized slice

Each slice should:
- have clear scope
- update code and docs together when relevant
- update `OpenTasks.md` before finishing

### 4. Documentation and code must stay aligned
If a task changes behavior, routing, surface semantics, or architectural interpretation:
- update the relevant docs in the same slice
- update `docs/E150/OpenTasks.md`
- explicitly note remaining drift if not fully resolved

### 5. Tests are mandatory when practical
For implementation tasks, agents must:
- run relevant tests for changed areas
- add or update tests when the repo already has an appropriate test pattern
- avoid inventing unnecessary new test infrastructure

### 6. Prefer existing architecture over new parallel paths
When implementing a task:
- reuse existing helpers, services, and patterns
- avoid duplicate route logic
- avoid adding a second canonical flow where one already exists
- prefer centralization of small critical logic

### 7. No hidden backlog drift
If an agent discovers drift, duplication, or unresolved adjacent work:
- do not silently absorb everything into the same slice
- finish the requested task cleanly
- add a follow-up entry to `docs/E150/OpenTasks.md`

### 7a. Canonical domain ownership and evidence integrity
`features/*` owns shared, domain and business contracts as well as the canonical
feature truth. `apps/web/src/features/*` may contain only web-specific UI,
adapters, runtime bridges and readmodels. When `features/<domain>/` exists, no
new canonical domain contract or duplicate implementation may be created under
`apps/web/src/features/<domain>/`.

Protected evidence is preserved: `*_PREFLIGHT_*.md`, `*_AUDIT_*.md`,
`*_CLOSURE_*.md`, canonical runbooks, architecture/security evidence and the
foundation canon may be corrected, extended or superseded, but not silently
replaced with a shorter summary. **SUMMARY != REPLACEMENT.** Removing required
sections requires `DOCUMENT_REWRITE_AUTHORIZED=true` together with a rationale
and a replacement or supersession reference.

### 8. Frontend language rule (verbindlich)
Für deutschsprachige Frontend-Texte gilt:
- Umlaute und ß normal schreiben (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`)
- keine Umschreibungen mit `ae`, `oe`, `ue` in UI-Texten
- technische Bezeichner, IDs und APIs bleiben davon unberührt

### 9. Canonical brand narrative (verbindlich)
Für öffentliche oder öffentlichkeitsnahe eDebatte-Texte gilt `docs/brand/EDEBATTE_BRAND_NARRATIVE.md` als kanonische Marken- und Positionierungsgrundlage.

Das betrifft insbesondere:
- Homepage und Landingpages
- Marketing und Kampagnen
- Social Media und Video
- Presse, Präsentationen und Partneransprache
- Membership- und produktnahe Erklärungstexte

Vor entsprechenden Änderungen müssen Agenten die kanonische Datei lesen und folgende Grenzen einhalten:
- keine parallele oder widersprüchliche Markenpositionierung etablieren
- die öffentliche Langfassung als drei natürliche Absätze führen, ohne sichtbare Why–How–What-Überschriften
- Stimmen, Perspektiven, Quellen, Evidenzen, Zusammenhänge und den Debattenstand in ihrer Bedeutung erhalten
- nicht behaupten, dass über Fakten oder Wahrheit abgestimmt wird
- nur tatsächlich verfügbare Produktfunktionen und Automatisierungen versprechen
- einen echten Bedeutungswechsel zuerst in der kanonischen Datei und anschließend in `docs/E150/OpenTasks.md` synchronisieren

### 10. Foundation canon (verbindlich)
Vor grundlegenden Produkt-, Architektur-, KI-, Automatisierungs-, Kommunikations-, Governance- oder Engineering-Entscheidungen müssen Agenten die relevanten Dateien unter `docs/foundation/` lesen.

Die verbindliche Reihenfolge lautet:

1. `docs/foundation/Constitution.md`
2. `docs/foundation/Vision.md`
3. `docs/foundation/Grundwerte.md`
4. `docs/foundation/Architecture-Canon.md`
5. `docs/foundation/Engineering-Canon.md`
6. `docs/brand/EDEBATTE_BRAND_NARRATIVE.md`
7. `AGENTS.md`
8. `docs/E150/OpenTasks.md`
9. Run Packs, ADRs und Implementierungen

Agenten müssen insbesondere:
- menschliche Verantwortung und Entscheidungsgrenzen erhalten
- Quellen, Evidenzen, Widersprüche und Unsicherheiten nachvollziehbar bewahren
- Original-, Lese-, Bedien- und Ausgabesprache getrennt berücksichtigen
- KI nicht als autonome Wahrheits- oder Governance-Instanz behandeln
- Automation nach Risiko, Wirkung, Policy und Konfidenz staffeln
- keine allgemeine Auto-Publish-Logik einführen
- Datenschutz, Sicherheit, Barrierefreiheit, Beobachtbarkeit und Wiederherstellung als Produktanforderungen behandeln
- bestehende Architektur erweitern, statt parallele Wahrheiten zu schaffen
- tatsächliche Produktwahrheit nicht durch visionäre Texte überzeichnen

Bei einem Konflikt gilt die höherstehende Ebene. Ein echter Bedeutungswechsel muss zuerst in den Foundation-Dokumenten beschlossen und danach in Brand Narrative, OpenTasks, ADRs, Run Packs und Implementierung synchronisiert werden.

---

## Required Task Status Meanings

The canonical operative status set is defined by the current `docs/E150/OpenTasks.md` head and is:

- `blocked` — not executable; only dependency, governance, audit, or preparatory work that does not bypass the blocker is allowed
- `codex_ready` — eligible for a task-specific preflight and, only after a positive preflight, a new implementation branch if no existing branch/PR already owns the slice
- `in_progress` — implementation is already active; reuse the existing branch/PR and do not create a duplicate
- `review` — implementation/evidence is awaiting review or a documented review gate; not implicit merge or product approval
- `manual_gate` — blocked on an explicit human, legal, credential, provider, production, device, or other manual decision/check
- `done` — acceptance criteria are backed by repository evidence and the operative task is closed

Historical/archive sections may contain older labels such as `open`, `needs_decision`, or `research_only`; they are not valid operative-head statuses unless the canonical OpenTasks status contract is explicitly changed first.

---

## Required Task Fields

Each actionable task in `docs/E150/OpenTasks.md` should contain or imply:

- `ID`
- `Status`
- `Priority`
- `Depends on`
- `Scope`
- `Goal`
- `Acceptance Criteria`
- `Decision open`
- optional: `Evidence / Notes`

---

## Execution Order

Unless explicitly instructed otherwise, agents should prioritize:

1. `codex_ready` tasks with highest product impact
2. tasks blocking other `codex_ready` tasks
3. docs/code drift that causes user-facing inconsistency
4. hardening and polish
5. backlog hygiene

---

## Branching and Commit Style

Unless the user specifies otherwise:
- create a focused branch for each slice
- keep commits logically grouped
- avoid mixing unrelated tasks into one branch

Preferred branch naming:
- `fix/<topic>`
- `pr/<task-id>-<topic>`
- `docs/<topic>`
- `hardening/<topic>`

Commit messages should be specific and task-oriented.

---

## Standard Codex Prompt (wiederverwendbar)

Arbeite ausschliesslich die naechsten 1-3 `codex_ready` Tasks aus `docs/E150/OpenTasks.md` ab.
Halte Code und Docs synchron, aktualisiere OpenTasks nach jedem erledigten Task und stoppe an
Begriffs-/Routing-/Governance-Entscheidungsgrenzen mit einer kurzen Rueckfrage.

---

## Final Response Requirements

After completing a slice, always report:

1. what was changed
2. which task IDs were advanced
3. which files were changed
4. what tests were run
5. what remains open
6. whether `OpenTasks.md` was updated

---

## Default Codex Behavior for This Repo

When asked to "work through OpenTasks" or similar, the agent should:

1. select the next 1-3 `codex_ready` tasks
2. implement them in priority order
3. keep docs and code aligned
4. update `docs/E150/OpenTasks.md`
5. stop at any real decision boundary
6. return a concise implementation summary
