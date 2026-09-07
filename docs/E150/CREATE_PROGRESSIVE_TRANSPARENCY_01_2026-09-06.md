# /create Progressive Transparency – Slice #726

Stand: 7. September 2026

Branch: `feat/create-progressive-transparency-01`

Base: `fix/operator-notifications-01@8eceb6544f47f748fe40b350aeaab412ade63c34`

Konvergierter Create-Unterbau: `fix/citizen-first-create-01@a12978a5fc7f22f4f5281d393a26834cadd36204`

## Ergebnis

`/create` zeigt während der bestehenden kanonischen Orchestrierung echte,
validierte Zustandsereignisse. Die neue Schicht verändert weder Save, Planner,
Quality Gate noch Publish-Semantik. Sie transportiert ausschließlich bereits
eingetretene Zustände und deterministisch aus dem gespeicherten Input ableitbare
Strukturhinweise.

Der vorhandene `POST /api/create/intelligent-followup` liefert bei
`Accept: text/event-stream` einen SSE-Stream. Sessionprüfung, Same-Origin/CSRF,
Rate Limit und Draft Binding laufen vollständig vor dem Öffnen des Streams. Der
JSON-Pfad desselben Endpunkts bleibt kompatibel.

Der neue anonyme `POST /api/create/intake` aus #682 verwendet denselben
Event-Contract und dieselbe Single-Flight-Implementierung. Seine vorhandenen
Anonymous-Session-, Browser-/IP-, Duplicate-/Flood-, Honeypot-, CSRF- und
mechanischen Pre-AI-Gates laufen ebenfalls vor dem Stream. Er erzeugt weder
Account-Draft noch Ownership-, Handoff- oder Publish-Schreibvorgänge.

## Event- und Wahrheitsmodell

Der öffentliche Zod-Contract begrenzt Phase, Typ, Status und Sichtbarkeit. Er
enthält `operationId` und `correlationId`, aber keine User-/Session-ID, Secrets,
Reasoning-Tokens oder freien Provider-Rohpayload. Unterstützt werden die
Wahrheitsklassen `recognized`, `verified`, `open`, `provisional` und
`corrected`; Prozentwerte sind nicht Teil des Contracts.

Nach dem bestätigten dauerhaften Account-Save beziehungsweise dem tatsächlich
geschriebenen browserlokalen Gast-Arbeitsstand entstehen unmittelbar:

- `draft.saved`
- `intake.classified`
- bei mindestens drei tatsächlich erkannten Segmenten `structure.detected`

Für Gastläufe behauptet der Server keine Browser-Persistenz: Er emittiert kein
`draft.saved`, weil er den lokalen Schreibvorgang nicht beobachten kann. Der
Client ergänzt dieses verifizierte Ereignis erst, wenn sowohl der vollständige,
an den signierten Anonymous-Kontext gebundene Gast-Arbeitsstand als auch die
kurzlebige Resume-Referenz erfolgreich geschrieben wurden. Schlägt einer der
Writes etwa wegen Quota- oder Security-Einschränkungen fehl, bleibt der Beitrag
im aktuellen React-Arbeitsstand sichtbar, `draft.saved` entfällt und ein
expliziter Hinweis fordert dazu auf, die Seite geöffnet zu lassen oder den Text
zu kopieren. Beim Reconnect bleibt ausschließlich dieses clientseitig belegte,
operations- und korrelationsgebundene Gast-Save-Ereignis erhalten; alle
Serverereignisse werden weiterhin aus dem actor-bound Single Flight replayt.

Die pure Früherkennung verwendet die vorhandene Single-/Multi-Issue-Logik und
wertet nummerierte Blöcke, Markdown-/Standalone-Überschriften sowie
`Unterthemen:` aus. Sie behauptet nur erkannte Abschnitte. `topic.detected`,
`scope.confirmed`, `quality.passed` und `result.ready` werden erst nach einem
erfolgreichen Planner- und Quality-Ergebnis erzeugt. Weichen vorläufige
Segmentzahl und kanonische Themenzahl voneinander ab, bleibt die frühere
Erkenntnis erhalten und ein `structure.corrected` macht die Konsolidierung
sichtbar.

