# Mongo Trust-Zone Topology — VOG + eDebatte

Stand: 22. September 2026

## Ziel

VoiceOpenGov und eDebatte werden vor dem Produktionsstart auf physisch getrennte MongoDB-Cluster pro kritischer Trust-Zone gestellt. Die Systeme bleiben eigenständig betreibbar. Der VOG→eDebatte-SSO-Handoff ist eine signierte Identitätsbrücke und kein gemeinsamer Datenbank-, Passwort- oder Session-Layer.

## Kanonische Produktionstopologie

| System | Atlas-Projekt / Cluster | Runtime-Env | Datenbankname | Zweck |
| --- | --- | --- | --- | --- |
| VoiceOpenGov | `VOG-Core-Prod` | `MONGODB_URI` | `vog_public` | operative/nicht direkt identifizierende VOG-Daten |
| VoiceOpenGov | `VOG-PII-Prod` | `PII_MONGODB_URI` | `vog_pii` | Member-PII, DOI, direkte Kontakte, Credentials, Sessions |
| eDebatte | `eDebatte-Core-Prod` | `CORE_MONGODB_URI` | `edebatte_core` | User-Core, Social, Onboarding, Referrals, operative Kernzustände |
| eDebatte | `eDebatte-PII-Prod` | `PII_MONGODB_URI` | `edebatte_pii` | Credentials, Identität, Adresse, Profil-PII, 2FA-nahe PII |
| eDebatte | `eDebatte-Votes-Prod` | `VOTES_MONGODB_URI` | `edebatte_votes` | Vote-/Swipe-/Abstimmungsdaten |

`AI_CORE_READER_MONGODB_URI` ist ein separater read-only Analysepfad und darf keine Schreibberechtigung auf Core/PII/Votes erhalten. Eine spätere physische Reader-Replik kann unabhängig von den fünf Writer-Trust-Zones betrieben werden.

## Nutzung der heute vorhandenen Atlas-Projekte

Da noch kein Produktionsbetrieb läuft, wird keine historische Infrastrukturkompatibilität erzwungen:

1. `VOG-Core-Prod` bleibt VoiceOpenGov Core.
2. `VOG-PII-Prod` bleibt VoiceOpenGov PII.
3. Das bisherige `VOG-Votes-Prod` wird vor Go-live als `eDebatte-Votes-Prod` neu eingeordnet/umbenannt oder sauber neu erstellt, sofern dort keine zu erhaltenden Daten liegen.
4. `eDebatte-Core-Prod` wird neu angelegt.
5. `eDebatte-PII-Prod` wird neu angelegt.

Vor Löschung, Umbenennung oder Wiederverwendung eines bestehenden Atlas-Projekts/Clusters ist dessen Datenbestand einmal zu inventarisieren. Auch im Pre-Production-Status werden vorhandene Daten nicht blind gelöscht.

## Harte Grenzen

- Kein MongoDB-Cluster wird zwischen VoiceOpenGov und eDebatte geteilt.
- VOG Core und VOG PII verwenden unterschiedliche Cluster-Hosts.
- eDebatte Core, PII und Votes verwenden drei unterschiedliche Cluster-Hosts.
- Production-Code darf eDebatte nicht über das generische Legacy-`MONGODB_URI`/`MONGODB_DB` auf einen gemeinsamen Store zurückfallen lassen.
- DB-User werden pro Anwendung und Trust-Zone mit Least Privilege angelegt. Ein Core-User bekommt keine PII- oder Votes-Rolle; ein PII-User keine Core-/Votes-Rolle usw.
- Secrets werden ausschließlich über lokale Secret-Dateien/Secret Stores und Vercel Environment Variables verteilt, nie über Git.
- VOG und eDebatte teilen nur `VOG_EDB_AUTH_HANDOFF_SECRET`; dieser Secret-Wert ist kein Datenbank-Credential.
- VOG- und eDebatte-Sessions bleiben unabhängig. Ein Ausfall von VOG darf einen bestehenden eDebatte-Nutzer nicht am lokalen eDebatte-Login hindern.
- Ein erstmals ausschließlich über VOG-SSO provisionierter eDebatte-Account kann über den eDebatte-eigenen Passwort-Reset ein lokales Passwort setzen. Dieser Flow nutzt eDebatte-Mailzustellung und gehashte, zeitlich begrenzte Reset-Tokens im eDebatte-PII-Store; er benötigt keine laufende VOG-Session.

