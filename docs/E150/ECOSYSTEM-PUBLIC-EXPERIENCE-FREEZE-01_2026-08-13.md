# ECOSYSTEM-PUBLIC-EXPERIENCE-FREEZE-01

**Status:** active  
**Gültig ab:** 2026-08-13  
**Scope:** `vote4gov.eu`, `voiceopengov.org`, `edebatte.org` und die Repositories `VOGADMINRGF/vote4gov`, `VOGADMINRGF/voiceopengov-org`, `VOGADMINRGF/edebatte-org`  
**Parent:** `ECOSYSTEM-PUBLIC-EXPERIENCE-CANON-01` / GitHub Issue #619

## Ziel

Während der vollständigen Cross-Repo-Bestandsaufnahme bleibt die öffentliche Produktrealität stabil genug, um Browser-Evidence, CI, Visualisierungen, Logiken, Customer Journeys und Cross-Domain-Handoffs belastbar zu prüfen. Der Freeze verhindert neue parallele öffentliche Wahrheiten, ohne die drei Domains pauschal abzuschalten.

## Verbindlicher Freeze

1. Die drei Domains bleiben grundsätzlich öffentlich erreichbar.
2. Keine neuen konkurrierenden Landingpages, öffentlichen Journeys, parallelen Membership-/Pricing-Flows oder rein kosmetischen Cross-Repo-Redesigns starten, solange der Audit keinen kanonischen Zielzustand liefert.
3. Bereits manifestierte und aktive Codex-/Voxy-Slices werden nicht blind gestoppt. Alpha-Foxtrott prüft sie auf Kollision mit dem Audit und dem aktuellen Canon.
4. Security-, Datenschutz-, Legal-, Accessibility- und eindeutig falsche öffentliche Produkt-, Membership-, Payment- oder Organisationsaussagen dürfen jederzeit priorisiert korrigiert werden.
5. Vor Depublikation oder Löschung ist relevante Live-Evidence zu dokumentieren, sofern dadurch kein Sicherheits- oder Datenschutzrisiko verlängert wird.

## Befugnis Alpha-Foxtrott

Alpha-Foxtrott darf im Rahmen dieses Vertrags nach belegter Prüfung und ohne neue Produktentscheidungen:

- veraltete öffentliche Unterseiten archivieren,
- Legacy-Flächen depublizieren,
- klare Altpfade auf den kanonischen Zielpfad redirecten,
- tote oder eindeutig ersetzte Legacy-Dateien löschen,
- widersprüchliche Alttexte entfernen,
- veraltete Navigationseinträge entfernen,
- doppelte oder historisch ersetzte öffentliche Surface-Varianten bereinigen.

Diese Befugnis gilt nur, wenn alle folgenden Bedingungen erfüllt sind:

- der Pfad ist durch Canon, aktuelle Produktwahrheit oder bereits gemergte Nachfolgefläche eindeutig ersetzt oder unzulässig geworden;
- kein aktiver PR/Worktree besitzt denselben Slice;
- keine offene Produkt-, Governance-, Legal- oder Routingentscheidung wird dadurch vorweggenommen;
- notwendige Redirects, SEO-/Link-Folgen und interne Verweise werden berücksichtigt;
- Änderung und Evidence werden in `OpenTasks.md` bzw. im zugehörigen Task/Issue nachvollziehbar dokumentiert.

Bei Unsicherheit: nicht löschen, sondern `PROTECTED`, `REVIEW` oder `DECISION_REQUIRED` markieren.

## Besonders zu prüfen

### Vote4Gov
- alte Beteiligungs-/Anlassraum-Flächen gegen `VOTE4GOV_NORTH_STAR.md`;
- parallele alte Produktrollen;
- Legacy-CSS/JS und nicht mehr kanonische Navigation.

### VoiceOpenGov
- kostenfreie Mitgliedschaft vs. alte Beitrags-/Preislogik;
- alte Organisations-/Rechtsform- und Adressdarstellungen;
- parallele öffentliche Fassungen, Locale-/Cache-Drift und alte Produktversprechen;
- VOG-Inhalt, der eDebatte-Funktionalität unnötig dupliziert.

### eDebatte
- öffentliche Create-/Login-Brüche;
- veraltete oder doppelte Landingpages;
- geschützte vs. öffentliche Routen;
- CI-/Navigation-/Footer-Drift zu den anderen Marken.

## Automatische Aufhebung / Clean Exit

Der Freeze ist **selbstauflösend**, sobald Alpha-Foxtrott einen belegten Clean-Status feststellt. Er darf dann ohne weitere Produktentscheidung als `done` markiert werden, wenn alle Exit-Kriterien erfüllt sind:

1. vollständige Route-Matrix für alle drei Domains liegt vor;
2. jede relevante Route ist `PUBLIC`, `PROTECTED`, `LEGACY`, `REDIRECT`, `DELETE`, `UNAVAILABLE` oder `INTERNAL` klassifiziert;
3. keine bekannte P0-Drift bei Membership, Payment, Legal, Privacy, Security oder Organisationsdarstellung ist öffentlich aktiv;
4. keine bekannte öffentliche Seite widerspricht dem kanonischen Markenrollenvertrag;
5. Cross-Domain-Handoffs Vote4Gov → VoiceOpenGov → eDebatte sind dokumentiert und ohne kritischen Sackgassenbruch;
6. CI-/Design-Drift ist vollständig erfasst und entweder behoben oder als P1/P2-Folgeslice manifestiert;
7. Visualisierungsinventar und Keep/Redesign/Replace-Entscheidungen liegen vor;
8. Legacy-/Dead-Surface-Matrix ist abgearbeitet oder restlos in Folgeaufträge überführt;
9. GitHub Issues/PRs, `OpenTasks.md` und Google Calendar sind gegeneinander abgeglichen; Kalender bleibt Planung, nicht Done-Beleg;
10. keine offenen P0-Folgeaufträge aus dem Audit sind unmanifestiert;
11. alle vorgenommenen Archivierungen/Löschungen/Redirects sind evidenzbasiert dokumentiert;
12. `ECOSYSTEM-PUBLIC-EXPERIENCE-CANON-01` besitzt einen dokumentierten Abschluss- oder Übergabestand.

### Exit-Aktion

Wenn 1–12 erfüllt sind:

- diesen Freeze auf `done` setzen;
- Issue #619 mit Clean-Evidence aktualisieren bzw. schließen, sofern sein Audit-Scope ebenfalls abgeschlossen ist;
- etwaige temporäre Freeze-Hinweise aus Planung/Calendar als erledigt markieren oder entfernen;
- neue öffentliche Weiterentwicklung wieder nach normaler `OpenTasks.md`-Priorisierung zulassen;
- verbleibende P1/P2-Verbesserungen unabhängig vom Freeze weiterführen.

Es ist **keine zusätzliche Nutzerfreigabe erforderlich**, sofern keine neue Produkt-, Pricing-, Legal-, Governance- oder Markenentscheidung getroffen werden muss. Solche Entscheidungen bleiben Manual/Decision Gate.

## SSOT

`docs/E150/OpenTasks.md` bleibt operative SSOT. Dieser Vertrag definiert nur den temporären Cross-Repo-Freeze und seine automatische Exit-Logik. Bei Konflikt mit Foundation-, Brand- oder Governance-Canon gewinnt die höherstehende Quelle.
