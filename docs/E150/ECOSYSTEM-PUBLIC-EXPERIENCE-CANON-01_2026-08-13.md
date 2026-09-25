# ECOSYSTEM-PUBLIC-EXPERIENCE-CANON-01

**Stand:** 2026-08-13  
**Owner:** Alpha-Foxtrott (Kontroll-, Konvergenz- und Orchestrierungsinstanz)  
**GitHub-Issue:** #619  
**Repos:** `VOGADMINRGF/vote4gov`, `VOGADMINRGF/voiceopengov-org`, `VOGADMINRGF/edebatte-org`

## Ziel

Vollständige browser- und codegestützte Bestandsaufnahme von `vote4gov.eu`, `voiceopengov.org` und `edebatte.org` als belastbare Grundlage für die nächste Weiterentwicklungsphase.

Nicht kosmetisch optimieren, bevor öffentliche Realität, geschützte Flächen, CI, Visualisierungen, Produktlogik, Customer Journey, Cross-Domain-Handoffs und operative Planungsdrift vollständig verstanden sind.

Verbindlicher Markenkanon:

> Vote4Gov untersucht. VoiceOpenGov verbindet. eDebatte beteiligt.

Voxy begleitet, erklärt und strukturiert. Voxy entscheidet und veröffentlicht nicht autonom. Transparenz ist gemeinsame Systemlogik.

## Alpha-Foxtrott Arbeitsmodus

Alpha-Foxtrott implementiert nicht parallel zu aktiven Codex-/Voxy-Slices dieselben Flächen. Vor jeder Manifestierung oder Folgearbeit zuerst bestehende Tasks, PRs, Issues, Branches, Worktrees und Kalenderplanung gegen die belegbare GitHub-Wahrheit prüfen.

Kalendertermine sind Planung und niemals Erledigungsbeleg.

## 12 verbindliche Prüfblöcke

### 1. Route Inventory
Alle bekannten und tatsächlich erreichbaren Routen je Domain erfassen. Dazu gehören öffentliche Seiten, geschützte Seiten, Mitgliederbereich, Account, Admin, APIs, Redirects, Legacy-Flächen, lokalisierte Routen und technisch vorhandene, aber nicht veröffentlichte Flächen.

### 2. Public/Private Classification
Jede Route klassifizieren als:

- PUBLIC
- LOGIN_REQUIRED
- MEMBER_ONLY
- ADMIN_ONLY
- MANUAL_GATE
- LEGACY
- REDIRECT
- UNAVAILABLE
- CODE_ONLY / nicht öffentlich bestätigt

### 3. Browser-vs-Code Reality
Live-Domain und aktuelle `main`-Implementierung gegeneinander prüfen. Abweichungen nach Domain, URL, Locale, Deviceklasse, Cache-/Redirect-Verhalten und Datum dokumentieren. Keine Produktwahrheit ausschließlich aus Code oder Suchindex ableiten.

### 4. CI Consistency
Vergleichen:

- Farben und Tokens
- Typografie
- Spacing
- Radien
- Buttons und CTA-Hierarchie
- Header und Footer
- Navigation
- Logos und Proportionen
- Status-/Trust-Badges
- Cookie-/Consent-Flächen
- Fokuszustände
- Formulare
- Cards
- Mobile-Patterns
- Accessibility

Ziel ist gemeinsame Ecosystem-DNA ohne drei identische Websites.

### 5. Brand Differentiation
Prüfen, ob die Oberflächen die Rollen sofort verständlich machen:

- Vote4Gov = Editorial / Research / Reflexion
- VoiceOpenGov = Movement / Community / Mitgliedschaft
- eDebatte = Product / Workspace / Beteiligung
- Voxy = Assistenzschicht

### 6. Visualisation Audit
Alle sichtbaren Diagramme, Karten, SVGs, Screenshots, Reasoning-/Evidenzdarstellungen, Länder-/Regionselemente, Prozessgrafiken und Voxy-Darstellungen inventarisieren.

Pro Visualisierung bewerten:

- verständlich?
- aktuell?
- funktional oder nur Mock-up?
- CI-konform?
- mobile-tauglich?
- barrierearm?
- doppelt vorhanden?
- suggeriert sie eine noch nicht produktive Fähigkeit?
- KEEP / REDESIGN / REPLACE / REMOVE?

### 7. Customer Journey je Domain
Je Domain prüfen:

1. Einstieg
2. erstes Verständnis
3. primärer CTA
4. nächste Aktion
5. notwendige Registrierung / Login
6. Überraschungs-/Abbruchpunkte
7. Handoff in anderes Produkt
8. Wiederkehrpfad
9. Vertrauen / Transparenz
10. Erfolgskriterium der Session

### 8. Cross-Domain Journey
Kanonischen Übergang prüfen:

`Vote4Gov → VoiceOpenGov → eDebatte`

Voxy liegt als Assistenzschicht quer darüber.

Für jeden Handoff dokumentieren:

- warum der Nutzer wechseln soll
- welche Information erhalten bleibt
- welcher CTA benutzt wird
- ob Domainwechsel verständlich angekündigt wird
- ob Nutzer im Zielsystem an der erwarteten Stelle landet

### 9. Content Canon Drift
Alte oder abweichende Texte systematisch finden und gegen Foundation-/Brand-/North-Star-Verträge prüfen. Besonders:

- kostenlose vs. bezahlte Mitgliedschaft
- Organisations-/Rechtsform
- alte Adressen / Kontaktdaten
- „direktdemokratische Bewegung“ vs. aktueller Bewegungsbegriff
- Produktiv/Pilot/Alpha/geplant
- Funktionsversprechen
- eDebatte/VOG/Vote4Gov-Rollen
- KI-/Voxy-Aussagen
- Transparenzclaims
- Mehrsprachigkeitsclaims

### 10. Legacy/Dead Surface Audit
Parallele oder alte Produktwelten markieren. Beispiele: alte Vote4Gov-Anlassräume, doppelte Landingpages, alte CSS-/JS-Systeme, verwaiste Routen und zweite Beteiligungslogiken.

Migrationsstatus je Eintrag:

`KEEP / REDESIGN / MOVE / REDIRECT / DELETE / PROTECTED`

### 11. Ecosystem Design Contract Foundation
Gemeinsamen Designvertrag vorbereiten, der in jedem Repo nativ umgesetzt werden kann.

Mindestens:

- Core colors
- typography roles
- spacing scale
- radii
- buttons
- badges
- header/footer
- navigation
- Voxy pattern
- KI-Kennzeichnung
- Transparenz-/Provenienzstatus
- accessibility / focus
- responsive breakpoints

Kein unkontrolliertes CSS-Sharing zwischen technisch unterschiedlichen Repos.

### 12. OpenTasks ↔ GitHub ↔ Google Calendar Reconciliation
Drei Wahrheiten konsequent trennen und synchronisieren:

1. `docs/E150/OpenTasks.md` = operative SSOT
2. GitHub = belegbare Implementierungs-/PR-/Issue-Wahrheit
3. Google Calendar = Ausführungsplanung

Prüfen:

- Kalendertermin nennt Task-ID, die in OpenTasks fehlt
- Kalenderstatus ist älter als GitHub-/OpenTasks-Status
- `blocked`-Termin ist geplant, obwohl Abhängigkeit nicht erfüllt ist
- erledigte Tasks besitzen noch zukünftige Implementierungsblöcke
- Review-/Manual-Gate wird fälschlich als Implementierung geplant
- Termin ohne kanonische Task-ID
- OpenTasks `codex_ready`, aber kein sinnvoller Kalenderblock
- mehrere Termine planen denselben Slice parallel
- Abhängigkeiten in Kalenderbeschreibung sind veraltet

Ergebnis ist ein Sync-Vorschlag. Statusänderungen dürfen nur nach belegbarer Prüfung erfolgen.

## Bereits bestätigte Erstbefunde

