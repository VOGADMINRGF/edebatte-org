# CITIZEN-FIRST REGIONAL PRODUCT CONTRACT

Datum: 2026-09-01  
Status: **kanonischer Public-Product-Contract**  
Issue: #671  
Scope: `/start`, `/create`, `/swipes`, regionale Public-Sichten, Voxy-Intake sowie alle öffentlichen Ableitungen, die Bürgeranliegen verarbeiten oder darstellen.

## 1. Produktentscheidung

eDebatte wird in der öffentlichen Produkterfahrung vom **einzelnen Menschen und seinem konkreten Gegenstand** aus gedacht.

Institutionen, Vereine, Initiativen, Verbände, Medien, Unternehmen, Kommunen und andere Organisationen bleiben wichtige Nutzer, Partner und professionelle Operatoren. Sie sind aber **sekundäre Layer derselben Infrastruktur** und dürfen die öffentliche Produktidentität nicht verschieben.

Kurzform:

> Mensch zuerst. Anliegen zuerst. Region und Zuständigkeit im Hintergrund klären. Komplexität nicht ins Formular verlagern.

## 2. Kanonischer Public Flow

```text
Mensch
  -> Anliegen / Frage / Vorschlag / Beobachtung / Position / Quelle
  -> System versteht den Gegenstand
  -> Ort/Region wird erkannt, vorgeschlagen oder knapp bestätigt
  -> Thema, gewünschte Veränderung und Zuständigkeit werden strukturiert
  -> ähnliche bestehende Inhalte werden gefunden
  -> Nutzerposition bleibt explizit erhalten
  -> reviewbare Signalspur
  -> bei Reife: Dossier / Beteiligung / Runde / Status / Wirkung
```

Der Nutzer muss keine internen Fachbegriffe kennen.

## 3. Ein Satz muss reichen

Der primäre Einstieg darf nicht von einem mehrstufigen Formular abhängen.

Zulässige Freistarts sind beispielsweise:

- „Vor der Grundschule in der Musterstraße fehlt ein Zebrastreifen.“
- „In Wuppertal sollten leerstehende Ladenlokale leichter temporär genutzt werden können.“
- „Warum dauert die Wohngeldbearbeitung so lange?“
- „Ich finde, die aktuelle Regel sollte so bleiben.“
- „Hier ist eine Quelle zur geplanten Ortsumgehung.“

Das System darf anschließend strukturieren. Es soll nur das nachfragen, was für eine richtige Zuordnung oder einen sicheren nächsten Schritt tatsächlich fehlt.

## 4. Region ist Gegenstandskontext, nicht Identitätsmerkmal

### 4.1 Grundregel

`Wohnort`, `Profilregion`, `Gegenstandsregion`, `Zuständigkeitsregion` und `Beteiligungsregion` sind getrennte Konzepte.

### 4.2 Auflösungsreihenfolge

1. expliziter Orts-/Regionsbezug im Beitrag,
2. bereits bestätigter Kontext des laufenden Flows,
3. Profilregion als Vorschlag,
4. technische oder allgemeine Defaults nur als letzter Fallback und niemals als behauptete Personeneigenschaft.

### 4.3 Beispiele

- Profil: Berlin; Beitrag: „In Wuppertal ...“ -> **Wuppertal ist Gegenstandsregion**.
- Profil: Berlin; Beitrag: „Bei mir sollte die Busanbindung besser werden.“ -> Berlin darf als Vorschlag erscheinen, muss aber änderbar sein.
- Beitrag: „Die Bundesregierung sollte ...“ -> Bund ist primäre Zuständigkeit; Berlin darf nicht künstlich als Sachregion gesetzt werden.
- Beitrag: „Die EU sollte ...“ -> EU-Kontext; keine kommunale Zwangszuordnung.
- Beitrag nennt zwei Städte -> Vergleich, gemeinsamer Gegenstand oder getrennte Branches prüfen; nicht still eine Stadt wählen.

## 5. Vorqualifizierung im Hintergrund

Soweit hinreichend sicher ableitbar, werden folgende Felder strukturiert:

- Anliegenstyp:
  - Problem / Missstand
  - gewünschte Änderung
  - Vorschlag / Lösung
  - Frage / Klärungsbedarf
  - Position / Zustimmung / Ablehnung
  - Quelle / Evidenzhinweis
  - Korrektur
  - Bewahren / bestehende Regel beibehalten
