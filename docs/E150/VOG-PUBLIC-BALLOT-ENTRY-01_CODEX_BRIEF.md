# VOG-PUBLIC-BALLOT-ENTRY-01 · Codex-Brief für Alpha

**Status:** Implementierungsauftrag zur Prüfung und Umsetzung<br>
**Datum:** 2. August 2026<br>
**Repository:** `VOGADMINRGF/edebatte-org`<br>
**Bestehender Branch:** `fix/vog-public-ballot-entry-01`<br>
**Bestehender Draft-PR:** wird auf diesem Branch geführt

## 1. Produktentscheidung

Öffentliche Verweise von Vote4Gov und VoiceOpenGov auf eine konkrete VOG-Frage sollen Besucherinnen und Besucher **ohne vorgeschaltete Anmeldung unmittelbar in die konkrete Abstimmung bei eDebatte führen**.

Der erste sichtbare Zustand ist daher nicht Login, Registrierung, allgemeine Startseite oder `/create`, sondern:

1. konkrete Frage,
2. verständlicher Kurzkontext,
3. auswählbare Antworten,
4. transparente Angabe zur Beteiligungsart,
5. unmittelbare Stimmabgabe.

Eine Kontoerstellung darf nach der Stimmabgabe freiwillig angeboten werden, aber nicht Voraussetzung für die öffentliche VOG-Beteiligung sein.

## 2. Verbindliche Rollen

- **Vote4Gov** erklärt und belegt, warum eine demokratische Frage relevant ist.
- **VoiceOpenGov** formuliert und kuratiert die 50 Grundfragen sowie weitere VOG-bezogene öffentliche Fragen.
- **eDebatte** ist der einzige Ort für Frage, Quellen, Gegenpositionen, Abstimmung, Ergebnis und Wirkung.

Vote4Gov und VoiceOpenGov erhalten keine eigene Abstimmungsruntime.

## 3. Wichtige Begriffs- und Vertrauenskorrektur

`öffentlich zugänglich` ist nicht dasselbe wie `öffentlich einer Person zugeordnet`.

Die bestehende QR-Set-Logik verwendet unter anderem:

- `allowAnonymousVoting`
- `publicAttribution: "public" | "hidden"`

Die aktuelle POST-Route verlangt bei `publicAttribution === "public"` Login und Verifikation. Für anonyme Stimmen wird derzeit ein Hash aus IP, User-Agent, Code und Frage gebildet.

Alpha muss diese Semantik zuerst vollständig prüfen und sauber trennen:

1. **Zugangsmodus** – darf ohne Konto teilgenommen werden?
2. **Attributionsmodus** – wird eine Stimme öffentlich, pseudonym oder gar nicht einer Identität zugeordnet?
3. **Legitimationsklasse** – handelt es sich um offene Konsultation, verifizierte Mitgliedsentscheidung oder rechtswirksame Abstimmung?

Keine globale Authentifizierungsumgehung und keine stille Bedeutungsänderung vorhandener Felder.

## 4. Zielvertrag für VOG-Fragen

Für öffentlich freigegebene VOG-Fragen gilt:

- direkter Gastzugang ohne Login,
- keine öffentliche Namenszuordnung,
- datensparsame Stimmabgabe,
- klarer Hinweis: `öffentliche, nicht verifizierte Beteiligung`,
- sichtbare Trennung von verifizierten Mitgliedsstimmen, falls diese zusätzlich erhoben werden,
- keine Behauptung repräsentativer Gesamtbevölkerungsmeinung,
- kein Vermischen einer Gastkonsultation mit einem verbindlichen VOG-Mitgliedermandat.

Die 50 VOG-Grundfragen sollen öffentlich erreichbar und öffentlich bearbeitbar sein. Falls eine Frage zugleich ein formales Mitgliederergebnis erzeugen soll, müssen zwei Zähl- beziehungsweise Legitimationsklassen sichtbar getrennt werden:

- offene öffentliche Beteiligung,
- verifizierte VOG-Mitgliederentscheidung.

Eine spätere Anmeldung darf eine bereits abgegebene Gaststimme nur dann einer verifizierten Teilnahme zuordnen oder in diese überführen, wenn Doppelzählung sicher verhindert wird und die Person dem Vorgang ausdrücklich zustimmt.

## 5. Gewünschter Einstieg

Ein kanonischer externer Link muss stabil auf die konkrete Frage führen. Prüfe bevorzugt die Weiterverwendung vorhandener öffentlicher Resolver und QR-Fragen-Sets, statt eine parallele Abstimmungsarchitektur zu bauen.

Beispielhafte Herkunftsmetadaten:

```text
source=vote4gov
origin=voiceopengov
origin_id=vog-question-01
reading_locale=de
ui_locale=de
output_locale=de
```

Der Link aus Vote4Gov soll direkt die passende Abstimmungsoberfläche öffnen. Die Herkunftsparameter müssen sicher validiert, durch den Einstieg erhalten und für Analytics beziehungsweise Provenienz datensparsam nutzbar sein. Sie dürfen keine Berechtigung verleihen.

## 6. UX-Vertrag

### Vor der Stimme

Oberhalb der ersten mobilen Bildschirmhöhe sollen sichtbar sein:

- VOG-Fragenummer und Titel,
- eine verständliche Ein-Satz-Einordnung,
- Antwortoptionen,
- Beteiligungsklasse,
- Quellen- und Gegenpositionszugang,
- Hinweis auf Datenschutz und Mehrfachteilnahmegrenze.

Kein obligatorischer Login-Dialog und kein Umweg über allgemeine Navigation.

### Nach der Stimme

- klare Bestätigung,
- eigene Auswahl sichtbar,
- aktuelles Ergebnis nur, wenn der Freigabevertrag dies erlaubt,
- Teilnehmerzahl und Beteiligungsklasse,
- methodischer Hinweis zur Nicht-Repräsentativität,
- Zugang zu Quellen, Gegenpositionen und Diskussion,
- optional: Konto erstellen oder anmelden, um Themen zu folgen oder eine zulässige verifizierte Teilnahme zu beanspruchen,
- keine erzwungene Registrierung.

### Sprachen und Zugänglichkeit

- ursprüngliche Frage und Lesesprache unterscheidbar,
- offene, streng validierte BCP-47-Locale-Map statt fest verdrahteter
  Sprachfelder,
- `originalLocale`, `readingLocale`, `uiLocale` und `outputLocale` getrennt,
- initial mindestens DE, EN, FR, ES, TR und AR regressionssicher,
- arabische Lesesprache mit RTL sowie ehrlicher Original-Fallback ohne
  behauptete automatische Übersetzung,
- Tastatur, Screenreader, Touch und kleine Mobilgeräte,
- Fehlermeldungen ohne technische Interna,
- bei fehlender Verbindung keine vorgetäuschte Stimmabgabe.

## 7. Datenschutz, Missbrauchsschutz und Idempotenz

Die bestehende ausschließliche Ableitung einer anonymen Session aus IP und User-Agent ist vor einer breiteren VOG-Nutzung kritisch zu prüfen.

Bevorzugter Zielansatz, sofern mit der vorhandenen Architektur vereinbar:

- zufälliges, erstseitiges Gast-Teilnahmetoken,
- nur gehasht serverseitig gespeichert,
- `HttpOnly`, `Secure`, angemessenes `SameSite`, begrenzte Laufzeit,
- keine Roh-IP und kein vollständiger User-Agent im Vote-Datensatz,
- IP höchstens in einem getrennten, kurzlebigen Rate-Limit-/Abuse-Kontext, falls erforderlich und rechtlich freigegeben,
- Upsert beziehungsweise Idempotenz pro Frage und Gasttoken,
- eine Person kann ihre Auswahl innerhalb des erlaubten Zeitfensters ändern, ohne zusätzliche Stimme zu erzeugen,
- Rate Limit und Missbrauchssignale,
- Origin-/CSRF-Schutz,
- keine Gerätefingerprinting-Behauptung,
- ehrliche Kennzeichnung: Gastschutz reduziert Mehrfachteilnahme, kann sie ohne verifizierte Identität aber nicht vollständig ausschließen.

