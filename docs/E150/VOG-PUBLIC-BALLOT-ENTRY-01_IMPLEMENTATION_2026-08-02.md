# VOG-PUBLIC-BALLOT-ENTRY-01 · Implementierung und Evidence

Stand: 2026-08-02

Branch: `fix/vog-public-ballot-entry-01`

Draft-PR: `#557`

Basis vor Implementierung: `origin/main@56aea8e4d336328482ad1ca886f8ed942f18dfe0`

## Ergebnis

Der Slice ergänzt einen direkten, VOG-spezifischen Public-Ballot-Pfad auf der
bestehenden QR-Frage- und Vote-Persistenz:

```text
/vog/fragen/{setCode}/{questionId}
  ?source=vote4gov
  &origin=voiceopengov
  &origin_id=vog-question-01
  &locale=de
```

Die Route öffnet die konkrete Frage ohne vorgeschalteten Login. Sie verwendet
weder `/qr/[code]` noch eine kopierte Resolver-, Redirect- oder Auth-Runtime aus
PR `#520`. `source`, `origin`, `origin_id` und `locale` werden ausschließlich als
validierte Metadaten behandelt. Der serverseitige Release-Contract bleibt die
einzige Freigabewahrheit.

## Root Cause und reale Runtime vor diesem Slice

### Vorhandene Einstiege

- Im eDebatte-Repo existierte kein dedizierter Vote4Gov- oder VOG-Fragenlink.
- `/qr/[qrId]` löste QR-Codes über `/api/qr/resolve` auf. Aktive
  `qr_question_sets` wurden als `set` an `QuestionSetClient` übergeben.
- `QuestionSetClient` lud `/api/qr/sets/[code]` und sendete Stimmen an
  `/api/qr/sets/[code]/vote`.
- Allgemeine VoiceOpenGov-Links im Repo führten zur Initiative oder zu
  Membership-/Informationsflächen, nicht zu einer konkreten VOG-Grundfrage.
- Es gab im Repo weder eine produktive VOG-Grundfragen-Fixture noch einen
  kanonischen `vog-question-01`-Datensatz. Deshalb war ein konkreter öffentlicher
  End-to-End-Fragenlink vor diesem Slice nicht nachweisbar.

### Login- und Verifikations-Gate

- Die QR-Vote-Route verlangte bei `publicAttribution === "public"` zuerst
  `u_id` und anschließend `u_verified === "1"`.
- `allowAnonymousVoting` war kein eigenständiger Public-Release-Vertrag. Das
  Feld entschied nur, wie die technische `sessionId` abgeleitet wurde.
- Die Stream-Vote-Route koppelte zusätzlich
  `requireVerifiedParticipants`, `publicAttribution` und
  `allowAnonymousVoting` an denselben Vote-Pfad.

### Bereits mögliche Gaststimmen

- Die öffentliche QR-Set-Erstellung setzte Fragen ohne Creator-Kontext auf
  `publicAttribution: "hidden"` und `allowAnonymousVoting: true`.
- Damit waren Gaststimmen technisch bereits möglich. Diese Konfiguration
  belegte aber weder VoiceOpenGov-Herkunft noch öffentliche VOG-Freigabe oder
  demokratische Legitimationsklasse.
- Dieser Slice ändert die globale Bedeutung beider Felder nicht. Eine VOG-Frage
  benötigt zusätzlich einen vollständigen `vog-public-ballot-v1`-Release.

### Attribution, Legitimation und Mehrfachstimmen

- `publicAttribution` vermischte öffentliche Namenszuordnung mit einem
  Login-/Verifikations-Gate.
- `allowAnonymousVoting` vermischte Gastzugang mit der technischen
  Teilnehmerkennung.
- Eine ausdrückliche Legitimationsklasse für offene Konsultation gegenüber
  verifizierter VOG-Mitgliederentscheidung fehlte.
- Anonyme QR-Stimmen wurden aus Roh-IP, vollständigem User-Agent, Set-Code und
  Frage gehasht. Die Rohwerte landeten nicht im Vote-Dokument, bildeten aber
  allein die pseudonyme Session-Grundlage. Der QR-Resolver schrieb außerdem
  Roh-IP und vollständigen User-Agent in `qr_scans`; dieser von PR `#520`
  geführte Resolverpfad wurde hier nicht verändert oder verwendet.
