# T0 Local Runtime Recovery and Acceptance — 2026-09-14

Status: **teilweise durchgeführt; verbleibende Abnahme-Gates manuell**

## Lokaler Stack

- Basis: `origin/main@b3dd3603d1874cf4572100d697ec1150a7ee50f0`.
- Runtime: Node `v20.20.2`, pnpm `10.17.1`.
- PostgreSQL: der vorhandene Homebrew-14-Cluster war durch eine verwaiste
  `postmaster.pid` blockiert. Die referenzierte PID war kein PostgreSQL-Prozess;
  die Datei wurde recoverbar umbenannt und der Cluster auf `localhost:5433`
  gestartet. Die lokale Entwicklungsrolle `dev` und die frische Datenbank `vog`
  entsprechen `apps/web/.env.example`.
- Mongo: bestehender Compose-Service `mongo:6` auf `localhost:27017`; ein echter
  lokaler Core-Read/Write gegen `core_prod.t0_runtime_health` war erfolgreich.
- Redis: lokal auf `localhost:6379` erreichbar.
- Web-Schema: `prisma db push --schema=prisma/web/schema.prisma --skip-generate`
  war auf der frischen lokalen Datenbank erfolgreich und beim zweiten Lauf
  idempotent. `prisma migrate deploy` erkennt auf `main` keine neben
  `prisma/web/schema.prisma` liegende Baseline; die getrennte Baseline bleibt
  Eigentum von `DB-MIGRATION-BASELINE-01` und wurde nicht übernommen oder
  umgangen.

## Reale Node-20-Prüfung

Die Node-25-Dev-Instanz wurde kontrolliert beendet und durch eine Node-20.20.2-
Dev-Instanz ersetzt. Für diesen Prozess wurden die Tri-Mongo-URIs auf den
lokalen Container begrenzt. Ein lokaler, nicht eingecheckter
`CREATE_ANON_SESSION_SECRET` war erforderlich; ohne diesen Schlüssel liefert
die signierte anonyme Session absichtlich `CREATE_SESSION_UNAVAILABLE`.

| Prüfung | Ergebnis |
| --- | --- |
| `GET /api/topics?locale=de` | `200`, leere frische lokale Themenmenge |
| Browser: Gastbeitrag Rentenalter | `POST /api/create/session` `200`, danach `POST /api/create/intake` `202` |
| Gast-UI | wahrheitsgemäßer Annahmestatus, kein Ticket- oder Erfolgsvortäuschen |
| Persistenter Rate Limiter | aktiv gegen lokalen Core-Mongo; nicht durch In-Memory-Fallback ersetzt |

## Verbleibende Gates

Die frische lokale Core-Datenbank enthält keine Benutzer. Es liegen keine
dedizierten lokalen Testkonto-/Passwort-/2FA-Daten vor. Deshalb wurden weder
Login/2FA noch Save, Intelligent Follow-up, Support-Ticket-Persistenz oder
Post-Login-Transition als bestanden behauptet.

`OPERATOR-NOTIFICATIONS-01` bleibt auf `review`. Sein Branch enthält eine
separate persistierte Operator-Incident-Notification für Support-Tickets an
`qa-auth@edebatte.org`; diese Implementierung ist nicht Teil von `main` und
wurde nicht still übernommen. Reale Inbox-Zustellung benötigt zusätzlich einen
lokalen SMTP-Provider und einen menschlich prüfbaren Empfangsnachweis.

## Nicht-Ziele

Keine Änderung an Produktions- oder Preview-Umgebungen, keine Migration-
Adoption, kein `migrate resolve`, kein Auth-/2FA-Bypass, kein Rate-Limiter-
Fallback und kein Versand an externe Empfänger.
