# GOVERNANCE-SSOT-SYNC-05 — Reconciliation Evidence · 2026-08-19

## Zweck

Diese Datei dokumentiert ausschließlich die belegte Reconciliation-Wahrheit für Issue #447. Sie ist kein zweiter Backlog und keine Implementierungsfreigabe. Die operative SSOT bleibt `docs/E150/OpenTasks.md`.

## Aktuelle Basis

- `main`: `22f1b11b869f220e2412d6b5900ec121201525b7` (`docs(e150): bootstrap governance ssot sync 05 (#625)`).
- `GOVERNANCE-SSOT-SYNC-05` ist auf `main` als `codex_ready` vorhanden; der taskbezogene Preflight wurde vom Betreiber auf sauberem `main` mit `executable: true` und `branchCreationAllowed: true` nachgewiesen.
- Arbeitsbranch: `docs/governance-ssot-sync-05`.
- Keine Runtime-, Produkt-, DB-, Provider-, Publish- oder Production-Änderung in diesem Slice.
- Reservierte Voxy-PRs #588/#589/#590 und Issues #583/#584/#580/#569/#567/#568/#570/#578/#579 bleiben vollständig unberührt.

## Belegte Statuskorrekturen im operativen Kopf

Folgende Änderungen sind durch bereits gemergte PRs bzw. aktuelle Draft-Evidence gedeckt und sollen im eigentlichen `OpenTasks.md`-Patch verlustfrei synchronisiert werden:

- `GOVERNANCE-SSOT-SYNC-04` → `done` (PR #415 gemergt).
- `DRAFTS-LEGACY-SSOT-ALIGN-01` → `done` (PR #418 gemergt; operative Kopfzeile ist bereits `done`, historische Dublette bleibt Archiv).
- `CREATE-DEBATTENSTAND-01` → `done` (PR #417 gemergt; operative Kopfzeile ist noch `review`).
- `LIVE-PRODUCT-CONTRACT-01` → `done` (PR #419 gemergt; bereits korrekt).
- `PRIVACY-SNIPPET-02` → `done` (PR #422 inklusive dokumentierter Browser-Evidence).
- `ADMIN-ACCOUNT-LIFECYCLE-01` → `done` (PR #423; QA-Hard-Delete bleibt separat fail-closed).
- `I18N-SURFACE-COVERAGE-02` → `done` (PR #420; bereits korrekt).
- `I18N-PREFERENCE-SEPARATION-03` → `done` (PR #427; operative Kopfzeile ist noch `review`).
- `SEO-PUBLIC-DISCOVERY-03` → `done` (PR #436).
- `AI-RUNTIME-POLICY-01` bleibt `manual_gate`; PR #431 ist technische Evidence, aber reale Modelle/Budgets/Datenschutz-/Retention-/Preview-/Production-Gates sind nicht automatisch erledigt.
- `AI-ACT-ARTICLE-50-TRANSPARENCY-01` → `review`; PR #561 ist weiterhin Draft mit Legal-/Produkt-/Accessibility-/Geräte-Gates und darf nicht als `codex_ready` gelten.

## Neue operative Wahrheit, die aufgenommen werden muss

- `SHARED-CONVERSATION-INVENTORY-01` = `done` nach Merge von PR #606; Parent bleibt #604.
- `SHARED-CONVERSATION-CONTRACT-01` besitzt über PR #608 bereits Run-Pack-Evidence auf `main`; kein Runtime-Branch vor korrekter Serialisierung und positivem taskbezogenen Preflight.
- `ECOSYSTEM-PUBLIC-EXPERIENCE-CANON-01` / Issue #619 ist Audit-/Preparatory-Governance und ausdrücklich keine blinde Runtime-Freigabe. Der Freeze-Vertrag auf `main` bleibt maßgeblich.
- `SOCIAL-PUBLIC-BALLOT-ATTRIBUTION-01` / PR #614 = `review` / Draft; keine Folgefreigabe aus altem Exact-Head ableiten.
- `MAIL-VISUAL-DESIGN-POLISH-02` / Issue #618 ist P1 und darf erst nach kanonischer Serialisierung plus taskbezogenem Preflight einen einzelnen Follow-up-Slice starten.
- `SECURITY-ASSURANCE-CIVIC-BALLOT-01` / Issue #622 ist P0-Intake; keine Big-Bang-Security-Runtime. Konkrete Folge-Slices werden aus belegten Lücken serialisiert: zuerst Credential-SSOT + Passwortreset-Session-Revocation, danach privilegierte Admin-Mutationsvalidierung/Audit, danach Supply-Chain-Hardening. Ballot-Security bleibt Eigentum von PR #557.

## Offene Produkt-PRs

Bestehende Drafts #520, #536, #556, #557, #561 und #614 behalten ihre dokumentierten menschlichen Gates. Alte Exact-Head-Evidence darf nach späterem `main` nicht als Abschlussbeleg wiederverwendet werden; vor Ready/Merge sind Merge-Base/behind, Dateikollisionen, CI/Vercel und Reviewthreads erneut nachzuweisen.

## Aktueller Single-Writer-Kollisionshinweis

PR #588 ist reserviert, weiterhin `OPEN`/`DRAFT`, `mergeable=false` und enthält laut eigener Kollisionsmatrix als einzige Überschneidung mit anderen laufenden Arbeiten eine Änderung an `docs/E150/OpenTasks.md` für `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01` (`codex_ready → review`). Dieser reservierte PR wird nicht verändert. Der #447-Writer muss diesen Delta-Wert im endgültigen SSOT-Patch verlustfrei erhalten, damit keine Voxy-Wahrheit zurückgedreht wird.

## Abschlusskriterien für #447

- operativer Kopf nennt aktuellen `main`-Stand und gültiges Statusvokabular;
- belegte Merges sind `done`, implementierte Drafts `review`, echte Operator-/Runtime-Gates `manual_gate` oder fail-closed;
- #604/#605/#608, #618, #619, #622 und #614 sind verlustfrei eingeordnet;
- historische Katalogabschnitte werden nicht inhaltlich überschrieben;
- `git diff --check` grün;
- Scope ausschließlich `OpenTasks.md` plus diese Evidence-Datei;
- keine reservierte Voxy-Arbeit, kein Produktcode, kein Deployment, keine Provider-/Secret-Aktion.

## Launchkritische zusätzliche Serialisierung

Der finale Single-Writer-Patch serialisiert zusätzlich die bereits dokumentierten launchkritischen Deltas:

- `MAIL-COMMUNICATION-CANON-01` = `done` nach Merge von PR #539; Production-Sender-Gate bleibt `manual_gate`.
- `AI-CREATE-ORCHESTRATOR-LIVE-SMOKE-01` / #617 = `codex_ready`.
- `AUTH-REGISTRATION-RUNTIME-TIMING-AUDIT-01` / #601 = `codex_ready`.
- `OBSERVABILITY-INVENTORY-01` / #611 = `codex_ready`; kein externer Export.
- `PUBLIC-BALLOT-VOTES-RUNTIME-01` / #615 = `manual_gate`; dedizierter VOTES-Store, kein CORE-Fallback.
- `MAIL-VISUAL-DESIGN-POLISH-02` / #618 = `codex_ready`.
- #619 und #622 bleiben als Governance-/Assurance-Eltern fail-closed und sind keine Big-Bang-Implementierungsfreigabe.
- Die reservierte #588-Wahrheit `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01 = review` wird nur im SSOT erhalten; PR #588 selbst bleibt unberührt.