- `updateOne(..., { upsert: true })` aktualisierte gleiche Session-/Frage-Filter,
  aber es war im betrachteten QR-Pfad kein dedizierter Unique Index für diese
  Idempotenz erkennbar.
- Die QR-Ergebnisprojektion aggregierte alle Stimmen einer Frage ohne
  Beteiligungs- oder Legitimationsklasse.

### Produktiv, Fixture, Vertrag oder geplant

| Teil | Wahrheitsstand vor dem Slice |
| --- | --- |
| QR-Set GET und Vote-POST | produktiver Codepfad |
| `allowAnonymousVoting` / `publicAttribution` | produktive QR-/Stream-Felder mit überlagerter Semantik |
| IP-/User-Agent-basierte Session | produktiver QR-/Stream-Code |
| QR-Summary | produktive, nicht nach Legitimation getrennte Projektion |
| VOG-Public-Ballot-Release | nicht vorhanden |
| Direkter Vote4Gov-/VOG-Fragenlink | nicht vorhanden |
| 50 VOG-Grundfragen | nicht als produktive Repo-Daten vorhanden; weiterhin außerhalb dieses Slices |
| Verifiziertes VOG-Mitgliedermandat | Governance-/Eligibility-Entscheidung weiterhin nicht implementiert |

## Zugangs-, Attributions- und Legitimationsmodell

| Dimension | Neuer Vertrag |
| --- | --- |
| Zugang | `accessMode: "public_guest"` plus `publicRelease: true` und `publicVotingEnabled: true` |
| Attribution | `attributionMode: "hidden"`; keine öffentliche Namenszuordnung |
| Legitimation | `legitimacyClass: "open_public_consultation"` |
| gespeicherte Gastklasse | `participationClass: "open_guest"` |
| getrennte Mitgliederklasse | `participationClass: "verified_vog_member"` wird ausschließlich getrennt projiziert; dieser Slice erzeugt sie nicht |
| Ergebnisstatus | `public_consultation`, niemals repräsentativer Bevölkerungswille |

Der Release ist fail-closed und verlangt gleichzeitig:

- aktives bestehendes QR-Fragen-Set,
- bestehende Frage mit `publicAttribution: "hidden"`,
- bestehende Frage mit `allowAnonymousVoting: true`,
- Contract-Version `vog-public-ballot-v1`,
- ausdrückliche Public- und Vote-Freigabe,
- VOG-Origin-ID,
- DE- und EN-Fassung mit identischer Optionsanzahl,
- mindestens eine HTTPS-Quelle und eine Gegenposition,
- Lifecycle und Ergebnis-Sichtbarkeitsregel.

Nur ein bestehender Admin mit dem kanonischen Admin-/2FA-Gate kann den
additiven Release über
`PUT /api/admin/vog/public-ballots/[code]/[questionId]` setzen. Der Endpunkt
ändert `allowAnonymousVoting` und `publicAttribution` nicht still; inkompatible
Fragen werden mit `409` abgelehnt. Release-Mutationen verlangen zusätzlich
Same-Origin, `Sec-Fetch-Site: same-origin` und einen expliziten CSRF-Intent.

## Datenschutz, Idempotenz und Missbrauchsschutz

- Beim ersten erfolgreichen Vote wird ein zufälliges 256-Bit-Token als
  erstseitiges `HttpOnly`-Cookie gesetzt.
- Cookie: Host-only, `SameSite=Lax`, `Secure` in Production, Pfad `/`, Laufzeit
  90 Tage.
- Im Vote-Dokument liegt ausschließlich SHA-256 des Zufallstokens.
- Der neue Vote-Datensatz enthält weder Roh-IP noch vollständigen User-Agent.
- IP wird nur im Requestspeicher gehasht und als nicht umkehrbarer Subject-Hash
  an das getrennte kurzlebige persistente Rate-Limit übergeben.
- Gasttoken und IP besitzen getrennte Minutenlimits. Fällt der persistente
  Limiter aus, schlägt die Mutation fail-closed fehl.