Keine Speicherung sensibler Quellenparameter, keine Offenlegung von Token oder Hash und keine stille Cross-Site-Verfolgung.

## 8. Beteiligungspass und Ergebnisdarstellung

Jedes öffentliche VOG-Ergebnis muss mindestens ausweisen:

- Anzahl abgegebener Stimmen,
- Zahl beziehungsweise Anteil offener Gaststimmen,
- Zahl beziehungsweise Anteil verifizierter Stimmen, sofern vorhanden,
- Zeitraum,
- Antwortoptionen,
- bekannte methodische Grenzen,
- Herkunft beziehungsweise Verteilungskanäle nur aggregiert,
- Ergebnisstatus: Stimmungsbild, öffentliche Konsultation oder verifiziertes Mitgliedermandat.

Nicht verwenden:

- `Die Bevölkerung will ...`
- `Die Mehrheit der Bürger ...`
- andere repräsentative Behauptungen ohne belastbare Grundgesamtheit und Erhebungsmethode.

## 9. Technische Prüfung vor Umsetzung

Alpha liest zuerst vollständig:

1. `AGENTS.md`
2. Foundation- und Architektur-Canon gemäß `AGENTS.md`
3. den kanonischen operativen Kopf von `docs/E150/OpenTasks.md`
4. `docs/E150/QR-PUBLIC-ENTRY-02_2026-07-25.md`
5. `docs/E150/ANLASSRAUM-RUNTIME-PRODUCTION-01_ROOM_ROUND_LIFECYCLE_2026-05-24.md`
6. `apps/web/src/app/qr/[qrId]/page.tsx`
7. `apps/web/src/app/qr/[qrId]/QuestionSetClient.tsx`
8. `apps/web/src/app/api/qr/sets/[code]/route.ts`
9. `apps/web/src/app/api/qr/sets/[code]/vote/route.ts`
10. `apps/web/src/app/api/streams/sessions/[id]/vote/route.ts`
11. Vote-Model, Indizes, Rate-Limit-, Consent-, Security- und Public-Projection-Verträge
12. relevante Tests zu QR, Runden, Streams, Public Entry, Auth und Votes

Prüfe außerdem offene PRs, insbesondere **PR #520**, auf Datei-, Routing-, Auth- und Sicherheitskollisionen. Bestehende Redirect-Härtung aus PR #520 darf nicht abgeschwächt oder dupliziert werden.

## 10. Erwartete Root-Cause-Antwort

Vor der Implementierung im PR dokumentieren:

- Welche konkreten VOG-/Vote4Gov-Links führen heute wohin?
- Wo entsteht aktuell ein Login- oder Verifikations-Gate?
- Welche Poll-/Question-Set-Konfiguration erlaubt schon Gaststimmen?
- Welche Felder vermischen Zugriff, Attribution und Legitimation?
- Wie werden Mehrfachstimmen heute verhindert?
- Welche Teile sind produktiv, Fixture, Vertrag oder noch nicht vorhanden?
- Welche Kollision besteht mit PR #520?

Keine Aussage wie `funktioniert bereits`, bevor ein realer öffentlicher End-to-End-Pfad nachgewiesen wurde.

## 11. Implementierungsscope

Nach positiver Prüfung soll derselbe PR einen kleinen, produktnahen End-to-End-Slice liefern:

- kanonischer VOG-Public-Ballot-Contract,
- sichere Erkennung einer öffentlich freigegebenen VOG-Frage,
- direkter externer Einstieg zur konkreten Frage,
- Gaststimmabgabe ohne Login,
- klare Legitimations- und Attributionsanzeige,
- idempotente Speicherung,
- Herkunftsmetadaten ohne Berechtigungswirkung,
- Ergebnis-/Beteiligungspass für den implementierten Slice,
- Fehler-, Closed-, Not-found-, bereits-abgestimmt- und Rate-limit-Zustände,
- fokussierte Contract-, Route-, Security- und Render-Tests.

Bestehende allgemeine Abstimmungen dürfen nicht automatisch öffentlich oder anonym werden. Die Freigabe muss explizit und auf VOG-Fragen begrenzt sein.

## 12. Nicht im Scope

- keine globale Abschaffung von Login- oder Verifikationspflichten,
- keine rechtsverbindliche Online-Wahl,
- keine vollständige Implementierung aller 50 Fragen,
- kein Auto-Publish,
- keine automatische Erstellung von Fragen oder Runden,
- keine parallele Vote4Gov- oder VoiceOpenGov-Datenbank,
- keine öffentliche personenbezogene Stimmhistorie,
- keine heimliche Zusammenführung von Gast- und Nutzerprofilen,
- kein Marketing-Tracking,
- keine Änderung fremder OpenTasks-Zeilen,
- kein Merge von PR #520 innerhalb dieses PRs.

## 13. Abnahmekriterien

- [ ] Link aus Vote4Gov/VOG öffnet die konkrete öffentliche VOG-Frage
- [ ] keine Anmeldung vor der Gaststimme
- [ ] Frage und Optionen sind auf Mobile unmittelbar sichtbar
- [ ] Gaststimme wird idempotent gespeichert
- [ ] erneute Auswahl aktualisiert statt doppelt zu zählen
- [ ] Zugriff, Attribution und Legitimation sind getrennt modelliert oder eindeutig abgeleitet
- [ ] öffentliche Gaststimme wird nicht als verifiziertes Mitgliedermandat ausgegeben
- [ ] Herkunftsparameter werden validiert und verleihen keine Rechte
- [ ] keine Roh-IP und kein vollständiger User-Agent im Vote-Datensatz des neuen Pfads
- [ ] ehrlicher Mehrfachteilnahme- und Nicht-Repräsentativitäts-Hinweis
- [ ] Closed-, Missing-, Network-, Rate-limit- und bereits-abgestimmt-Zustände
- [ ] DE/EN/FR/ES/TR/AR, RTL, Tastatur, Screenreader und Mobile geprüft
- [ ] QR-/Public-Entry-Härtung aus PR #520 bleibt erhalten
- [ ] fokussierte Tests, Security, Typecheck, Lint und Build grün
- [ ] `git diff --check` grün
- [ ] Vercel-Preview grün

## 14. Arbeitsregel für Alpha

Ausschließlich im bestehenden Branch arbeiten:

```text
fix/vog-public-ballot-entry-01
```

Keinen weiteren Branch und keinen weiteren Pull Request erstellen.

Wenn die sichere Umsetzung zwingend vom Merge oder einer kontrollierten Übernahme aus PR #520 abhängt, nicht improvisieren. Kollision und exakte Abhängigkeit im bestehenden Draft-PR dokumentieren und den Code-Slice bis zur geklärten Basis begrenzen.

## 15. Abschlussdokumentation

Im bestehenden Draft-PR dokumentieren:

- Root Cause und aktuelle echte Runtime,
- gewähltes Zugangs-/Attributions-/Legitimationsmodell,
- direkter Route- und Linkvertrag,
- Datenschutz- und Missbrauchsschutz,
- Umgang mit Gast- und Mitgliedsstimmen,
- Kollisionen mit offenen PRs,
- geänderte Dateien,
- Tests und Smokes,
- bewusst offene Punkte,
- Commit-SHA.