- Thema / Kategorie
- Gegenstandsregion und Regionhierarchie
- Zuständigkeitsebene: Bezirk / Kommune / Land / Bund / EU / sonstige / unklar
- mögliche verantwortliche Stelle mit Confidence und Reviewbedarf
- gewünschte Veränderung bzw. Entscheidungsgegenstand
- betroffene Gruppen / Sachbereiche
- Zeitraum / Dringlichkeit, wenn fachlich relevant
- Quellen / Belege / Anhänge
- Sensitivität, PII- und Sicherheitsrisiken
- ähnliche bestehende Claims, Topics, Anliegen, Anlassräume oder Dossiers
- Scope-/Resolution-Confidence

Diese Struktur ist **Arbeitskontext**, keine automatische Wahrheit.

## 6. Rückfragenregel

Rückfragen sind nur erlaubt, wenn die Antwort den nächsten fachlichen Schritt tatsächlich verändert.

### Fragen statt Formular

Bevorzugt:

- „Meinst du Wuppertal in Nordrhein-Westfalen?“
- „Geht es dir um die Straße selbst oder um den gesamten Stadtteil?“
- „Du nennst Berlin und Potsdam. Möchtest du beide vergleichen?“

Zu vermeiden:

- mehrere Pflichtfelder, obwohl der Beitrag bereits eindeutig ist,
- Nachfrage nach Zuständigkeit, wenn sie technisch belastbar vorgeschlagen werden kann,
- Nachfrage nach Wohnort, obwohl nur die Gegenstandsregion relevant ist,
- interne Begriffe wie `regionId`, `scopeConfidence` oder `Anlassraum` in der Bürger-UX.

## 7. Ähnlichkeiten, Dubletten und Positionen

Ähnliche Inhalte werden erkannt, aber niemals still gemergt.

Der Mensch muss mindestens folgende Entscheidungen behalten können:

- vorhandenes Anliegen unterstützen,
- widersprechen / Gegenposition zählen,
- Nuance oder Ergänzung hinzufügen,
- getrennt halten,
- Review anfordern.

Ein semantischer Match ist kein Konsens.

Mehrthemenbeiträge dürfen in mehrere Branches zerlegt werden, solange die ursprüngliche Aussage nachvollziehbar erhalten bleibt.

## 8. Sonderfälle / Eventualitäten

### 8.1 Kein Ort genannt

- Profilregion nur als Vorschlag verwenden.
- Ist das Thema nicht regional, keine künstliche Ortsfrage.
- Ist Regionalität zwingend und unklar, genau eine knappe Klärung.

### 8.2 Ort im Text widerspricht Profilregion

- Beitragskontext gewinnt.
- sichtbar bestätigen statt still überschreiben.

### 8.3 Mehrdeutiger Ortsname

- keine heuristische harte Zuordnung bei relevanter Ambiguität.
- Kandidaten knapp zur Auswahl stellen.

### 8.4 Mehrere Orte

Erkennen, ob es sich handelt um:

- Vergleich,
- gemeinsames überregionales Problem,
- Reise-/Pendlerbezug,
- mehrere getrennte Anliegen.

### 8.5 Straßen-/Quartiersthema

- möglichst präzise Ortsauflösung,
- anschließend passende Verwaltungsebene ableiten,
- keine Behörde erfinden.

### 8.6 Bundes-/EU-/globale Frage

- lokale Profilregion nicht als sachliche Zuständigkeit verwenden,
- regionale Perspektive höchstens als getrennten Analysekontext führen.

### 8.7 Privater Einzelfall / PII

- nicht automatisch öffentlich machen,
- PII minimieren,
- review- oder hilfeorientierten Pfad anbieten,
- keine öffentliche Signalbildung aus sensiblen Personendaten ohne geeignete Freigabe.

### 8.8 Akute Gefahr / Notfall

- eDebatte nicht als Ersatz für Notruf, Polizei, Feuerwehr, Rettungsdienst oder andere zuständige Soforthilfe darstellen.

### 8.9 Missbrauch / Doxxing / rechtswidrige Inhalte

- Safety-/Moderationslogik vor öffentlicher Weiterverarbeitung.

### 8.10 Quelle ohne Forderung

- als Evidenz-/Hinweissignal behandeln,
- nicht künstlich in eine Ja/Nein-Forderung umformen.

### 8.11 Gegenposition zu bestehendem Thema

- Opposition oder Nuance erhalten,
- nicht als Support-Dublette zählen.

### 8.12 Unklare Zuständigkeit

- Unsicherheit transparent lassen,
- reviewbar halten,
- keine scheinpräzise Behörde erfinden.

