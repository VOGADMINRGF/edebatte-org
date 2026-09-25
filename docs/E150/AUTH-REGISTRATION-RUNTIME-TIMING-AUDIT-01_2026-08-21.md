# AUTH-REGISTRATION-RUNTIME-TIMING-AUDIT-01

Stand: 2026-08-21

Issue: `#601`

Draft-PR: `#628`

Status: `review`

## Anlass und Scope

Der reale Browserbefund vom 21.08.2026 lautet:

- Login beziehungsweise 2FA wird angenommen.
- Die automatische Navigation aus `/login` zum Standardziel bleibt lange stehen.
- `/create` ist anschließend über eine manuell eingegebene URL erreichbar.
- Die Session ist damit bereits vor dem sichtbaren Hänger vorhanden.

Dieser Slice misst deshalb die Grenzen

```text
Auth-API → Session-Cookie → Auth-Response → Client-Navigation → Zielroute
```

getrennt. Die in PR `#519` etablierten Duplicate-Submit-, 2FA-, Redirect-,
Replay- und Cookie-Verträge bleiben unverändert. Der Slice ändert weder
Credential-, Session- noch Challenge-Wahrheit und führt keinen Auth-Bypass ein.

## Tests-first Evidence

### Auth-API und Client-Handoff

`apps/web/tests/auth-2fa-login-flow.contract.test.tsx` bildet eine erfolgreiche
Auth-Antwort mit deterministischen `150 ms` API-Latenz ab. Bis `149 ms` wird
nicht navigiert; mit der Erfolgsantwort bei `150 ms` wird exakt einmal
`navigate("/account")` aufgerufen.

Die bestehenden Route-Tests belegen weiterhin:

- `/api/auth/login` schreibt die kanonischen Session-Cookies vor der
  Erfolgsantwort.
- `/api/auth/verify-2fa` konsumiert die Challenge atomar, löscht das Pending-
  Cookie und wartet auf den Session-Cookie-Write, bevor Erfolg zurückgegeben
  wird.
- Duplicate Submit, gültiger Replay bei bereits aktiver 2FA-Session, unsichere
  Redirects und optionale Auth-Telemetrie bleiben durch die Verträge aus PR
  `#519` abgedeckt.

Damit liegt die beobachtete lange Zeit nicht zwischen erfolgreicher
Auth-Antwort und Aufruf der Navigation, sondern beim Laden der Zielroute.

### `/account` vor dem Fix

`getAccountOverview()` wartete nach dem zwingenden User-Read auf neun optionale
Datenquellen:

1. Payment Profile
2. Signature
3. Create Contribution Ledger
4. Graph Merge Candidates
5. Saved Workstates
6. manuelle Anlassraum-Serverentwürfe
7. Editorial Reviews
8. Factcheck Jobs
9. user-scoped Runtime Linkages

Die Loader waren nicht vollständig parallelisiert. Zuerst wurde eine Gruppe
abgewartet, danach Create Ledger, danach Graph Merge Candidates und erst danach
Saved Workstates. Kein äußerer Loader besaß eine Laufzeitgrenze. Eine Ablehnung
eines optionalen Loaders ließ zudem den vollständigen Overview ablehnen.

Der rote Timingtest reproduzierte beides ohne Provider- oder Production-Zugriff:

- Ein nie auflösender Factcheck-Loader ließ `getAccountOverview()` auch nach
  `2.000 ms` offen und Saved Workstates wurden noch gar nicht gestartet.
- Eine Ablehnung der Runtime Linkages ließ den vollständigen Account-Load
  ablehnen.

`/account` wartete anschließend zusätzlich unbegrenzt auf optionale Support-
Notifications. Ein zweiter roter Test belegte, dass die Page auch nach
`2.000 ms` noch nicht gerendert wurde, wenn nur dieser Read nie auflöste.

### Vergleich mit `/create`