- Vote-POST verlangt Same-Origin, `Sec-Fetch-Site: same-origin`, expliziten
  CSRF-Intent und ein begrenztes Request-Volumen.
- Ein partieller Unique Index über Set, Frage, Beteiligungsklasse und
  Gasttoken-Hash macht den Upsert auch bei Parallelität idempotent.
- Eine neue Auswahl aktualisiert das vorhandene Dokument. Sie erzeugt keine
  zweite Stimme.
- `source`, `origin` und `locale` werden allowlist-validiert und nur beim ersten
  Insert gespeichert. `origin_id` stammt immer aus dem Release-Contract und
  kann durch Query oder Body nicht überschrieben werden.
- Das Gasttoken wird nicht mit `u_id`, `userHash` oder einem späteren Login
  verbunden.

Der sichtbare Methodenhinweis bleibt bewusst ehrlich: Ohne verifizierte
Identität kann Mehrfachteilnahme reduziert, aber nicht vollständig verhindert
werden.

## Beteiligungspass

Nach einer erfolgreichen Gaststimme beziehungsweise bei einem wiederkehrenden
Gasttoken zeigt die Oberfläche:

- eigene Auswahl und idempotente Aktualisierung,
- Stimmen insgesamt,
- offene Gaststimmen,
- explizit verifizierte VOG-Mitgliedsstimmen als getrennte Klasse,
- Optionen und Zählstände,
- Release-Zeitraum,
- Status `Öffentliche Konsultation`,
- Nicht-Repräsentativitäts- und Mehrfachteilnahmehinweis,
- Quellen und Gegenpositionen,
- freiwilligen Login erst nach der Stimme.

Eine spätere Mitglieder-Vote-Mutation ist nicht Teil dieses Slices. Solange
kein freigegebener VOG-Membership-/Eligibility-Vertrag existiert, erzeugt der
neue Gastpfad niemals `verified_vog_member` und konvertiert keine Gaststimme.

## Zustände, Sprache und Accessibility

- Missing/ungültiger Release: fail-closed ohne Vote-CTA; Herkunftsparameter
  können den Zustand nicht öffnen.
- Scheduled und Closed: konkrete Frage bleibt lesbar, Vote-Controls sind
  deaktiviert.
- Bereits abgestimmt: Auswahl und Update-Möglichkeit statt Doppelzählung.
- Rate limit: eigener `429`-Zustand mit `Retry-After`.
- Network: keine Erfolgsbestätigung und keine Offline-Synchronisationsbehauptung.
- Ergebnisprojektion nach erfolgreichem Write: Vote-Erfolg bleibt ehrlich
  bestätigt; ein separat ausgefallener Beteiligungspass wird als vorübergehend
  nicht verfügbar ausgewiesen.
- DE/EN, getrennte Original- und Lesesprache.
- Native Radio-Inputs, `fieldset`/`legend`, Tastaturbedienung, sichtbare
  Touch-Ziele, `aria-live`-Status und fokussierbare Statusmeldung.
- Kompakter Mobile-first-Kopf zeigt Frage, Kurzkontext, Optionen und
  Beteiligungsklasse vor allgemeiner Navigation oder Login.

## Konkrete Kollisionsmatrix PR #557 ↔ PR #520

PR `#520` bleibt offener Draft auf `fix/qr-public-entry-02-main-sync`. Kein
Commit wurde gemergt, cherry-gepickt oder nachgebaut. Gegen den bei Start
gelesenen Dateistand von PR `#520` ergibt sich:

