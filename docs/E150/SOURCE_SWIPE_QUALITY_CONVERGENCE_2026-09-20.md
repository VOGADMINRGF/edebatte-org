# Source → Swipe Question Quality Convergence

Datum: 2026-09-20
Status: Integrations-Slice zu #935, #940 und Issue #939

## Ziel

Die Source-Readiness bleibt kanonisch für Evidenz, Provenienz, T1-Qualifikation, Decision Frame, Neutralität und Release-Autorität. Der Swipe-Finalizer bleibt kanonisch für menschlichen Kontext, neutralen Zielkonflikt, richtungsbezogene Folgen, Evidenzstatus und Deck-Qualität.

Dieser Slice verbindet beide Verträge, ohne eine zweite Source-Truth oder eine zweite Veröffentlichungsautorität einzuführen.

## Effektive Kette

`Source evidence_ready → canonical T1/vote_candidate → Swipe question-quality → Human Review → canonical release`

Ein Source-Paket darf nicht allein deshalb als öffentlich finalisierbar gelten, weil Source-Evidenz und T1 bereit sind. Fehlt der strukturierte Swipe-Fragenoutput oder fällt dessen Quality-/Evidenz-Gate, wird ein Source-Status `review_ready` oder `voting_live` im Convergence-Readmodel fail-closed auf `vote_candidate` begrenzt.

## Evidenzregel

Folgen mit Evidenzreferenzen dürfen nur Referenzen verwenden, die über die `SourceSwipeCandidate`-Evidenzmenge des jeweiligen Source-Pakets bereits legitimiert sind. `supported` und `verified` ohne reale Referenz werden zusätzlich vom Swipe-Finalizer blockiert. `hypothesis`/`unverified` bleiben als explizite Unsicherheitszustände möglich.

## Fragequalität

Eine konkrete neutrale Frage darf mit `Soll ...?` beginnen. Das Wort ist kein Einzelkarten-Verbot. Repetitive/generische Frames werden deckweit durch den Question-Quality-Contract erkannt.

## Guardrails

- kein Auto-Publish
- keine Source-Release-Autorität
- keine automatische Exklusion
- kein politisches Ranking oder Empfehlungsranking
- `rankingHints` im Part16-Finalizer bedeuten ausschließlich technische Review-Priorität
- Human Review vor öffentlicher Finalisierung
- kein erfundener Kontext, keine erfundene Evidenz, keine erfundene Kausalität

## Stack / Merge-Reihenfolge

1. #938: Swipe-Datenmodell, UX und Basis-Quality-Contract
2. #940: Runtime-/Part16-Finalizer, Agent-Output-Contract, Create-Save-Gate
3. #935: kanonische Source Vote Readiness
4. dieser Integrations-Slice: Source-Readiness + Swipe-Question-Quality

Der Integrations-Slice enthält #935 derzeit absichtlich als Stack-Abhängigkeit. Nach Integration von #935 soll er gegen den dann kanonischen Zielbranch rebased/retargetet werden, statt Source-Code doppelt zu mergen.
