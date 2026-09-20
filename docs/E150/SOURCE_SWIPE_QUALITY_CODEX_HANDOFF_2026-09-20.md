# Codex Handoff — Source/Swipe Quality Convergence

Datum: 2026-09-20

## Relevante PRs

- #938 — Swipe UX/Datenmodell/Gates
- #940 — Swipe Question-Quality, Part16-Finalizer, Create-Save-Gate
- #935 — Source Vote Readiness
- #953 — Governance-Canon für C13/T9/G6 Global Topic Intelligence / Media Research
- Integrations-PR auf `feat/source-swipe-quality-integration-939` — Konvergenz #935 + #940

## Prüfreihenfolge

1. Exact-head CI der vier Source/Swipe-Slices prüfen.
2. Sicherstellen, dass #940 nach #938 ohne Paralleltypen rebased werden kann.
3. #935 unabhängig als Readiness-Gate auf Source/T1/DecisionFrame/Release-Autorität prüfen; dabei keine Evidence-/Topic-/Decision-SSOT hineininterpretieren.
4. Integrations-Slice nach #935 retargeten/rebasen; Source-Vertragsdateien nicht doppelt mergen.
5. P0/P1 besonders auf Fail-open-Pfade prüfen:
   - `review_ready` ohne strukturierten Swipe-Fragenoutput
   - `supported`/`verified` ohne Evidence-Ref
   - Evidence-Ref außerhalb der SourceSwipeCandidate-Evidenz
   - `release.live` ohne bestandene Swipe-Fragenqualität
   - leere Entscheidungsfrage
   - Deck-Repetition / exakte Duplikate
   - Swipe-Vote-Write ohne aktuelle Privacy-Kenntnisnahme
   - `usePrivacyGate()` außerhalb des Providers darf aktive Verarbeitung nicht freigeben
6. Prüfen, dass kein Pfad politisches Empfehlungsranking, Auto-Publish, Auto-Exclude oder Source-Release-Autorität einführt.
7. Für das C13/T9/G6-Gesamtziel zusätzlich prüfen:
   - #586 bleibt CanonicalTopic-/Jurisdiction-/DecisionQuestion-Owner.
   - #587 bleibt AtomicClaim-/SourceSegment-/Lineage-/EvidenceAssessment-Owner.
   - `SourceEvidenceReadiness` und `evidenceRefs` werden später nur aus diesen Ownern plus T9-Verification-Receipts abgeleitet; keine zweite Evidence-Truth.
   - `DecisionFrame` bleibt Projection aus #586, keine zweite Decision-Identität.
   - externe Faktenchecks werden upstream verifiziert; gemeinsame Root Sources zählen nicht als unabhängige Evidenz.
   - Freshness, Jurisdiction/Applicability, Gegenbelege, Konflikte/Gaps und Delta-Revalidierung bleiben eigenständige T9-Prüfungen.
   - Originalsprache, Speaker, Segment/Timecode und Lineage bleiben erhalten; Übersetzungen erhöhen keinen Evidence-/Independence-/Readiness-Status.
   - G6 bleibt rein derived/read-only und erzeugt keine fehlende Topic-/Claim-/Source-/Dossier-/Decision-Wahrheit.
   - keine C13/T9/G6-Runtime vor kanonischer OpenTasks-Serialisierung/Preflight; #447 bleibt Single-Writer für OpenTasks.

## Bewusste Nicht-Aufgaben

- kein neuer allgemeiner Create-Planner
- keine zweite Source-, Topic-, Claim-, Evidence- oder Decision-Truth
- kein vorgezogener C13/T9/G6-Runtime-Slice
- kein automatischer Vote-Publish
- kein automatisches politisches Ranking
- keine erfundenen Folgen oder Evidenzen

## Erwarteter Endzustand

Heute:

`kanonische Topic/Claim/Evidence-Inputs → Source readiness projection → T1/Decision → strukturierter Swipe-Fragenoutput → Part16 Question-/Option-Finalizer → Human Review → kanonische Release-Autorität`

Später nach Freigabe der C13/T9/G6-Chain:

`Observation/Media Intake → kanonische SourceSegment/AtomicClaim-Lineage → T9 independent verification + delta receipts → kanonisches Topic/Decision → Source/Swipe readiness projection → Human Review/Release → G6 derived provenance readmodel`

Jeder fehlende oder widersprüchliche Zwischenschritt bleibt fail-closed.