| Von PR #520 geführte Datei | Änderung in PR #557 | Ergebnis |
| --- | --- | --- |
| `apps/web/src/app/api/auth/2fa/email-code/shared.ts` | keine | geschützt |
| `apps/web/src/app/api/auth/2fa/select-method/route.ts` | keine | geschützt |
| `apps/web/src/app/api/auth/login/route.ts` | keine | geschützt |
| `apps/web/src/app/api/auth/sharedAuth.ts` | keine | geschützt |
| `apps/web/src/app/api/auth/verify-2fa/route.ts` | keine | geschützt |
| `apps/web/src/app/api/streams/sessions/[id]/agenda/route.ts` | keine | geschützt |
| `apps/web/src/app/login/LoginPageClient.tsx` | keine | geschützt |
| `apps/web/src/app/qr-studio/QrStudioTargetPreview.tsx` | keine | geschützt |
| `apps/web/src/app/qr-studio/page.tsx` | keine | geschützt |
| `apps/web/src/app/qr/[qrId]/page.tsx` | keine | geschützt |
| `apps/web/src/app/runden/RundenShareActions.tsx` | keine | geschützt |
| `apps/web/src/app/studio/StudioCodeWorkspaceClient.tsx` | keine | geschützt |
| `apps/web/src/app/studio/StudioTargetWorkspace.tsx` | keine | geschützt |
| `apps/web/src/app/studio/page.tsx` | keine | geschützt |
| `apps/web/src/components/auth/TwoFactorSetupClient.tsx` | keine | geschützt |
| `apps/web/src/features/create/finalizeRedirect.ts` | keine | geschützt |
| `apps/web/src/features/qr/publicEntry.tsx` | keine | geschützt |
| `apps/web/src/features/qr/security.ts` | keine | geschützt |
| `apps/web/src/features/wrapper/mobileAppShellContract.ts` | keine | geschützt |
| `apps/web/src/features/wrapper/mvpSurfaceContract.ts` | keine | geschützt |
| `apps/web/src/features/wrapper/productSurfaceLayoutContract.ts` | keine | geschützt |
| `apps/web/src/hooks/useLoginFlow.ts` | keine | geschützt |
| `apps/web/src/lib/security/internalNavigation.ts` | keine | geschützt |
| `apps/web/tests/auth-2fa-login-flow.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/auth-shared.redirect-contract.test.ts` | keine | geschützt |
| `apps/web/tests/content-release-workbench.test.ts` | keine | geschützt |
| `apps/web/tests/internal-navigation-security.contract.test.ts` | keine | geschützt |
| `apps/web/tests/legacy-qr-routes.redirect.test.ts` | keine | geschützt |
| `apps/web/tests/live-campaign-entry.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/live-qr-entry.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/mobile-app-shell-contract.test.ts` | keine | geschützt |
| `apps/web/tests/mobile-entry-routes.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/product-surface-shell.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/qr-studio-security.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/qr-studio-target-ui.security.test.tsx` | keine | geschützt |
| `apps/web/tests/qr-studio-target.contract.test.ts` | keine | geschützt |
| `apps/web/tests/runden-qr-participation-language.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/share-ready-asset-contract.test.ts` | keine | geschützt |
| `apps/web/tests/stream-agenda-qr-target.security.test.ts` | keine | geschützt |
| `apps/web/tests/stream-agenda-route-qr.security.test.ts` | keine | geschützt |
| `apps/web/tests/studio-code-workspace.error-state.test.tsx` | keine | geschützt |
| `apps/web/tests/topic-public-page.contract.test.tsx` | keine | geschützt |
| `apps/web/tests/wrapper-mvp-surface-contract.test.ts` | keine | geschützt |
| `docs/E150/QR-PUBLIC-ENTRY-02_2026-07-25.md` | keine | geschützt |
| `docs/E150/QR_INTERNAL_REDIRECT_HARDENING_01.md` | keine | geschützt |
| `docs/E150/STUDIO-OPERATOR-EVENT-DISTRIBUTION-01_2026-07-29.md` | keine | geschützt |
| `features/anlassraum/shareReadyAssetContract.ts` | keine | geschützt |
| `features/qr/qrStudioTargetContract.ts` | keine | geschützt |
| `features/stream/publicRuntime.ts` | keine | geschützt |

Dateiüberschneidung: **0**. Auch die vom Nutzer zusätzlich als #520-geführt
markierte `apps/web/src/app/qr/[qrId]/QuestionSetClient.tsx` bleibt unverändert.

Minimale spätere Integration nach Merge/Rebase von PR `#520`:

- optionaler QR-Code oder Studio-Link darf auf den bereits kanonischen
  `/vog/fragen/...`-Href zeigen;
- Ziel-/Redirectvalidierung dafür bleibt vollständig Eigentum von PR `#520`;
- dieser PR benötigt keine Änderung an `/qr/[code]`, Auth-Redirects oder
  `features/qr/security.ts`.

