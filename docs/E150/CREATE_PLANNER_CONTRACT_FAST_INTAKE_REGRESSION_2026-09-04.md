# Create-Planner-Contract und Fast Intake – Regression 2026-09-04

## Status und Abgrenzung

Bestehender, ungemergter Fix auf `fix/create-mobile-runtime-polish-01` und PR
#713. Die Save-/Resume-Reihenfolge bleibt erhalten: Der Entwurf wird vor dem
Planner-Aufruf gespeichert. Die von PR #682 belegten Citizen-Context-Hunks
wurden nicht ersetzt.

`docs/E150/OpenTasks.md` wurde bewusst nicht parallel geändert. Laut aktuellem
Repository-Stand ist Issue #447 der alleinige SSOT-Writer; auch PR #713 hält diese
Abgrenzung ausdrücklich fest.

Die vier Überschneidungen mit PR #682 (`CreateClient.tsx`,
`SharedCreateComposer.tsx`, `intelligentFollowup.ts`,
`intelligentFollowupContract.ts`) wurden hunk-genau gegen `origin/main`, den
#713-Remote-Head und #682-Head `6fce98c0` geprüft. Die Planner-Laufzeitmessung
liegt im nicht kollidierenden Planner-Contract; eine synthetische Drei-Wege-
Zusammenführung ist konfliktfrei und enthält anschließend sowohl den Citizen-/
Regionskontext von #682 als auch die #713-Contract- und Latenzhärtung.

## Adaptive Timing und Multi-Issue-Follow-up 2026-09-05

Der zweite reale Lauf zeigte einen ungültigen Timing-Vertrag: Standard- und
komplexe Eingaben durften serverseitig 10.000 ms laufen, der Browser brach den
Planner-POST aber für alle Eingaben bereits nach 8.000 ms ab. Damit konnte ein
zulässiger Serverlauf nach durable Save fälschlich im Timeout-Recovery enden.

Der Vertrag ist jetzt eingabeabhängig und zentral geteilt:

| Lane | Auswahl | Serverlimit | Clientlimit | Transportreserve |
| --- | --- | ---: | ---: | ---: |
| `fast` | kurzer Text bis 800 Zeichen, keine URL, keine starke Mehrthemenstruktur | 6.500 ms | 8.000 ms | mindestens 1.000 ms |
| `standard` | längerer, verlinkter oder strukturierter Mehrthementext | 10.000 ms | 12.500 ms | mindestens 1.000 ms |

Für beide Lanes ist per Contract-Test gesichert:
`clientTimeout > serverTimeout + transportReserve`. Der Client wählt das Limit
erst nach erfolgreichem durable Save; auch der Retry verwendet dieselbe
Textklassifikation. Drei Sekunden bleiben ausschließlich Performance-Ziel.

Die kanonische Einordnung trägt zusätzlich `issueMode`, `timingLane` und
`inputLength`. Nummerierte Listen, Abschnittsüberschriften und wiederholte
`Unterthemen:` sind starke Mehrthemensignale. Bei mindestens drei explizit
nummerierten Blöcken werden die Überschriften deterministisch als eigenständige
`topicCandidates` erhalten; ein Provider darf das Paket weder auf ein
synthetisches Oberthema reduzieren noch in die Fast-Lane verschieben. Die
Standard-Lane behält 1.200 Output-Tokens und bis zu zwei Provider-Versuche; die
Fast-Lane bleibt bei 400 Tokens und einem Versuch.

Scope wird im Planner-Ergebnis nur noch aus expliziter Textevidenz übernommen.
Unbelegte Providerwerte werden verworfen. Ohne Orts-/Jurisdiktionssignal bleibt
die Ebene `unclear`; ein ausdrücklich kommunales Programm kann `municipal` bzw.
bei zusätzlich explizitem Lokalbezug `local` tragen.

Die Mehrthemen-UI zeigt zunächst vier kompakte Themen und den Overflow statt 14
großer Karten. Sie benennt das Ergebnis als Vorschlagspaket und bietet die
bewussten Entscheidungen `Als Gesamtkonzept weiterarbeiten`, `Ein Thema
auswählen` und `Struktur ändern`. Research, Graph-Suche, Quellenarbeit,
Publikation und Merge bleiben vor Bestätigung deaktiviert.