## Produktions-Environment

### VoiceOpenGov

```text
MONGODB_URI=<VOG-Core-Prod connection string>
VOG_DB_NAME=vog_public
PII_MONGODB_URI=<VOG-PII-Prod connection string>
PII_DB_NAME=vog_pii
```

### eDebatte

```text
CORE_MONGODB_URI=<eDebatte-Core-Prod connection string>
CORE_DB_NAME=edebatte_core
PII_MONGODB_URI=<eDebatte-PII-Prod connection string>
PII_DB_NAME=edebatte_pii
VOTES_MONGODB_URI=<eDebatte-Votes-Prod connection string>
VOTES_DB_NAME=edebatte_votes
```

## Atlas-User / Rollen

Empfohlene getrennte Database Users:

- `vog-core-app`: readWrite nur `vog_public` auf `VOG-Core-Prod`.
- `vog-pii-app`: readWrite nur `vog_pii` auf `VOG-PII-Prod`.
- `edb-core-app`: readWrite nur `edebatte_core` auf `eDebatte-Core-Prod`.
- `edb-pii-app`: readWrite nur `edebatte_pii` auf `eDebatte-PII-Prod`.
- `edb-votes-app`: readWrite nur `edebatte_votes` auf `eDebatte-Votes-Prod`.
- Reader/Analytics-Credentials separat und grundsätzlich read-only.

Keine Anwendung erhält Atlas-Admin-Credentials als Runtime-Credential.

## Datenschutz-/Account-Pfade

- Datenschutzexport liest die betreffenden Accountdaten zonenbewusst aus eDebatte Core, PII und Votes; er darf keinen globalen Shared-Mongo-Handle verwenden.
- Der historische direkte Hard-Delete-Endpunkt `/api/gdpr/delete` ist fail-closed stillgelegt. Kontolöschung läuft über `/api/account/self-service`, wo eine bestehende Session und Passwort-Reauthentifizierung verlangt und ein nachvollziehbarer Löschauftrag persistiert wird.
- Ein späterer physischer Lösch-Worker muss dieselben Core/PII/Votes-Grenzen einhalten und darf niemals VOG-Datenbanken als eDebatte-Löschziel behandeln.

## Cutover-Reihenfolge vor Go-live

1. Datenbestand der drei vorhandenen Atlas-Projekte inventarisieren.
2. Zwei neue eDebatte-Projekte/Cluster (`Core`, `PII`) anlegen und den Votes-Cluster eindeutig eDebatte zuordnen.
3. Pro Cluster einen eigenen Least-Privilege Database User anlegen.
4. Lokale `.env.local`-Werte auf die fünf Zielcluster setzen; `.envrc` lädt `.env.local`, statt Secrets zu duplizieren.
5. VOG PII-Dry-Run und ggf. PII-Copy ausführen; kein Purge vor erfolgreichem Smoke-Test.
6. eDebatte Core/PII/Votes Connectivity einzeln testen.
7. VOG Registrierung → DOI → Passwort → Login/Logout testen.
8. eDebatte Registrierung → lokaler Login → 2FA-Pfad testen.
9. VOG→eDebatte-Handoff testen; anschließend für einen neu provisionierten eDebatte-Account den eDebatte-eigenen Passwort-Reset testen und danach lokalen Login ohne VOG durchführen.
10. Erst nach grünen CI-/Smoke-Tests Produktions-Environment in Vercel aktivieren.

## Rollback-Prinzip

Bis zur vollständigen Verifikation wird kein Quellbestand gelöscht. Ein Rollback stellt Env-Verbindungen und das letzte grüne Deployment wieder her; er vereinigt niemals wieder Trust-Zones auf einem gemeinsamen MongoDB-Cluster.