`/create` ist kein unabhängiger Gegenbeweis für einen gesunden Account-
Read-Pfad. Die Route nutzt `getAccountOverview()` indirekt über
`getCreateEntitlementsForRequest()` und anschließend ein zweites Mal direkt.
Der manuelle Browsererfolg zeigt zuverlässig die vorhandene Session, kann aber
durch späteren Aufruf, warme Verbindungen oder inzwischen abgeschlossene Reads
eine vorher blockierte optionale Abfrage verdecken.

Der belegte Fehler liegt deshalb in der gemeinsam verwendeten, unbegrenzt
blockierenden Account-Aggregation. Das Standard-Loginziel `/account` macht ihn
unmittelbar als scheinbaren Login-Hänger sichtbar; der Fix schützt zugleich die
Account-Abhängigkeiten von `/create`.

## Minimaler Fix und Nachher-Evidence

`getAccountOverview()` startet alle neun optionalen Loader jetzt parallel. Ein
gemeinsamer kleiner Guard gibt jedem optionalen Read maximal `2.000 ms` und
liefert bei Timeout oder Fehler den bereits von den Account-Komponenten
unterstützten leeren Zusatzslice beziehungsweise `null`. Der zwingende
User-Read bleibt unverändert fail-closed; nur nachgelagerte optionale Daten
degradieren. Timeout-/Fehlersignale werden ohne User-ID, Secret oder Payload
geloggt.

Die optionalen Support-Ticket-/Notification-Reads der Account-Page nutzen
denselben Guard und laufen parallel. Der grüne Nachher-Test belegt:

- hängender Factcheck-Read: Account Overview ist bei exakt `2.000 ms` verfügbar;
- gestörte Runtime Linkages: Core Account bleibt verfügbar;
- hängende Support-Notifications: `/account` rendert bei exakt `2.000 ms`;
- Auth-Hook: Navigation startet weiterhin exakt mit der erfolgreichen API-
  Antwort (`150 ms` im deterministischen Test).

Die unveränderte Client-Abbruchgrenze der Registrierung liegt weiterhin bei
`15.000 ms`. Die bereits im Issue beschriebene synchrone Register-Route enthält
mehrere Folgearbeiten; sie ist nicht Ursache des aktuellen Post-Login-Befunds
und wurde in diesem belegten Minimalfix nicht umgebaut. Ein späterer Register-
Mutation-Slice darf diese Grenze nur mit eigener Konsistenz- und Delivery-
Evidence verändern.

## Sicherheits- und Betriebsgrenzen

- keine zweite Auth-, Session-, Credential- oder Challenge-Wahrheit
- kein 2FA-/Verification-Bypass
- keine Secret-, ENV-, Provider- oder Production-Änderung
- keine Production-Mutation
- keine pauschale Deaktivierung von Account-Funktionen
- kein Merge oder Deployment ohne bestehendes Human-/Review-Gate

## Verifikation

Fokussierter lokaler Lauf:

```text
13 Testdateien / 72 Tests grün
```

Er umfasst die neuen Account-Timingtests sowie die bestehenden Login-, 2FA-,
Redirect-, Replay-, Cookie-, Auth-Event- und Login-Shell-Verträge aus PR
`#519` sowie die fokussierten Register-Route-, Security- und Bridge-Verträge.

Weitere lokale Gates:

- Typecheck: grün
- Repository-Lint: grün
- `git diff --check`: grün
- isolierter Build auf Code-Commit `94b068ec`: UI-/Tri-Mongo-Prebuild,
  Page-Contract-Check, Next-Kompilierung und integrierter Typecheck grün; der
  anschließende Page-Data-Collect stoppt fail-closed an fehlenden Pflicht-ENV
  für JWT sowie Core-/PII-/Votes-/Graph-Stores. Es wurde keine ENV-Datei
  gelesen, verändert oder durch Platzhalter umgangen.

Exact-Head-CI/Vercel werden nach Push des Draft-PR dokumentiert. Ein realer
authentifizierter Browser-Smoke bleibt vom vorhandenen Production-Testkonto-
und Human-Gate abhängig und wird durch die deterministischen Tests nicht als
ausgeführt dargestellt.