Research-, Graph- und Source-Fortschrittsereignisse sind nicht zugelassen, weil
diese Runtimes in diesem Flow vor Bestätigung nicht aktiv sind.

## Adaptive Oberfläche

Kurze Single-Issue-Eingaben erhalten eine kompakte Statusdarstellung. Lange
strukturierte Eingaben zeigen höchstens vier geprüfte Themen und fassen den Rest
als `+ N weitere geprüfte Themen` zusammen. `Warum erkannt?` ist als
tastaturbedienbares natives Detail verfügbar und verweist bevorzugt auf ein
erkanntes Segment beziehungsweise dessen Zeile, ohne den Bürgertext erneut zu
speichern oder vollständig anzuzeigen.

Es gibt genau eine gedrosselte `aria-live="polite"`-Region. Die sichtbaren
Statuszeilen bleiben normal zugänglich; Topic-Ereignisse werden nicht einzeln in
Live-Regionen angekündigt.

## Single Flight, Reconnect und Recovery

Progress-Ereignisse werden im vorhandenen Mongo-Claim
`create_orchestration_claims` zusammen mit Actor-, Draft-, Correlation- und
Input-Bindung idempotent persistiert. Pro Claim sind höchstens 32 streng
validierte Events zulässig; IDs werden atomar dedupliziert, Labels und Referenz-
Arrays sind bereits im öffentlichen Zod-Contract begrenzt. Damit bleiben auch
Reconnects und fehlerhafte interne Producer unterhalb einer festen
Dokumentgröße. Die Claim-TTL bleibt 15 Minuten. Eine
lokale, auf 14 Minuten begrenzte Resume-Referenz speichert nur Operation,
Correlation, Draft, Kontext und einen Input-Fingerprint – keinen vollständigen
Bürgertext. Für Gäste enthält die Referenz nur den gebundenen Gastmodus; der
Originaltext und der validierte fertige Arbeitsstand bleiben im vorhandenen
browserlokalen #682-Workspace. Fertige Progress-Ereignisse werden dort ebenfalls
streng gegen den öffentlichen Contract validiert und auf 32 Einträge begrenzt.

Bei Stream-Abbruch läuft der bereits beanspruchte Servervorgang weiter. Reload
oder Reconnect sendet dieselben gebundenen Identifikatoren mit `resumeOnly` und
erhält persistierte Ereignisse sowie ein vorhandenes Resultat. Fehlt der Claim,
ist er abgelaufen oder passt der Input-Hash nicht, startet Resume keinen neuen
Provider-Aufruf. Die Oberfläche verweist dann auf einen ausdrücklichen Retry.
Fehler eines Stream-Observers oder beim optionalen Event-Write verändern das
kanonische Plannerresultat nicht; nicht dauerhaft gespeicherte Events werden
auch nicht als öffentlich beobachtet ausgegeben.

Ein technischer Fehler nach echtem Teilfortschritt erzeugt `scope.open`,
`quality.needs_confirmation` und `result.partial`; die bisherigen erkannten
Zustände bleiben sichtbar. Der Retry verwendet denselben gespeicherten Draft,
aber eine neue Correlation. Er führt keinen zweiten Save aus. Die bestehenden
idempotenten Operator-Benachrichtigungen werden nicht an Progress-Ereignisse
gekoppelt.

Der Gast→Login-Pfad übernimmt weiterhin den bereits validierten #682-Arbeitsstand
mit stabiler Gast-Operation in genau einen Account-Draft. Auch ein während des
laufenden Streams gestarteter Login behält die Resume-Referenz explizit an die
signierte anonyme Session gebunden. Progress-Resume löst dabei keinen zweiten
Providerlauf aus und erweitert die Ownership-Grenze nicht.

## Timing

Der Save bleibt ohne `AbortSignal`. Erst nach erfolgreichem durable Save beginnt
der Client-Timer. Die bestehenden Limits bleiben unverändert:

- Fast Planner: 6.500 ms Serverlimit, 8.000 ms Clientlimit
- Standard Planner: 10.000 ms Serverlimit, 12.500 ms Clientlimit
- 3.000 ms sind ein Performance-Ziel, keine Fehlergrenze

