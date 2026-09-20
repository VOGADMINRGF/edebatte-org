# Source → Swipe Question Quality Convergence

Datum: 2026-09-20
Status: Integrations-Slice zu #935, #940 und Issue #939

## Ziel

Die Source-Readiness bleibt das kanonische **Decision-Readiness-Gate** für diesen Source→Vote-Pfad: Sie bewertet, ob die bereits kanonisch ermittelten Evidenz-, Provenienz-, T1-/Decision-, Neutralitäts-, Review- und Release-Voraussetzungen für die nächste Stufe erfüllt sind. Sie ist ausdrücklich **kein zweiter Domain-Owner** für Topic-, Claim-, Evidence-, Source- oder Decision-Wahrheit. Der Swipe-Finalizer bleibt kanonisch für menschlichen Kontext, neutralen Zielkonflikt, richtungsbezogene Folgen, Evidenzstatus und Deck-Qualität.

Dieser Slice verbindet beide Verträge, ohne eine zweite Source-Truth, Evidence-Truth, Decision-Truth oder Veröffentlichungsautorität einzuführen.

## Effektive Kette

`kanonische Topic/Claim/Evidence-Inputs → Source readiness projection → canonical T1/vote_candidate → Swipe question-quality → Human Review → canonical release`

Ein Source-Paket darf nicht allein deshalb als öffentlich finalisierbar gelten, weil Source-Evidenz und T1 bereit sind. Fehlt der strukturierte Swipe-Fragenoutput oder fällt dessen Quality-/Evidenz-Gate, wird ein Source-Status `review_ready` oder `voting_live` im Convergence-Readmodel fail-closed auf `vote_candidate` begrenzt.

## Evidenzregel

Folgen mit Evidenzreferenzen dürfen nur Referenzen verwenden, die über die `SourceSwipeCandidate`-Evidenzmenge des jeweiligen Source-Pakets bereits legitimiert sind. `supported` und `verified` ohne reale Referenz werden zusätzlich vom Swipe-Finalizer blockiert. `hypothesis`/`unverified` bleiben als explizite Unsicherheitszustände möglich.

Die Referenzen und Readiness-Flags sind dabei keine neue Evidenz-SSOT. Sobald die in #953 dokumentierte Chain `#586 + #587 → C13 → T9 → G6` operativ freigegeben ist, müssen sie aus den kanonischen Topic-/AtomicClaim-/SourceSegment-/EvidenceAssessment-/Verification-Receipts abgeleitet werden. Insbesondere dürfen Root-Source-Unabhängigkeit, Factcheck-of-factcheck, Freshness, Jurisdiction/Applicability, Gegenbelege, Konflikte und Research Gaps nicht durch lokale Source-Flags ersetzt oder hochgestuft werden.

## Fragequalität

Eine konkrete neutrale Frage darf mit `Soll ...?` beginnen. Das Wort ist kein Einzelkarten-Verbot. Repetitive/generische Frames werden deckweit durch den Question-Quality-Contract erkannt.

`DecisionFrame` ist in diesem Slice ein Readiness-/Semantik-Projection-Contract. Im Zielbild muss er aus dem kanonischen Topic-/DecisionQuestion-Owner (#586) abgeleitet werden, nicht daneben eine zweite Decision-Identität erzeugen. Standarddeutsch und Leichte Sprache müssen dieselbe Decision-Semantik tragen; Übersetzung oder Lesefassung darf Evidence-, Match-, Independence- oder Readiness-Status niemals erhöhen.

## C13 / T9 / G6 Anschlussgrenze

Dieser PR implementiert **keinen** C13-, T9- oder G6-Runtime-Slice. Für das spätere Gesamtziel gelten folgende Anschlussbedingungen:

- **C13** liefert nur provider-/formatneutrale Intake-/Adapter-Metadaten und referenziert bestehende Source-/Segment-Owner; kein eigener Source-Truth-Store.
- **T9** liefert unabhängige Verification-/Delta-Receipts auf Basis der kanonischen #586/#587-Owner. Source-Readiness darf diese Receipts nur konsumieren/projizieren, nicht ersetzen.
- Ein Dossier oder Swipe darf nicht allein auf einem Medienformat oder dessen eigenem Faktencheck beruhen; gemeinsame Root Sources müssen als gemeinsame Lineage erkennbar bleiben.
- Sprecher-/Segment-/Timecode-Lineage sowie Originalsprache bleiben erhalten. Übersetzungen sind Lesefassungen, keine zusätzliche Evidenz.
- **G6** darf diesen Pfad später ausschließlich als derived provenance projection lesen (`… → Dossier → Decision → Swipe → Verification Receipt`) und niemals in Topic-/Claim-/Evidence-/Decision-Truth zurückschreiben.
- Bis #586/#587 kanonisch serialisiert und die C13/T9/G6-Tasks per OpenTasks-Single-Writer/Preflight freigegeben sind, entsteht aus diesem Convergence-Slice keine vorgezogene Media-/Research-Runtime.

## Guardrails

- kein Auto-Publish
- keine Source-Release-Autorität
- keine zweite Topic-/Claim-/Evidence-/Decision-SSOT
- keine automatische Exklusion
- kein politisches Ranking oder Empfehlungsranking
- `rankingHints` im Part16-Finalizer bedeuten ausschließlich technische Review-Priorität
- Human Review vor öffentlicher Finalisierung
- kein erfundener Kontext, keine erfundene Evidenz, keine erfundene Kausalität

## Stack / Merge-Reihenfolge

1. #938: Swipe-Datenmodell, UX und Basis-Quality-Contract
2. #940: Runtime-/Part16-Finalizer, Agent-Output-Contract, Create-Save-Gate
3. #935: Source Vote Readiness als fail-closed Readiness-Gate
4. dieser Integrations-Slice: Source-Readiness + Swipe-Question-Quality

Der Integrations-Slice enthält #935 derzeit absichtlich als Stack-Abhängigkeit. Nach Integration von #935 soll er gegen den dann kanonischen Zielbranch rebased/retargetet werden, statt Source-Code doppelt zu mergen.