## 9. Regionale Lagebilder

Ziel ist ein belastbares Bild darüber, **welche eingereichten Anliegen und Beteiligungssignale in welchen Regionen auftreten und wie sie sich entwickeln**.

### 9.1 Mindestfilter

- Regionhierarchie
- Thema
- Zeitraum
- Signal-/Anliegenstyp
- Review-/Bearbeitungsstatus
- Zuständigkeitsebene

### 9.2 Vergleich

Vergleiche wie Berlin vs. Wuppertal sind zulässig, wenn Basis und Unsicherheit sichtbar bleiben.

Nicht zulässig ohne belastbare Methodik:

- „Die Bürger in Wuppertal wollen X.“
- „Berlin ist mehrheitlich für Y.“

Besser:

- „Unter den eingereichten Anliegen in Wuppertal wurde X im Zeitraum Y häufig genannt.“
- „In den vorliegenden Beteiligungssignalen unterscheiden sich Berlin und Wuppertal bei Thema Z.“

### 9.3 Datenschutz

- aggregiert,
- keine personenbezogenen politischen Profile,
- keine Citizen-Scores,
- keine Vereins-/Ideologie-Scores,
- keine Repräsentativitätsfiktion.

## 10. Surface Contracts

### 10.1 `/start`

Die Startseite beantwortet zuerst:

> Was kann ich hier als Mensch konkret tun?

Sie erklärt nicht zuerst Organisationsprodukte.

Verbindlich:

- konkrete Produkterfahrung vor institutioneller Vermarktung,
- primärer Einstieg über Anliegen/Frage/Beteiligung,
- deutlich weniger konditionale Erklärtexte,
- keine wiederholten internen Review-/„vorgemerkt“-Formulierungen,
- Institutionen/Vereine als sekundärer professioneller Pfad.

### 10.2 `/create`

- ein Freitext-Einstieg,
- Planner-/Graph-/Match-Logik im Hintergrund,
- aufgelöste Region als leicht änderbarer Chip,
- Herkunft des Vorschlags verständlich, z. B.:
  - `Berlin · aus deinem Profil`
  - `Wuppertal · aus deinem Beitrag`
- nur echte Ambiguitäten nachfragen,
- bestehende Stance-/Match-Contracts wiederverwenden,
- kein silent merge,
- kein Auto-Publish.

### 10.3 `/swipes`

Mobile-first und card-first.

Verbindlich:

- eine dominante Karte,
- nächste Karte visuell leicht dahinter,
- links = Nein,
- rechts = Ja,
- Neutral/Offen zugänglich, aber nicht als blockierender Zwischenflow,
- Details bewusst per Tap/sekundärer Geste,
- nach Entscheidung unmittelbar nächste Karte,
- Region/Thema nur als leichter Kontext/Filter,
- anonyme Free-Swipes 1–10,
- Login-/Registrierungs-Gate erst danach,
- bestehender persistierter 3er-Zähler migrationssicher behandeln.

### 10.4 Regionale Public-Sicht

- Anliegen und Beteiligungssignale filterbar,
- Regionhierarchie sichtbar,
- Statuspfad verständlich:
  - eingereicht
  - in Prüfung
  - aktiv bearbeitet
  - Beteiligung
  - Ergebnis / Wirkung
- keine internen Adminbegriffe als primäre Sprache,
- keine personenbezogene politische Profilbildung.

## 11. Institutionelle Nutzung

Citizen-first bedeutet nicht citizen-only.

Professionelle Nutzer dürfen unter anderem:

- eigene Fragen und Beteiligungsräume vorbereiten,
- Quellen und Kontexte einbringen,
- Auswertungen und Arbeitsräume nutzen,
- regionale Themen beobachten,
- Beteiligung organisieren,
- Ergebnisse exportieren oder in interne Prozesse überführen, soweit produktiv freigegeben.

Sie dürfen nicht:

- Stimmen kaufen,
- institutionelles Abstimmungsgewicht erhalten,
- Wahrheitsstatus kaufen,
- Bürgerdaten für politische Profile verwenden,
- Bürgeranliegen still umdeuten oder zusammenführen,
- Public-Journey-Prioritäten durch Vertriebslogik überschreiben.

## 12. VoiceOpenGov / eDebatte