Zusätzlich erfasst der Client `firstProgressVisibleMs`,
`firstValidatedTopicVisibleMs`, `finalVisibleMs`, `eventCount` und
`correctedEventCount`.

## Vorheriger Live-Provider-Check

Der opt-in Live-Smoke lief auf dem #726-Vorhead `7fc69547` unter Node 20.20.2 mit
der lokal autorisierten OpenAI-Konfiguration und Headless Chromium. Es wurden
keine Secrets ausgegeben. Nach der #682-Konvergenz wurde der opt-in Providerlauf
nicht erneut ausgelöst; die deterministischen, Route-, Single-Flight- und
UI-Verträge sowie der Production Build wurden auf dem konvergierten Stand neu
ausgeführt.

| Fall | First progress | First validated topic | Planner | Final visible | Events | Corrected | Lane |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Kurz, Desktop 1440 × 900 | 56 ms | 3.066 ms | 2.981 ms | 3.084 ms | 6 | 0 | fast |
| Kurz, Mobile 390 × 844 | 11 ms | 2.713 ms | 2.683 ms | 2.733 ms | 6 | 0 | fast |
| 14 Punkte, Mobile 390 × 844 | 12 ms | 3.720 ms | 3.675 ms | 3.720 ms | 20 | 0 | standard |

Der lange Fall zeigte `Struktur erkannt: 14 getrennte Abschnitte.` sichtbar vor
dem Providerresultat und endete mit 14 kanonischen Themen sowie kompakter
`4 + 10`-Darstellung. Der kurze Behindertenwerkstätten-/Mindestlohn-Fall blieb
`single_issue`, hatte genau einen Provider-Versuch und Scope `unclear`.

`durableSaveMs` ist in diesem direkten Provider-/Render-Smoke bewusst `null`.
Ein vollständiger authentifizierter lokaler `/create`-Submit wurde nicht
vorgetäuscht: In der lokalen Konfiguration fehlen weiterhin freigegebene
`EDEBATTE_E2E_EMAIL`-/`EDEBATTE_E2E_PASSWORD`-Daten für ein Wegwerf-Testkonto.
Die produktive Save-vor-Timer-Reihenfolge und die Security-/Draft-Bindung sind
durch die isolierten Route- und Source-Contracts abgedeckt.

## Verifikation

- kompletter CI-Focused-Create-Block einschließlich Progressive Transparency,
  Anonymous Stream/Resume und Single Flight: 319/319
- kombinierte geänderte #682/#727-Testfläche: 42 Dateien und 275 Tests grün;
  drei opt-in Live-Smokes bewusst nicht erneut ausgeführt
- isolierter Save-/Security-Harness: 27/27
- gezielter Nachlauf für browsergebundenes `draft.saved`, Storage-Fehler,
  Anonymous Stream, Reconnect und Save-vor-Timer: 54/54
- Production Guardrails: 36/36
- Web Critical: 192/192 und Guardrail-Skript grün
- Live Provider/Chromium: 3/3
- vollständiger Production Build, Typecheck, ESLint und `git diff --check`:
  grün

Die erwarteten, abgefangenen Next-`after()`-Warnungen erscheinen in isolierten
Route-Tests außerhalb eines Request-Scopes; sie sind kein Testfehler und ändern
die Operator-Notification-Verträge nicht.

Ein lokaler SSE-Contract beweist Eventreihenfolge, Close und Parsing. Ob Vercel
Preview die Frames ohne Plattform-Pufferung inkrementell bis zum Browser
überträgt, ist vor Production-Freigabe separat am Exact Head zu prüfen. Dieser
Slice behauptet keine bereits erfolgte Production-Streaming-Verifikation.

## OpenTasks und Loader

`docs/E150/OpenTasks.md` bleibt wegen des aktiven #447-Single-Writer-Gates
unverändert.

Die optionalen `account.runtime`-Loader wurden nicht refaktoriert. Wie im
vorherigen Create-Slice analysiert, hängen sie am serverseitigen `GET /create`,
nicht an Save oder Intelligent Followup. Sie sind daher kein Teil des neuen
SSE-/Progress-Pfads; ein breiteres Loader-Refactoring bleibt außerhalb von
#726.