### Vote4Gov
- Der aktuelle North Star definiert Vote4Gov als wissenschaftlich-redaktionelle Reflexions- und Begründungsebene.
- Eigene Beteiligungs-/Abstimmungsplattform, Community und Anlassräume sind ausgeschlossen.
- Im Repo existieren weiterhin `anlassraeume*`-Artefakte, die deshalb auf Legacy-/Migration eingeordnet werden müssen.
- Editorial-/Zeitungs-CI ist konzeptionell klar und soll erhalten bleiben.

### VoiceOpenGov
- Neue Startseitenlogik beschreibt VoiceOpenGov sauberer als internationale Mitgliederbewegung und trennt eDebatte, Voxy und Transparenz.
- Öffentliche/ältere Varianten zeigten widersprüchliche Membership- und Organisationslogiken; insbesondere kostenfreie Mitgliedschaft vs. ältere Beitrags-/Mitgliedschaftsdarstellung ist P0-Drift.
- Rechts-/Organisations-/Adressdaten müssen auf kanonische Quelle geprüft werden.

### eDebatte
- Der öffentliche Einstieg und Themen-/Dossier-/Beteiligungskosmos sind derzeit funktional am klarsten.
- Der öffentliche Beitrags-CTA kann in einen Login-Redirect münden; Erwartungsbruch prüfen und gegen beabsichtigte Create-Journey abgleichen.
- Public/Admin/Account/API-Flächen sind technisch stark ausdifferenziert; Route- und Sichtbarkeitsinventar ist deshalb zwingend.

### Cross-Repo
- CI ist mehrfach und technisch unterschiedlich implementiert: statisches HTML/CSS/JS auf Vote4Gov und Next-/Theme-/Tailwind-orientierte Systeme auf VOG/eDebatte.
- Gemeinsamer Designvertrag ist sinnvoller als identische Implementierung.

## Pflicht-Deliverables

1. Route-Matrix aller drei Domains
2. Public/Protected/Legacy/Unavailable-Matrix
3. CI-Komponentenmatrix mit Datei-/Codepfaden
4. Visualisierungsinventar mit Entscheidung pro Element
5. Customer-Journey-Map je Domain
6. Ecosystem-Journey inkl. Cross-Domain-Handoffs
7. Content-/Canon-Drift-Matrix
8. Legacy-/Parallelpfad-Matrix
9. Ecosystem Design Contract Vorschlag
10. Cross-Repo-Migrationsmatrix
11. priorisierte P0/P1/P2-Folgeaufträge als kleine Codex-Slices
12. OpenTasks/GitHub/Google-Calendar-Reconciliation mit Driftliste und Sync-Vorschlag

## Abnahme

Der Audit ist erst vollständig, wenn:

- alle drei Domains systematisch im Browser geprüft wurden,
- geschützte/nicht öffentliche Seiten sichtbar als solche markiert sind,
- jede wesentliche öffentliche Route einer Codequelle zugeordnet ist,
- CI-/Visualisierungs-/Journey-Abweichungen belegt sind,
- alte Produktwelten nicht mit aktuellem Canon vermischt werden,
- keine vorhandenen Tasks dupliziert werden,
- alle Folgearbeiten auf P0/P1/P2 priorisiert sind,
- OpenTasks, GitHub und Kalender gegeneinander abgeglichen sind,
- Kalenderplanung nicht als Implementierungswahrheit missverstanden wird.

## Operative Manifestierung

`docs/E150/OpenTasks.md` bleibt die SSOT. Da der Connector die sehr große Datei nicht zuverlässig als vollständigen editierbaren Inhalt liefert, darf sie nicht blind ersetzt werden. Alpha-Foxtrott soll dieses Handoff und Issue #619 beim nächsten kontrollierten SSOT-Sync gegen den vollständigen lokalen `OpenTasks.md`-Kopf prüfen und dort entweder als eigener Audit-Task manifestieren oder mit bereits bestehenden Ecosystem-/Brand-/Journey-Aufgaben zusammenführen.
