# VOXY-HOMEPAGE-REFERENCE-FILMS-01 · Codex Run-Pack

Stand: 2026-08-18

Status: `review`

Priorität: `P0`

Ursprünglicher Blocker: PR #621 und
`VOXY-DUAL-VOICE-EXPLAINER-PILOT-01` mussten in `origin/main` enthalten sein.

Blocker-Status: `resolved`. PR #621 wurde als Merge-Commit
`c53982becf100d851aebb8b87ed1b7ae69b4be77` in `origin/main` integriert;
`VOXY-DUAL-VOICE-EXPLAINER-PILOT-01` ist `done`.

Post-Merge-Nachweis: Der erste Preflight auf sauberem `main` wurde vor dem
SSOT-Sync ausgeführt und endete gemäß Run-Pack erwartungsgemäß mit
`task_status_not_executable:blocked`. Filmimplementierung ist erst nach einem
erfolgreichen `codex_ready`-Preflight auf sauberem `main` erlaubt.

## 1. Zweck und Ausführungsgrenze

Dieser Run-Pack manifestiert den nächsten kanonischen Voxy-Produktionsslice.
Er autorisiert in PR #621 weder Filmimplementierung noch Render, Homepage-
Integration, Upload, Deployment oder Publishing.

PR #621 ist gemergt; sein Merge-Commit und der akzeptierte v1.4-Canon sind in
`origin/main` enthalten. Der erste saubere Main-Preflight hat vor diesem
SSOT-Sync wie vorgesehen `task_status_not_executable:blocked` geliefert. Der
anschließende OpenTasks-SSOT-Sync setzt den Task von `blocked` auf
`codex_ready`. Nachdem dieser Sync in `main` enthalten ist, muss vor jedem
Implementierungsstart der normale Preflight erfolgreich ausgeführt werden:

```bash
node scripts/codex-task-preflight.mjs VOXY-HOMEPAGE-REFERENCE-FILMS-01
```

Ohne `status = codex_ready`, sauberen `main` und erfolgreichen Preflight gibt
es keinen Implementierungsbranch und keinen Slice-Start.

## 2. Ziel und Nicht-Ziele

Ziel sind zwei hochwertige, zielgruppenspezifische Homepage-Reference-Filme
auf Basis des akzeptierten NEWS-5.0-Canons:

1. **A — eDebatte Homepage Entry Film** · Arbeitstitel
   „Prüfen statt glauben.“ · ungefähr 55–70 Sekunden;
2. **B — VoiceOpenGov Homepage Entry Film** · Arbeitstitel
   „Deine Stimme endet nicht am Wahltag.“ · ungefähr 60–75 Sekunden.

Die Filme verwenden denselben Voxy, D1 als einzige aktive Stimme, denselben
Studio-/Character-/Mouth-v4.1-Canon, genau eine Waveform sowie dieselbe
Evidence-/Source-Philosophie. Sie sind ausdrücklich nicht dasselbe Video mit
ausgetauschtem Logo. Zielgruppe, Story, Problemdefinition,
Nutzenargumentation, CTA und Informationsdramaturgie müssen eigenständig sein.

Nicht-Ziele des Slices:

- keine Rückkehr zu Dual Voice; W1 bleibt geparkt;
- keine neue Voice Identity oder Prosodieoptimierung;
- kein Character-, Studio- oder Marken-Redesign;
- keine erfundene Produktfähigkeit oder politische Evidence;
- keine produktive Homepage-Integration;
- keine finalen 9:16-/1:1-Render, sofern sie den ersten Homepage-Slice unnötig
  vergrößern;
- kein Auto-Publish, Deployment oder Publishing.

## 3. Verbindlicher Canon

- `canonicalNarrationArchitecture = single_voice_default`;
- `canonicalVoxyVoice = D1`;
- `humanVoxyVoiceAcceptance = accepted`;
- `activeVoiceCount = 1`;
- `w1ProductionPathStatus = parked`;
- `humanPilotAcceptance = accepted`;
- `humanNews5VisualAcceptance = accepted`;
- `pilotEvidenceDwellTimesCanonical = false`;
- `productionEligible = false`;
- `autoPublish = false`.

Die akzeptierte Grammatik bleibt:

```text
HOST → FOCUS → EXPLAIN → DOCK
→ HOST → FOCUS → EXPLAIN → DOCK
→ SYNTHESIS → HOST/CTA
```

FOCUS und EXPLAIN dürfen intern mehrere semantische Micro-Progressions
enthalten. Die rechte obere Evidence Memory bleibt kanonisch.

## 4. Gemeinsame Story und Statusmodell

Die übergeordnete Informationsdramaturgie lautet:

```text
WAHL → VERSPRECHEN → VERBINDLICHKEIT → ENTSCHEIDUNG
→ UMSETZUNG → WIRKUNG → NACHPRÜFBARKEIT
```

Der Film darf nicht pauschal behaupten, Parteien oder Politik seien
unverbindlich. Stattdessen werden alle Akteure nach derselben Methodik gefragt:
Was wurde angekündigt, wo steht es, wie konkret ist es, gibt es Termin,
Finanzierung und Verantwortung, wurde abgestimmt oder beschlossen, wurde
umgesetzt, welches Ergebnis ist messbar und was bleibt offen?

Das datenfähige Evidence-Modell umfasst mindestens:

| Status | Deutsche UI-Lesart |
| --- | --- |
| `statement` | Aussage |
| `programme_commitment` | Programm / Zusage |
| `agreement` | Konkreter Plan |
| `proposal` | Antrag / Entwurf |
| `parliamentary_vote` | Abstimmung |
| `formal_decision` | Beschluss |
| `law_or_rule` | Regelung |
| `implementation` | Umsetzung |
| `measurable_outcome` | Ergebnis |
| `open_or_unverified` | Offen / nicht belegt |

Das Modell ist keine simplistische juristische Rangfolge. Jeder Status muss
auf Quelle, Datum, Akteur und Kontext zurückführbar sein; Unsicherheit bleibt
sichtbar.

## 5. Evergreen- und Election-Window-Architektur

Beide Filme besitzen einen langfristig nutzbaren Evergreen-Core und einen
entfernbaren aktuellen Wahlkontext:

```ts
type ContextMode = "evergreen" | "election_window";
```

Evergreen-Beispiel: „Eine Wahl entscheidet viel. Aber Demokratie findet auch
zwischen den Wahlen statt.“

Election-Window-Beispiel: „Im September wird in mehreren Ländern und Kommunen
gewählt.“

Der aktuelle Layer darf keine zeitgebundene Behauptung unkontrolliert in den
Evergreen-Master einbrennen. Nach Ablauf des Wahlfensters muss der Film ohne
vollständigen Neuaufbau wieder im Evergreen-Modus renderbar sein.

Beim Intake am 18.08.2026 waren über die Bundeswahlleiterin belegt:

- 06.09.2026 · Landtagswahl Sachsen-Anhalt;
- 13.09.2026 · Kommunalwahl Niedersachsen;
- 20.09.2026 · Wahl zum Abgeordnetenhaus Berlin;
- 20.09.2026 · Landtagswahl Mecklenburg-Vorpommern.

Offizielle Intake-Quellen:

- [Bundeswahlleiterin · Künftige Wahltermine](https://www.bundeswahlleiterin.de/service/wahltermine.html)
- [Landeswahlleiter Berlin · Berliner Wahlen 2026](https://www.berlin.de/wahlen/wahlen/berliner-wahlen-2026/fragen-und-antwortkatalog/artikel.1646712.php)

Diese Daten sind kein dauerhafter Film-Input. Vor jedem Produktionslauf müssen
Wahltermine, Bezeichnungen, Gültigkeitsfenster und Quellen erneut gegen
offizielle Primärquellen geprüft werden. „Bundestagswahl 2026“ ist unzulässig;
die letzte Bundestagswahl war 2025.

## 6. Current Offer Inventory — fail closed

Bevor ein Filmscript finalisiert wird, muss der dann tatsächlich öffentliche
Funktionsumfang von eDebatte und VoiceOpenGov revisionsgebunden inventarisiert
werden. Zu prüfen sind mindestens:

- öffentliche Routes und aktuelle Landingpages;
- relevante Produktcontracts und OpenTasks;
- README-/Produktdokumentation;
- aktuelle Preview- und Produktoberflächen;
- reale CTA-Ziele und deren Verfügbarkeit.

Jede geplante Filmaussage erhält genau eine Klassifikation:

- `current_capability` — darf als vorhandene Funktion beworben werden;
- `editorial_principle` — darf als Grundsatz dargestellt werden;
- `future_intent` — darf nicht als bereits vorhandene Funktion erscheinen.

Das Inventory muss als Source-Manifest mit URL/Route, Revision, geprüft am,
Evidence und Klassifikation im Review-Paket liegen. Mock-, Fixture- und
geplante Funktionen sind kein Current Offer.

## 7. Film A — eDebatte

Zielgruppe sind Menschen, die politische oder gesellschaftliche Aussagen
nicht nur hören, sondern nachvollziehen wollen. Sekundär relevant sind unter
anderem Journalismus, Initiativen, Verbände, Organisationen, politische
Bildung und kommunale Akteure.

Semantischer Storyrahmen:

- Hook: „Ein Versprechen ist noch kein Beschluss.“ beziehungsweise „Eine
  Aussage ist schnell gemacht. Prüfbar wird sie erst mit einer Quelle.“;
- Einstieg durch Voxy mit genau einer Begrüßung „Hallo Nachbar.“;
- schnelle, aber lesbare Folge aus Aussage, Wahlprogramm, Interview, Post und
  Quelle;
- Fragen nach Konkretion, Termin, Beschluss und tatsächlicher Umsetzung;
- Aufbau des Verbindlichkeits-/Umsetzungsstatus;
- erst nach bestandenem Current Offer Inventory: reale eDebatte-Funktionen
  zeigen;
- Kern: Aussage, Quelle, Gegenposition und offene Frage nachvollziehbar
  nebeneinander;
- Schluss: „Du musst mir nichts glauben. Du sollst es prüfen können.“;
- CTA ausschließlich auf ein nachweislich vorhandenes eDebatte-Ziel.

Mögliche Funktionsbegriffe wie Quellen, Claims, Gegenpositionen, Dossiers,
Fragen, Abstimmungen oder Beteiligung sind bis zum Inventory nur Kandidaten,
keine freigegebenen Produktversprechen.

## 8. Film B — VoiceOpenGov

Zielgruppe sind Menschen, die politische Beteiligung nicht auf den Wahltag
reduzieren wollen. Der Film darf emotionaler sein als A, bleibt jedoch
sachlich, souverän, überparteilich und nicht agitatorisch.

Semantischer Storyrahmen:

- Hook: „Eine Wahl dauert einen Tag. Demokratie die Jahre dazwischen.“;
- Voxy: „Hallo Nachbar. Wir wählen. Wir entscheiden. Und danach?“;
- visuelle Zeitachse von Wahltag über 100 Tage und ein Jahr bis zur
  Legislatur;
- Fragen nach Zusage, Konkretion, Beschluss, Veränderung und offenem Stand;
- mehrere Evidence-Objekte mit unterschiedlichen Status;
- politische Beteiligung nicht auf Stimmabgabe reduzieren;
- VoiceOpenGov als Mitglieder-/Beteiligungsebene und eDebatte als
  Prüf-/Evidence-/Debatteninstrument sauber trennen;
- Voxy verbindet beide Ebenen, ohne Eigentums- oder Governancebehauptung;
- CTA `MITGESTALTEN` oder `MITGLIED WERDEN` nur bei real vorhandenem,
  geprüftem VoiceOpenGov-Ziel.

Auch die Aussage, VoiceOpenGov verbinde Menschen zum Weiterverfolgen von
Fragen, muss im Current Offer Inventory als aktuelle Fähigkeit oder ehrlich
als redaktioneller Grundsatz belegt werden.

## 9. Informationsdichte und adaptive Motion

„So viel Content wie möglich“ bedeutet maximale Informationsdichte bei hoher
Verständlichkeit, nicht maximale Wortmenge. Pro Satz gilt möglichst eine klare
Information. Sichtbare Evidence soll parallel Quelle, Status, Relation und
nächste Frage vermitteln.

Verbindlich:

```text
Narration duration != visual stillness duration
Visual stillness must not equal narration duration.
```

Während eines längeren Narrationsblocks können Evidence-Einfahrt, Markierung,
Chartaufbau, Zahlenfokus, Quellenzoom, Gegenevidence, Relationszeichnung,
Docking, Memory-Reorganisation, Voxy-Fokuswechsel oder semantischer
Lower-Third-Wechsel stattfinden.

Die Architektur bereitet zwei Profile vor:

| Profil | Ziel | Richtwert für sinnvollen visuellen Fortschritt |
| --- | --- | --- |
| `homepage` | ruhig, hochwertig, sichtbar lebendig | ungefähr alle 2,5–4 Sekunden |
| `social` | später dichter, weiterhin semantisch | ungefähr alle 1,5–3 Sekunden |

Die Richtwerte sind keine mechanischen Schnittintervalle. Verboten bleiben
Flash-Effekte, Meme-Ästhetik, bedeutungslose nervöse Zooms, Wort-für-Wort-
Captions und blinkende Texte. Reduced Motion muss dieselbe Information ohne
kontinuierliche Bewegung zugänglich halten.

## 10. Evidence Memory und politische Neutralität

Die obere rechte Evidence Memory zeigt im Wahl-/Verbindlichkeitskontext
beispielsweise Zusage, Status, Quelle und nächsten Prüfpunkt. Spätere
Beschlüsse oder Umsetzungen aktualisieren denselben nachvollziehbaren
Evidence-Faden; offene Zustände werden nicht als Erfolg ausgegeben.

Unzulässig sind erfundene Wahlprogramme, Kandidatenpositionen, Umfragen,
Quellen und scheinbar reale Fixtures. Bei realen politischen Positionen gelten:

- Originalquelle bevorzugen;
- Akteur, Datum und Kontext sichtbar halten;
- alle Akteure nach derselben Methodik behandeln;
- keine parteiliche Empfehlung oder selektive Manipulation;
- Unsicherheit, Gegenposition und offene Evidence erhalten;
- neutrale institutionelle Wahlquellen bevorzugen, wenn sie den Zweck
  erfüllen.

## 11. Output- und Review-Vertrag

Geplante 16:9-Ausgaben:

```text
voxy-edebatte-homepage-reference-v1.mp4
voxy-voiceopengov-homepage-reference-v1.mp4
```

Beide Pakete enthalten mindestens:

- 1920×1080 bei 24 fps oder dem dann kanonischen Renderer-Standard;
- ausschließlich D1;
- VTT-/SRT-Sidecars ohne eingebrannte Wort-für-Wort-Captions;
- Preview und Contact Sheet;
- Manifest und Source Manifest;
- Evidence-, Motion- und Lower-Third-Timeline;
- Context Mode, Motion Profile, Voice-/Audio-Preservation und Privacy-Gates;
- revisionsgebundene Human-Review-Fragen ohne automatische Gewinner- oder
  Veröffentlichungsentscheidung.

9:16 und 1:1 werden architektonisch berücksichtigt, müssen im ersten
Homepage-Slice aber nicht final gerendert werden.

## 12. Pflichtgates des späteren Implementierungsslices

Vor Abschluss müssen mindestens belegt sein:

- #621-Canon ist aus `origin/main` übernommen;
- Current Offer Inventory und Claim-Klassifikation vollständig;
- offizielle Current-Layer-Quellen zum Renderzeitpunkt erneut geprüft;
- D1-only, W1 geparkt, kein Fallback und Voice Preservation bestanden;
- Evergreen-Render ohne Current Layer möglich;
- adaptive Motion innerhalb längerer Narrationsblöcke sichtbar;
- Evidence-Status auf Quelle und Datum zurückführbar;
- politische Neutralität und gleiche Methodik geprüft;
- keine Fake-Real-Evidence oder erfundene Produktfähigkeit;
- Accessibility, Reduced Motion, Captions und Safe Zones geprüft;
- relevante Contracts, Typecheck, Lint, Build, `git diff --check`, FFprobe,
  PCM-/Audio-Preservation und Privacy Scan grün;
- beide Filme separat menschlich geprüft.

Der technische Endstatus ist höchstens `review`. Erst die ausdrückliche
menschliche Filmabnahme darf einen späteren Integrationsslice öffnen.

## 13. Homepage-Integration und verbleibende Gates

Der Produktionsslice endet nach:

```text
Render → Human Review → Acceptance-Entscheidung
```

Die Integration akzeptierter Filme in eDebatte oder VoiceOpenGov ist ein
separater Folgetask. Dieser Run-Pack autorisiert keine Homepageänderung, keinen
externen Upload, kein Deployment, Publishing oder Auto-Publish.

Verbleibende menschliche Gates:

1. Product-Truth- und CTA-Abnahme pro Film;
2. politische Neutralitäts- und Quellenabnahme;
3. visuelle, akustische und dramaturgische Abnahme von Film A;
4. visuelle, akustische und dramaturgische Abnahme von Film B;
5. separate Entscheidung über eine spätere Homepage-Integration.

## 14. Implementierungsnachweis vom 18. August 2026

Der autorisierte Implementierungsslice wurde auf dem revisionsgebundenen
Renderer-Head `10530072fd516b2057cf6c6d772ab8f2430cce0c` technisch abgeschlossen.
Beide getrennten privaten 16:9-Filme, ihre Sidecars, Source-/Evidence-/Motion-
und Audio-Preservation-Manifeste wurden erzeugt. D1-only, W1-Parking,
Evergreen-/Election-Window-Vertrag, Current-Offer-Fail-Closed, politische
Neutralität, adaptive Motion, FFprobe, PCM-Assembly und Privacy sind grün.

Kanonische Evidence:
`docs/E150/VOXY-HOMEPAGE-REFERENCE-FILMS-01_2026-08-18.md`.

Der Task steht deshalb auf `review`. `humanHomepageFilmAcceptance` und die
visuelle Abnahme der beiden neuen Homepage-Filme bleiben `pending`;
`productionEligible = false` und `autoPublish = false` bleiben unverändert.
