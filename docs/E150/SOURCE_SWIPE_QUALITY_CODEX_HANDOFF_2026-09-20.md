# Codex Handoff — Source/Swipe Quality Convergence

Datum: 2026-09-20

## Relevante PRs

- #938 — Swipe UX/Datenmodell/Gates
- #940 — Swipe Question-Quality, Part16-Finalizer, Create-Save-Gate
- #935 — Source Vote Readiness
- Integrations-PR auf `feat/source-swipe-quality-integration-939` — Konvergenz #935 + #940

## Prüfreihenfolge

1. Exact-head CI der vier Slices prüfen.
2. Sicherstellen, dass #940 nach #938 ohne Paralleltypen rebased werden kann.
3. #935 unabhängig auf Source/T1/DecisionFrame/Release-Autorität prüfen.
4. Integrations-Slice nach #935 retargeten/rebasen; Source-Vertragsdateien nicht doppelt mergen.
5. P0/P1 besonders auf Fail-open-Pfade prüfen:
   - `review_ready` ohne strukturierten Swipe-Fragenoutput
   - `supported`/`verified` ohne Evidence-Ref
   - Evidence-Ref außerhalb der SourceSwipeCandidate-Evidenz
   - `release.live` ohne bestandene Swipe-Fragenqualität
   - leere Entscheidungsfrage
   - Deck-Repetition / exakte Duplikate
6. Prüfen, dass kein Pfad politisches Empfehlungsranking, Auto-Publish, Auto-Exclude oder Source-Release-Autorität einführt.

## Bewusste Nicht-Aufgaben

- kein neuer allgemeiner Create-Planner
- keine zweite Source-Truth
- kein automatischer Vote-Publish
- kein automatisches politisches Ranking
- keine erfundenen Folgen oder Evidenzen

## Erwarteter Endzustand

`Source evidence/T1 → strukturierter Swipe-Fragenoutput → Part16 Question-/Option-Finalizer → Human Review → kanonische Release-Autorität`

Jeder fehlende oder widersprüchliche Zwischenschritt bleibt fail-closed.