## Übrige offene PRs bei Start

| PR | Scope | Direkte Dateiüberschneidung mit diesem Slice |
| --- | --- | --- |
| `#558` | Voxy Modern Character Runtime Foundation | 0 |
| `#556` | Marketing Regional Agent Runs | 0 |
| `#555` | Ökosystem-Markenvertrag, `OpenTasks.md` | 0; `OpenTasks.md` bleibt hier unverändert |
| `#553` | Agentic-Runtime-Dokumentation | 0 |
| `#536` | Admin Region | 0 |
| `#527` | Home/Voxy Landing, `OpenTasks.md` | 0; `OpenTasks.md` bleibt hier unverändert |
| `#521` | Foundation Canon und `AGENTS.md` | 0; nur als Referenz gelesen |
| `#520` | QR/Auth/Redirect/Security | 0; vollständige Matrix oben |

Die zwischenzeitlichen Vote4Gov-Änderungen zu Abo-Demonstration,
Cookie-/Tracking-Kritik und ausgeblendetem Atlas sind nicht Bestandteil dieses
eDebatte-PRs.

## Geänderte Flächen

- Domain-Contract: `features/vog/publicBallotContract.ts`
- VOG-Readmodel und Vote-Security: `apps/web/src/features/vog/*`
- additive öffentliche Route: `apps/web/src/app/vog/fragen/[code]/[questionId]/*`
- additive Public-Vote-API: `apps/web/src/app/api/vog/public-ballots/...`
- additive Admin-/2FA-Release-API: `apps/web/src/app/api/admin/vog/public-ballots/...`
- bestehender Vote-Dokumenttyp um additive Projektionsfelder erweitert
- fokussierte Contract-, Readmodel-, Release-, Vote-, Page- und Render-Tests

`docs/E150/OpenTasks.md` bleibt absichtlich vollständig unverändert und muss
vor Abschluss byte-identisch zu `origin/main` nachgewiesen werden.

## Tests und Smokes

- Fokussierte VOG-Suite: `6` Testdateien, `24/24` Tests grün.
- VOG plus angrenzende QR-, Stream-, Rate-Limit- und Auth-Regression:
  `18` Testdateien, `84/84` Tests grün.
- Production Guardrails: Public Routes `7/7`, Admin Review `6/6`, Publish
  Guardrails `23/23`; insgesamt `36/36` grün.
- `pnpm -C apps/web run typecheck`: grün.
- `pnpm -C apps/web run lint`: grün.
- `git diff --check`: grün.
- Security-Scan im neuen Scope: kein Roh-IP-, User-Agent-, `u_id`-,
  `u_verified`- oder `userHash`-Write; IP erscheint ausschließlich als sofort
  gehashter Rate-Limit-Subject.
- Vollständiger lokaler Build: Page-Contract-Check, Compiler und TypeScript
  grün; Page-Data-Collect stoppt am bestehenden secret-freien Worktree-Gate
  wegen fehlender Pflicht-ENV (`JWT_SECRET`, Datenbank- und Graph-Runtime). Es
  wurde keine ENV-Datei gelesen oder verändert und der Build wird deshalb
  ausdrücklich nicht als vollständig grün gewertet.

Der vollständige Vercel-Build und Preview-Smoke werden nach dem Push über die
bestehenden Checks von Draft-PR `#557` verifiziert und im PR dokumentiert.

## Bewusst offen

- Keine der 50 VOG-Grundfragen wird in diesem PR erfunden oder automatisch
  veröffentlicht. Eine reale Frage muss über den Admin-/2FA-Release mit
  freigegebenen DE/EN-Texten, Quellen und Gegenpositionen gebunden werden.
- Der echte externe Vote4Gov-/VoiceOpenGov-Link muss im jeweils zuständigen
  externen Produkt auf den hier erzeugten `publicHref` gesetzt und in Preview
  beziehungsweise Production manuell gesmoked werden.
- Ein verifiziertes VOG-Mitgliedermandat benötigt weiterhin einen freigegebenen
  Membership-, Eligibility-, Doppelzählungs- und Consent-Vertrag. Der Slice
  projiziert die Klasse getrennt, erzeugt sie aber nicht.