Echter Provider- und Headless-Chromium-Lauf unter Node 20.20.2:

| Eingabe | Lane | Zeichen | Themen | Planner | Bis sichtbar | Ergebnis |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| kurzer Werkstatttext, Desktop 1440 × 900 | `fast` | 143 | 1 | 2.670 ms | 2.774 ms | `unclear`, 2 Aspekte, `pro` |
| kurzer Werkstatttext, Mobile 390 × 844 | `fast` | 143 | 1 | 3.588 ms | 3.636 ms | `unclear`, 2 Aspekte, `pro` |
| kommunales 14-Punkte-Programm, Mobile 390 × 844 | `standard` | 1.047 | 14 | 3.689 ms | 3.726 ms | `multi_issue`, kompakte 4+10-Ansicht |

Alle drei Läufe verwendeten OpenAI
`gpt-4.1-mini-2025-04-14` mit genau einem Provider-Versuch und blieben innerhalb
des ausgewählten Clientlimits. Der direkte Live-Smoke misst Planner plus
React-/Browser-Sichtbarkeit. `saveMs`, `accessMs`, `plannerMs`, Route-`totalMs`
und Client-`submitToResultMs` bleiben in den echten POST-Traces getrennt; der
Trace ergänzt Lane, Eingabelänge, kanonische Themenzahl und Issue-Modus. Ein
vollständiger authentifizierter lokaler Save-/POST-Lauf war mangels
`EDEBATTE_E2E_EMAIL` und `EDEBATTE_E2E_PASSWORD` weiterhin nicht seriös
möglich; daher werden für `saveMs`, `accessMs` und Server-Total keine erfundenen
Werte angegeben.

Die optionalen Loader `create_contribution_ledger`, `factcheck_jobs` und
`user_scoped_runtime_linkages` gehören zu `getAccountOverview()` im
serverseitigen `GET /create` und besitzen einen 2.000-ms-Fallback. Sie werden
weder von `POST /api/create/save` noch von
`POST /api/create/intelligent-followup` geladen. Das verbleibende
SSR-/Page-Load-Thema ist ein separates Performance-Follow-up und wurde hier
nicht refaktoriert.

## Befund

Die Regression hatte vier zusammenwirkende Ursachen:

1. `asStringArray` konvertierte beliebige Array-Einträge mit `String(...)` und
   machte aus Objekten dadurch den öffentlichen Text `[object Object]`.
2. Der Planner übergab zwar ein JSON-Schema, der OpenAI-Adapter durfte bei
   Schemafehlern aber still auf `json_object` zurückfallen und damit einen zweiten
   physischen Provider-Call auslösen.
3. Das vorherige Strict-Schema war beim Provider ungültig: Das optionale Feld
   `stance` stand in `properties`, aber nicht in `required`. OpenAI meldete
   `invalid_json_schema`.
4. `plannerClusters` (Aspekte) wurden zusätzlich zu `topicCandidates`
   (eigenständige Hauptthemen) als Themenkarten und teilweise als Zählerbasis
   verwendet.

## Umgesetzter Contract

- Der Provider-Input wird vor jeder Normalisierung mit einem strikten Zod-Contract
  geprüft. Öffentliche Strings sind echte, nicht-leere Strings; Arrays akzeptieren
  ausschließlich echte Strings bzw. die vorgesehenen Enums.
- `[object Object]`, `[object Array]`, `undefined`, `null`, `NaN` und `Infinity`
  werden als öffentliche technische Sentinel-Werte abgewiesen.
- Nicht-konforme JSON-Payloads enden fail-closed als
  `invalid_provider_payload` mit einem sicheren `contract_violation_*`-Code. Es
  gibt danach keinen alternativen Provider-Versuch.
- Der Planner setzt `allowJsonFormatFallback: false`. Der Call-Pfad wurde bis zum
  Requests-API-Body geprüft: `callOpenAIJson` reicht das Schema an `callOpenAI`
  durch; der Provider sendet `text.format.type = json_schema`, den Schemanamen,
  `strict: true` und das Schema an `/v1/responses`.
