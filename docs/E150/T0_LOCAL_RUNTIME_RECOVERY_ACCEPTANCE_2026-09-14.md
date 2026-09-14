# T0 Local Runtime Recovery and Acceptance — 2026-09-14

Status: **lokale Auth-, SMTP- und Create-Abnahme durchgeführt; Operator-Notification bleibt Review-Gate**

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

## Auth, lokaler SMTP und geschützter Create-Pfad

Der optionale lokale Compose-Service `mailpit` wurde als SMTP-Sink auf
`127.0.0.1:1025` ergänzt; seine ausschließlich lokale Inbox ist über
`http://localhost:8025` erreichbar. Der Sink war zur Abnahme erreichbar
(`v1.21.8`) und enthielt die real zugestellten Registrierungs-,
Identitäts- und Login-Nachrichten. Es wurden weder Demo-Codes noch
fest verdrahtete OTPs verwendet.

Ein frisches lokales Konto `qa-auth@edebatte.org` wurde ausschließlich über
die Registrierungsoberfläche angelegt. Der Browser-Human-Check und
`POST /api/auth/register` lieferten `200` beziehungsweise `201`. Der über
Mailpit zugestellte Bestätigungslink aktivierte die E-Mail; anschließend wurde
der per Mailpit zugestellte Identitätscode über die normale
`/register/identity`-Oberfläche bestätigt. Die E-Mail-2FA-Einrichtung endete
mit `POST /api/auth/identity/email/start` `200` und
`POST /api/auth/identity/email/verify` `200`.

In einem neuen Browser-Kontext führte der Login mit frischem, per Mailpit
zugestelltem Login-Code ohne Hard Refresh direkt zu `/create`.
`POST /api/auth/login` und `POST /api/auth/verify-2fa` waren jeweils `200`;
die HttpOnly-Claims einschließlich `session_token` und `u_2fa` lagen vor.
Die gemessene lokale Login-bis-Zielroute-Laufzeit betrug 4.246 ms.

Der authentifizierte Beitrag
„Die Rentenbeiträge steigen immer weiter. Wir sollten endlich das Rentenalter
auf 70 erhöhen.“ wurde nach dem sichtbaren Datenschutz-Checkpoint über die
normale `/create`-Oberfläche verarbeitet. `POST /api/create/save`,
`/api/create/intelligent-followup` und `/api/create/context` lieferten `200`.
Der erzeugte `drafts`-Eintrag gehört dem QA-User; sein Einordnungs-Claim
referenziert dessen `draftId`. Die Einordnung zeigte Thema/Einordnung an;
es wurde nichts automatisch veröffentlicht.

Die Gastregression wurde anschließend in einem frischen Browserkontext erneut
gestartet. PostgreSQL (`5433`), Redis (`6379`) und `/api/topics?locale=de`
(`200`) blieben dabei erreichbar. Die vorhandene sichere Gast-Session- und
Intake-Prüfung wurde nicht gelockert. Ein separater kontrollierter
Create-Fehlerpfad mit vorgegebener sicherer Simulation ist auf diesem
Source-Head nicht verfügbar und wurde daher nicht erfunden.

## Verbleibende Gates

`OPERATOR-NOTIFICATIONS-01` bleibt auf `review`. Sein Branch enthält eine
separate persistierte Operator-Incident-Notification für Support-Tickets an
`qa-auth@edebatte.org`; diese Implementierung ist nicht Teil von `main` und
wurde nicht still übernommen. Auf dem aktuellen Source-Head ist daher
`OPERATOR_NOTIFICATION_IMPLEMENTATION_PRESENT=false`; die Operator- und
Support-Ticket-Abnahme lautet `BLOCKED_BY_REVIEW_OWNER`. Die lokale Mailpit-
Inbox belegt nur die oben genannten Auth-Nachrichten und nicht die noch nicht
übernommene Operator-Funktion.

## Nicht-Ziele

Keine Änderung an Produktions- oder Preview-Umgebungen, keine Migration-
Adoption, kein `migrate resolve`, kein Auth-/2FA-Bypass, kein Rate-Limiter-
Fallback und kein Versand an externe Empfänger.