- Kein Merge, kein Ready-for-Review und kein Deployment erfolgt aus diesem PR.

## Main-Synchronisierung nach Merge von PR #562 · 2026-08-03

### Exakte Basis und Merge-Ergebnis

- Vorheriger PR-Head: `ae36a65772bb0c6d65282fc5db591141e17f069a`.
- Integrierter Main-Stand und finaler Merge-Commit von PR `#562`:
  `aa228773fcf87713c32f1645967a03cbac0a20e0`.
- Lokaler konfliktfreier Merge-Head vor diesem Evidence-Nachtrag:
  `0ddaa74763cd3df0417d73cc34b7c352bcbf1481`.
- Mergekonflikte: **0**. Die seit der gemeinsamen Basis von diesem Branch und
  `origin/main` veränderten Dateimengen hatten **0** Überschneidungen.
- Objektiv notwendige Codeänderungen nach der Synchronisierung: **keine**.
  Weder die Vote4Gov-Artikelregistry noch Auth-, Session-, Topic-, QR-, Stream-
  oder Security-Flächen wurden durch diesen Closing-Pass verändert.

### Kompatibilität mit dem gemergten Vote4Gov-Handoff

- Der kanonische Public-Ballot-Pfad bleibt
  `/vog/fragen/[code]/[questionId]`.
- Der zentrale Vertrag bleibt Eigentum dieses Slices und exportiert mit
  `buildVogPublicBallotHref` genau den kleinen Baustein für einen späteren
  Adapter.
- Der auf Main gemergte Adapter bleibt bis zu einer ausdrücklich freigegebenen
  Folgeintegration unverändert bei `Public Ballot noch nicht freigegeben`,
  `canWrite: false` und `publicHref: null`.
- Die serverseitige Vote4Gov-Artikelregistry bleibt leer. Issue `#564` wurde
  nicht aktiviert; es gibt kein reales Artikelrelease und kein Auto-Publish.
- Gaststimmen bleiben `open_public_consultation` / `open_guest`.
  `verified_vog_member` wird weder automatisch erzeugt noch aus einer
  Gaststimme oder lokalen Vote4Gov-Vormerkung abgeleitet.
- Der gemeinsame Main-Authpfad behält Gast, Auth-Unknown und authentifizierte
  Nutzer als getrennte Wahrheiten. Dieser PR führt keine ältere Login-, Auth-
  oder Sessionannahme wieder ein.

### Erneute Validierung auf synchronisiertem Stand

Alle lokalen Läufe erfolgten unter Node `20.20.2`:

- fokussierte VOG-Public-Ballot-Suite: `6` Dateien, `24/24` Tests grün;
- Vote4Gov-Kontext-Handoff plus Auth-/Session-/Topic-Regression: `12` Dateien,
  `87/87` Tests grün;
- QR-/Stream-/Rate-Limit-Regression: `16` Dateien, `29` Tests grün, ein bereits
  als `skip` markierter Vote-Stats-Test unverändert übersprungen;
- Production Guardrails: Public Routes `7/7`, Admin Review `6/6`, Publish
  Guardrails `23/23`; insgesamt `36/36` grün;
- Typecheck: grün;
- vollständiger Lint: grün;
- vollständiger Production Build mit ausschließlich `apps/web/.env.example`
  im Prozess: grün; `256` Seitenverträge ohne Verstoß, Compiler und TypeScript
  grün, statische Generierung `322/322`;
- `docs/E150/OpenTasks.md` ist blob- und byte-identisch zu `origin/main` und
  bleibt im PR-Diff unverändert.

### Aktuelle Fremd-PR-Kollisionen

Die Dateilisten aller offenen Fremd-PRs wurden auf ihren aktuellen Heads gegen
die `16` Dateien dieses PRs geprüft. Direkte Überschneidung: **0**.

