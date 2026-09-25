# G-Track Completion Contract — Public Guards

Stand: 2026-09-17

Status: verbindlicher Abschlussvertrag für den Public-Guard-Track.

## Ziel

Der Public-Guard-Track gilt erst als abgeschlossen, wenn G1 bis zum letzten kanonisch existierenden G-Slice vollständig integriert sind und die abschließende systemweite Gegenprobe keine offenen Findings der Schwere P0, P1, P2 oder P3 mehr enthält.

Die aktuell kanonische Roadmap definiert die Producer-Slices G1–G5:

- G1 — Shared Public Question Guard & Evidence
- G2 — Participation
- G3 — Anlassraum
- G4 — QR / Public Entry
- G5 — Material Producer / Review Integration

`GX` bezeichnet das abschließende trackweite Acceptance-/Red-Team-Gate nach G1–G5. GX ist kein zusätzlicher Producer und keine zweite Guard-, Review-, Publish- oder Evidence-Wahrheit.

## Unverhandelbare Architekturregeln

- ZERO PARALLEL TRUTH
- FAIL CLOSED
- LANGUAGE INDEPENDENT
- NO FALSE DONE
- EVIDENCE MUST PROVE THE CLAIM IT CLOSES
- kein Auto-Publish
- kein Auto-Approve
- Client ist nie Autorität für Release-/Review-/Guard-Zustand
- `draft_allowed` ist niemals gleichbedeutend mit Public Release
- ein Producer darf den Shared Guard weder duplizieren noch umgehen
- stale, replayed, ungebundene oder revisionsfremde Review-/Audit-Evidence scheitert fail-closed
- veröffentlichter Zustand muss auf die autoritative Revision gebunden sein

## Merge- und Abschlussregel je G-Slice

Ein G-Slice ist erst `done`, wenn:

1. frischer Preflight auf aktuellem `main` bestanden ist;
2. Implementierung separat autorisiert wurde;
3. nur der autorisierte Owner-Scope geändert wurde;
4. fokussierte Contracts/Regressionen grün sind;
5. Repository Integrity, Security, Lint, Typecheck und Production Build auf Exact Head grün sind;
6. offene Reviewthreads und bekannte Findings geschlossen sind;
7. Main-Drift vor Merge geprüft wurde;
8. der PR gemergt ist;
9. Post-Merge-Truth/SSOT reconciled ist;
10. P-DoD-Evidence den tatsächlich geschlossenen Claim beweist.

## Severity Closure

Vor GX-Abschluss gilt zwingend:

```text
P0 = 0
P1 = 0
P2 = 0
P3 = 0
```

Das umfasst sowohl Code-/Security-/Concurrency-/Persistence-Findings als auch Architektur-, Accessibility-, Localization-, Recovery-, Observability-, Performance-/Abuse-, stale-state-, Review-, Evidence- und SSOT-Findings innerhalb des G-Tracks.

Ein Finding darf nur als geschlossen gelten, wenn die Korrektur oder begründete Nicht-Anwendbarkeit durch passende Evidence belegt ist. Verschieben, Umbenennen oder Verbergen eines Findings zählt nicht als Closure.

## GX — Trackweite Acceptance

GX versucht insbesondere folgende Fehler zu falsifizieren:

- alternate public entry bypasses shared G1 guard;
- producer-specific second guard or review truth;
- blocked/review_required becomes public through fallback/default/error path;
- draft_allowed triggers implicit activation;
- stale or replayed human review releases a newer revision;
- audit persistence happens after public release;
- reservation/release failure leaves public partial state;
- locale/translation/path alias changes guard semantics;
- QR or shared material points to stale/unbound state;
- Anlassraum/Participation/Material/QR disagree about the authoritative question/revision;
- recovery path silently weakens a guard;
- mobile/no-JS/accessibility path bypasses required public-state truth;
- monitoring or UI reports green while runtime is blocked or unknown.

## External independent review

MASTER WORK may perform an additional independent red-team review from 2026-09-19 onward. That review is additional assurance and must not be used to defer known G-track implementation or known P0–P3 closure work.

## Final Definition of Done

G-Track complete means:

- G1–G5 merged;
- all G1–G5 issue/PR states reconciled to repository truth;
- GX acceptance passed on the resulting main;
- P0/P1/P2/P3 all zero;
- no known bypass, stale-state, second-truth or false-green finding remains;
- no G-specific implementation/review/manual-gate debt remains;
- no auto-publish or unsafe release capability introduced.