- **eDebatte** bleibt die möglichst neutrale Beteiligungs-, Quellen-, Dossier- und Abstimmungsinfrastruktur.
- **VoiceOpenGov** kann als gesellschaftliche Bewegung Beteiligung mobilisieren, Community aufbauen und Themen sichtbar machen.
- Bewegung und Infrastruktur dürfen technisch zusammenarbeiten, aber öffentliche Ergebnisse dürfen nicht wie ein vorbestimmtes politisches Mandat der Bewegung erscheinen.

## 13. KI- und Governance-Grenzen

KI darf:

- verstehen,
- strukturieren,
- clustern,
- Orte und Zuständigkeiten vorschlagen,
- ähnliche Inhalte suchen,
- Quellenbedarf und Unsicherheiten markieren,
- Formulierungen vereinfachen,
- kurze Rückfragen vorschlagen.

KI darf nicht:

- ungeprüft veröffentlichen,
- politische Identitäten ableiten,
- Wahrheit final setzen,
- Mandate erzeugen,
- Nutzerpositionen still ändern,
- Anliegen ohne Bestätigung semantisch verschmelzen.

## 14. Reuse-first

Keine zweite Architektur bauen.

Vor Umsetzung sind insbesondere zu prüfen und wiederzuverwenden bzw. gezielt zu erweitern:

- `features/region/contracts.ts`
- `features/region/store.ts`
- `features/region/regionParticipationSignals.ts`
- `features/region/server/participationSignalReviewRuntime.ts`
- `apps/web/src/app/api/region/set/route.ts`
- `apps/web/src/features/create/createContributionPackageContract.ts`
- bestehender `/create` Planner / Graph Matching / Handoff
- aktuelle GTM-Landing auf `main`
- `SwipeTopicStep`
- `SwipesClient`
- `useFreeVoteLimit`

PR #527 ist nicht als neue Landing-Source-of-Truth wiederzubeleben.

## 15. Implementierungsreihenfolge

### P0-A – Canon

- Brand Narrative citizen-first korrigieren.
- OpenTasks durch Single-Writer synchronisieren.
- widersprüchliche Public-/Agent-Copy identifizieren.

### P0-B – `/swipes`

- 10-Free-Swipe-Gate,
- Zählermigration,
- blockierende Neutral-Unterbrechung entfernen,
- echte card-first Mobile-Dramaturgie,
- visuelle Mobile-Abnahme.

### P0-C – `/start`

- institutionelle Dominanz entfernen,
- Copy reduzieren,
- primären Anliegen-/Beteiligungseinstieg zeigen,
- doppelte Review-/Statussprache entfernen.

### P0-D – `/create`

- Regionauflösung als citizen-visible, korrigierbaren Kontext schließen,
- Profil-vs.-Text-Priorität abdecken,
- Ambiguitäts-/Mehrort-/Bund-EU-Fälle testen.

### P0-E – regionale Public-Sicht

- aggregierte Anliegen-/Signalfilter,
- Vergleichssicht,
- transparente Status-/Basisdarstellung,
- Privacy-/Non-representative Guardrails.

## 16. Test- und Abnahmevertrag

Mindestens erforderlich:

- Contracttests für Citizen-first Copy/Surface-Prinzip,
- Place-/Profile-/Jurisdiction-Fälle,
- mehrere Orte / Mehrdeutigkeit,
- Match ohne silent merge,
- Stance-Erhalt,
- 10-Swipe-Gate + Migration,
- mobile Swipe-Gesten,
- keine blockierende Neutral-UX,
- regionale Privacy-/Aggregation-Guardrails,
- Accessibility,
- Security und bestehende Governance-Gates,
- menschliche Mobile-Produktabnahme vor Merge.

## 17. Definition of Done

Der Contract ist erst erfüllt, wenn:

1. die öffentliche Produktidentität eindeutig citizen-first ist,
2. ein Mensch mit einem Satz starten kann,
3. Ort/Region intelligent, transparent und korrigierbar verarbeitet wird,
4. Wohnort und Gegenstandsregion nicht vermischt werden,
5. ähnliche Anliegen ohne silent merge verarbeitet werden,
6. regionale Anliegen filter- und vergleichbar sind,
7. institutionelle Flächen sekundär und professionell bleiben,
8. `/swipes` mobile-first wie eine echte Karteninteraktion wirkt und 10 freie Swipes erlaubt,
9. Landing, Create, Swipes, Region und Voxy dieselbe Produktwahrheit erzählen,
10. keine neue parallele Architektur oder Backlog-Wahrheit entstanden ist,
11. OpenTasks synchronisiert ist,
12. Human Review vor Merge/Production erfolgt.