| PR | Geprüfter Head | Überschneidung |
| --- | --- | ---: |
| `#565` | `0e57e67869bcd98327078424d3fb7b76df4d56df` | 0 |
| `#561` | `5f6af8ab6fb125a7d222ef915ec4caafe61def01` | 0 |
| `#558` | `cbd50fe4221c50f64e3368f6c0de04069448412e` | 0 |
| `#556` | `4c6e208b6505964723632ebc16512f7c810b143e` | 0 |
| `#555` | `29a20906bd32fe766f7e21f64809a5aa8be020c7` | 0 |
| `#553` | `976c580f85b0632cbf78ad1392c663d9949bbe10` | 0 |
| `#536` | `cce473fa8436e10e42d7b7ceb102393b8b6d7f1e` | 0 |
| `#527` | `e41211a9dc290692569674b3910ab018c4b8082b` | 0 |
| `#521` | `a347f9f4725dab9eb4387ccdf2e613f86b15d9b8` | 0 |
| `#520` | `1c7cec7f0c16372b8804d794915b327d3f558173` | 0 |

PRs `#565` und `#555` führen parallel `docs/E150/OpenTasks.md`; diese Datei
wurde deshalb ausschließlich aus `origin/main` übernommen und nicht editiert.

### Verbleibende manuelle Gates

- unabhängiger Preview-Smoke für Public Ballot sowie DE/EN, Desktop, Mobile,
  Tastatur, Fokus und Screenreader;
- reale Vote4Gov-Artikelaktivierung ausschließlich nach Erfüllung der
  manuellen Gates aus Issue `#564` und in einem getrennten freigegebenen Slice;
- menschliche Review- und Mergeentscheidung.

Dieser PR bleibt Draft. Kein Ready-for-Review, Merge, Deployment oder reale
Freigabe erfolgt aus diesem Closing-Pass.

## Offener Mehrsprachenvertrag · 2026-08-03

Der zunächst auf eine feste DE/EN-Paarung begrenzte Sprachvertrag wurde im
bestehenden Draft-PR auf einen offenen locale-basierten Vertrag erweitert.

### Kanonischer Sprach- und Optionsvertrag

- `translations` ist eine streng validierte Locale-Map mit kanonischen
  BCP-47-Schlüsseln. Weitere gültige Locale-Tags wie `pt-BR` benötigen keine
  Schemaänderung.
- Bedienkopien und Regressionen decken initial `de`, `en`, `fr`, `es`, `tr`
  und `ar` ab.
- `originalLocale`, `readingLocale`, `uiLocale` und `outputLocale` werden im
  Readmodel, Vote-Handoff und Origin-Metadatum getrennt geführt.
- Query-Locale-Werte werden nur akzeptiert, wenn sie zur initialen
  UI-Allowlist oder zu einer serverseitig freigegebenen Übersetzung gehören.
  Ungültige, duplizierte oder unbekannte Werte fallen sichtbar auf den
  Originaltext zurück.
- Fehlende Sprachfassungen zeigen einen expliziten Hinweis. Es wird weder eine
  automatische noch eine KI-generierte Übersetzung behauptet oder erzeugt.
- Arabische Lesesprache setzt `lang="ar"` und `dir="rtl"`.
- Die bestehenden Frage- und Options-IDs bleiben sprachunabhängig. Jede
  Übersetzung muss exakt dieselben Options-IDs führen; fehlende, zusätzliche
  oder unterschiedlich viele Optionen machen den Release fail-closed
  ungültig.
- Stimmen und Ergebnisaggregation verwenden ausschließlich die stabilen
  Options-IDs. Nur die Ergebnisbeschriftung folgt `outputLocale`; Sprache ist
  kein Aggregationsschlüssel.
- Übersetzungsobjekte sind strikt auf Titel, Kontext und Optionslabels
  begrenzt. Sie können weder Release, Lifecycle, Berechtigung,
  Beteiligungsklasse noch Ergebnisstatus erzeugen oder verändern.
- Quellen-URLs, Gegenpositions-URLs, Release, Lifecycle und Ergebnisstatus
  bleiben außerhalb der Übersetzungs-Map kanonisch und sprachunabhängig.

### Regressionen und Validierung

Lokale Abschlussprüfung unter Node `20.20.2`:

- fokussierte Public-Ballot-Suite: `6` Dateien, `38/38` Tests grün;
- DE, EN, FR, ES, TR und AR einschließlich RTL: grün;
- Sprachwechsel mit erhaltener eigener Auswahl: grün;
- identische stabile Options-IDs und fail-closed Optionsmismatch: grün;
- unbekannte, ungültige, duplizierte und fehlende Locale: grün;
- keine Sprachaufspaltung der Ergebniszählung: grün;
- Mobile-, Tastatur- und Screenreader-Verträge: grün;
- Vote4Gov-/Topic-/Auth-/Session-Regression: `12` Dateien, `87/87` Tests grün;
- Production Guardrails: `36/36` Tests grün;
- Typecheck und vollständiger Lint: grün;
- vollständiger Production Build mit ausschließlich `apps/web/.env.example`
  im Prozess: grün; `256` Seitenverträge ohne Verstoß und `322/322` statische
  Seiten;
- kein Vote4Gov-Registryeintrag, kein reales Artikelrelease, kein
  Auto-Publish und keine automatische Übersetzung;
- `docs/E150/OpenTasks.md` bleibt unverändert und byte-identisch zu
  `origin/main`.

PR `#557` bleibt Draft. Kein Merge und kein Production-Deployment erfolgt aus
diesem Mehrsprachen-Closing-Pass.

## Revalidierung gegen aktuellen Main · 2026-08-09

### Synchronisierung und Kollisionen

- Ausgangs-Head des bestehenden Branches:
  `310bb791e9840270bb21aa0490a8567b20c3b12e`.
- Integrierter Main-Stand:
  `347c8b20eb5e9342c332f82114b5f8d63dd7d893`.
- Konfliktfreier Merge-Head vor diesem Evidence-Nachtrag:
  `6e88f07eb8fc4d41aabb5580909592c583c5835e`.
- Mergekonflikte: **0**. Der PR-Scope bleibt bei `19` Public-Ballot-,
  I18N-, Security-, Test-, Workflow- und Evidence-Dateien.
- Die tatsächlichen Dateilisten aller offenen Fremd-PRs `#590`, `#589`,
  `#588`, `#561`, `#556`, `#536`, `#527` und `#520` wurden erneut geprüft.
  Direkte Überschneidung mit PR `#557`: **0**.
- `docs/E150/OpenTasks.md` wurde ausschließlich aus `main` übernommen und
  bleibt außerhalb des eigenen PR-Diffs. Es wurde kein zweiter Adapterbranch
  und keine parallele I18N-Wahrheit angelegt.

### Erneute technische Validierung

Alle lokalen Läufe erfolgten unter Node `20.20.2`:

- Public-Ballot-, Sprachwechsel-, Release-, Vote-, Rate-Limit- und
  Auth-Regression: `10` Dateien, `72/72` Tests grün;
- Web-PR-Critical-Guardrails: `17` Dateien, `72/72` Tests grün;
- Production Guardrails: Public Routes `7/7`, Admin Review `6/6`, Publish
  Guardrails `23/23`; insgesamt `36/36` grün;
- Typecheck: grün;
- vollständiger Lint: grün;
- vollständiger Production Build mit ausschließlich `apps/web/.env.example`
  im Prozess: grün; `256` Seitenverträge ohne Verstoß, Compiler und TypeScript
  grün, statische Generierung `322/322`;
- der erste absichtlich secret-freie Buildlauf ohne `.env.local` kompilierte,
  stoppte aber erwartungsgemäß beim Page-Data-Collect an fehlenden Pflicht-ENV.
  Es wurden keine lokalen Secrets gelesen, geschrieben oder verändert.

### Verbleibende Gates

Der technische Endstatus bleibt maximal `manual_gate`. Weiter offen sind:

- eine ausdrücklich zulässige reale Preview-Fixture oder ein freigegebener
  VOG-Fragendatensatz mit stabilen Frage-, Options-, Quellen- und
  Gegenpositions-IDs;
- der unabhängige DE/EN/FR/ES/TR/AR-, RTL-, Mobile-, Tastatur-,
  Screenreader- und 200-%-Bedien-Smoke;
- Admin-/2FA-Release, menschliche Review- und Mergeentscheidung.

Der PR bleibt Draft. Kein Ready, Merge, Deployment oder Public Release erfolgt
aus dieser Revalidierung.