- Das verkleinerte Intake-Schema enthält nur die für die erste Antwort nötigen
  Felder. Alle Properties sind required; alle Array-Items sind Strings. Interne
  Alias-, Such- und Lane-Felder werden danach deterministisch abgeleitet.
- Ein gemeinsamer Kern erzeugt genau einen `topicCandidate`; `plannerClusters`
  bleiben Aspekte. `CreateVisualFollowup`, Debattenstand und Themenzähler leiten
  ihre Anzahl aus derselben deduplizierten `understanding.topics`-Struktur ab.
- Die explizite Formulierung „ich bin für“ korrigiert ein Provider-Ergebnis
  `open`/`unclear` auf `pro`, sofern keine explizite Gegenposition vorliegt.
- Für den Werkstatt-/Teilhabe-Fall stabilisiert eine deterministische semantische
  Reconciliation die ausdrücklich vorgegebene Hauptanliegen-/Aspekt-Struktur,
  ohne einen zweiten Runtime-Pfad oder Provider-Call einzuführen.

## Citizen-first und Latenz

- Kurze Texte ohne URL nutzen einen Fast-Intake-Pfad mit einem Provider-Versuch,
  400 Output-Tokens und 6.500 ms Provider-Timeout. Normale längere Planner-Flows
  behalten das konfigurierte 10.000-ms-Budget. Drei Sekunden bleiben das
  Performance-Ziel und sind keine technische Fehlergrenze.
- Der Save bleibt ohne `AbortSignal`. Erst nachdem die Route einen dauerhaft
  gespeicherten Draft bestätigt hat und nachdem der Link-Early-Return
  ausgeschlossen wurde, entstehen Planner-`AbortController` und 8.000-ms-Timer.
  Damit verbrauchen Security, Auth, Draft Binding und Save kein Client-Budget für
  die intelligente Einordnung.
- Der Timer wird auf Erfolg, Providerfehler, Early Return und beim Unmount
  bereinigt. Auch der explizite Retry verwendet denselben begrenzten
  Intelligent-Followup-Vertrag.
- Ein echter Client-`AbortError` nach Ablauf der 8.000 ms wird getrennt behandelt:
  Der gespeicherte Draft bleibt erhalten, die Oberfläche behauptet keinen
  Save-Verlust, zeigt nur die tatsächlich gesendete Korrelations-ID als
  technische Referenz und bietet den vorhandenen Retry an. Es entsteht kein
  Fake-Ergebnis.
- AI-Usage-Telemetrie blockiert die sichtbare Planner-Antwort nicht mehr.
- Graph-Matches, Research und Source-Enrichment bleiben vor der Bestätigung leer;
  der bestehende Topic-Match-Runtime-Aufruf startet erst nach `isConfirmed`.
- Die erste Ansicht zeigt einen gemeinsamen Kern, alle drei verständlichen Aspekte
  und danach die Bestätigung. Tiefere Struktur bleibt eingeklappt.
- Save-, Access-, Planner-, Context-, Route-Total- und Client-
  `submitToResultMs`-Zeiten sind getrennt instrumentiert.

## Regressionsergebnis

Eingabe:

> ich bin für mindestlohn bei behindertenwerkstätten, für mehr integration innerhalb der wirtschaft aber auch für stärkere kontrollen der vorstände der jeweiligen akteure

Kanonisches Ergebnis:

- Themenzahl: `1`
- Hauptanliegen: `Arbeitsbedingungen und Teilhabe in Behindertenwerkstätten`
- Aspekte:
  - `Faire Entlohnung / Mindestlohn`
  - `Integration in den allgemeinen Arbeitsmarkt`
  - `Kontrolle / Governance der Träger bzw. Vorstände`
- Haltung: `pro`
- Provider: `openai`
- Modell: `gpt-4.1-mini-2025-04-14`
- Provider-Attempts: `1`

Revalidierter Live-Smoke am 2026-09-05 nach dem Timeout-Hardening mit echtem
Provider und anschließendem sichtbaren Headless-Chromium-Render:

| Viewport | Planner | Post-Planner bis sichtbar | Fast Intake bis sichtbar | Contract |
| --- | ---: | ---: | ---: | --- |
| Desktop 1440 × 900 | 3.693 ms | 97 ms | 3.790 ms | grün |
| Mobile 390 × 844 | 2.781 ms | 43 ms | 2.824 ms | grün |

Beide Läufe hatten genau einen Provider-Attempt, dieselbe kanonische Themenzahl,
dieselben drei Aspekte, Haltung `pro` und keinen technischen Sentinel im
gerenderten Output. Der Mobile-Lauf erreichte das Ziel von unter drei Sekunden;
der Desktop-Lauf verfehlte das Zielbudget um 790 ms, blieb aber mit realer
Providerantwort klar innerhalb der technischen Reserven. Der größte Anteil ist
weiterhin die einzelne Provider-Antwort.

Der Live-Smoke startet am Fast-Intake-Aufruf und enthält Provider, Context,
React-Render und die Sichtbarkeitsprüfung im Browser. Ein vollständiger
authentifizierter lokaler `/create`-Submit einschließlich realer Save-/Access-
Netz- und Datenbanklatenz konnte weiterhin nicht seriös gemessen werden, weil
keine `EDEBATTE_E2E_EMAIL`/`EDEBATTE_E2E_PASSWORD` für ein freigegebenes
Wegwerf-Konto gesetzt sind. Es wurde kein Auth-Bypass und kein ungeprüfter
Testnutzer erzeugt. Die Route-Contract-Tests prüfen `accessMs`, `contextMs`,
`saveMs`, `plannerMs` und `totalMs`; der Client ergänzt `submitToResultMs`. Der
vollständige Submit-zu-sichtbar-Wert bleibt deshalb ein manueller PR-Gate-Punkt.

## Optionale Account-Loader

`create_contribution_ledger` und `manual_anlassraum_server_drafts` werden nur
über `getAccountOverview()` beim serverseitigen `GET /create` geladen. Sie laufen
parallel mit einem 2.000-ms-Fallback. Weder `POST /api/create/save` noch
`POST /api/create/intelligent-followup` lädt sie. Sie blockieren daher nicht den
eigentlichen Submit, können aber den SSR-/Page-Load vor dem interaktiven Client
verlängern. Eine Entkopplung des Create-Page-Overview vom breiten Account-
Readmodel ist ein separater Performance-Follow-up und gehört nicht in diesen
P0-Fix.

## Verifikation

- Live: `CREATE_LIVE_REGRESSION_SMOKE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/create-planner-live-responsive.smoke.test.tsx --reporter=verbose`
- Live-Smoke: 3 Tests mit echtem Provider und Headless Chromium grün
  (kurz Desktop/Mobile, lang Mobile).
- Erweiterter CI-Block `Focused Create runtime contracts` einschließlich der
  neuen Timing- und Planner-Regressionen: 236 Tests in 30 Dateien grün.
- CI-konfigurierter isolierter Save-/Safety-Harness: 25 Tests in 2 Dateien grün.
- Web-Critical: 192 Tests in 28 Dateien grün.
- Production Guardrails: 36 Tests in 12 Dateien grün.
- `pnpm -C apps/web run typecheck`, fokussiertes ESLint und `git diff --check`:
  unter Node 20.20.2 grün.

Zwei zusätzlich mit der allgemeinen Vitest-Konfiguration geprüfte, von #713
unveränderte Baseline-Dateien bleiben in genau dieser nicht-kanonischen
Ausführung rot: `create-save.safety-gate.test.ts` (fehlender Security-Mock,
6 Tests; mit dem CI-eigenen isolierten Security-Harness grün) und
`start-shared-create-composer.contract.test.tsx` (veraltete Homepage-Copy,
2 Tests). Der identische 8-Test-Fehler wurde in einem isolierten Worktree direkt
auf `origin/main` `5a7dcadf` reproduziert; diese fremde Drift wurde nicht in den
#713-Scope aufgenommen.

Der Live-Smoke ist standardmäßig deaktiviert und läuft nur mit
`CREATE_LIVE_REGRESSION_SMOKE=1`, damit normale Testläufe keine externen Kosten
oder Provider-Aufrufe auslösen.
