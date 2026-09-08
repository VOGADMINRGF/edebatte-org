# PR #682 — Exact-Head Security Cleanup

Stand: 2026-09-06

Branch: `fix/citizen-first-create-01`
Ausgangshead: `52baa748c157810d4fd30ac1fe57d00fc342733b`

## Geschlossene Findings

- Anonyme Browser-Arbeitsstände verwenden keinen globalen `:guest`-Schlüssel mehr. Der Namespace wird aus der signierten, 30 Minuten gültigen Anonymous Session abgeleitet, enthält keine rohe Session-ID und wird bei fehlender oder abgelaufener Bindung nicht geladen.
- Ein angemeldeter Nutzer lädt einen Gast-Arbeitsstand nur nach dem expliziten `resume=guest`-Übergang. Ein eigener Konto-Arbeitsstand bleibt davon getrennt.
- Die Gast-zu-Konto-Übernahme akzeptiert nur eine abgeschlossene, serverseitig validierte Single-Flight-Operation derselben Anonymous Session. Text und Analyse kommen aus dem Server-Claim; Client-Resultate, Quellen, Uploads und Materialien sind keine Provenienz. Der Claim wird atomar an genau ein Konto gebunden, Wiederholungen desselben Kontos bleiben idempotent, ein zweites Konto wird abgewiesen und es entsteht kein zweiter Providerlauf.
- Für anonyme `/api/create/intake`-Planneraufrufe gilt zusätzlich zum Session-Limit ein persistentes IP-Limit von 12 Aufrufen in 10 Minuten. Eine Cookie- oder Session-Rotation erweitert dieses Budget nicht; andere Create-Scopes behalten ihre Policy.
- Die explizite Entscheidung zu einem bestehenden Thema (`Unterstützen`, `Widersprechen`, `Ergänzen / Nuance`, `Separat weiterführen`) bleibt vom Produktions-Panel bis in Handoff-Draft und Review Queue erhalten. Ohne Auswahl wird keine Haltung ergänzt; Merge und Publish bleiben manuell.
- Zuständigkeitskandidaten aus demselben `citizenContext` werden sichtbar als Vorschlag gezeigt und können bestätigt oder im Beitrag präzisiert werden. Mehrere Kandidaten bleiben getrennt, unbekannte Kandidaten sind nicht bestätigbar, und Bundes-/EU-Kontexte werden nicht zu einer Kommune umgedeutet.

## Guardrails

- Kein Auto-Publish, kein Silent Merge und keine automatische Zuständigkeitsentscheidung.
- Kein zweiter Adoption-, Rate-Limit- oder Jurisdiction-Resolver.
- `docs/E150/OpenTasks.md` wurde in diesem Cleanup nicht verändert.

## Lokale Verifikation

- Geänderte #682-Testfläche: 37 Dateien, 214 Tests grün, 3 explizite Live-Smoke-Tests übersprungen.
- Save-/Security-Harness: 17 Dateien, 128 Tests grün.
- Web Critical: 28 Dateien, 192 Tests grün.
- Production Guardrails: 12 Dateien, 36 Tests grün.
- Typecheck, Full Lint und `git diff --check`: grün.
- Production Build: grün mit lokalen, nicht persistierten Build-Platzhaltern für die im isolierten Worktree fehlende Runtime-Konfiguration.

Lokales Ergebnis: `LOCAL_ADVERSARIAL_REVIEW=CLEAN`, `KNOWN_P0_P1_P2=0`.
