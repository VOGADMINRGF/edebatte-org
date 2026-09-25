# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — Multi-Format Broadcast V3.9

Datum: 2026-08-21  
Implementierungs- und Preview-Head: `04afe4e8a2f74d4cb26826250b6dfb4c7f82005d`  
Branch: `pr/voxy-homepage-reference-films-01`  
Draft-PR: `#624`

## Ergebnis und Grenze

V3.9 führt für beide Homepage-Referenzfilme ein gemeinsames semantisches Filmsystem mit vier echten Layoutprofilen ein. Timeline, D1-Stimme, Voxy, Evidenzidentität und redaktionelle Aussagen bleiben gemeinsam; Komposition, Hierarchie, Dichte, Typografie, Safe-Zones und Evidence-Memory-Verhalten werden profilabhängig bestimmt.

Eine reine Skalierung der 16:9-Bühne wurde verworfen, weil sie in Social-Formaten zu kleinen Karten, unlesbarer Prozessnavigation, konkurrierenden Objekten und Kollisionen mit Presenter, Mikrofon sowie Plattform-Overlays führt. Die Profile besitzen deshalb numerisch getrennte Regionen und werden mit `data-layout-scale-only="false"` ausgewiesen.

Die Änderung ist ausschließlich eine private Referenz- und Review-Iteration. Sie integriert nichts in die Homepage, veröffentlicht nichts und setzt keine Produktionsfreigabe.

## Layoutprofile

| Profil | Ausgabe | Safe-Zone oben / rechts / unten / links | Kompositionsprinzip |
| --- | --- | --- | --- |
| `landscape_16_9` | 1920 × 1080 | 48 / 48 / 54 / 48 px | vollständige Broadcast-Bühne, normale Evidence Memory, VOG-Navigation rechts unten |
| `square_1_1` | 1080 × 1080 | 54 / 72 / 72 / 54 px | Voxy größer, kompakter Brandblock, eine breite Hauptkarte, reduzierte Navigation und Memory |
| `feed_4_5` | 1080 × 1350 | 72 / 96 / 120 / 64 px | eine Hauptaussage, getrennte Evidenz-/Navigations- und Caption-Zonen |
| `vertical_9_16` | 1080 × 1920 | 120 / 140 / 230 / 80 px | großer Presenter, maximal eine aktive Erklärungskarte, kompakte Navigation und ein Memory-Marker |

Die Social-Insets sind konservative Produktionspresets, keine Behauptung einer universellen Safe-Zone für TikTok, Instagram, Facebook oder YouTube. Kritische Aussagen liegen innerhalb der zentralen Safe-Fläche; der rechte Rand und der untere Plattformbereich bleiben geschützt.

## Kompositionsverträge

- `homepageReferenceFilmLayouts.ts` definiert je Profil Ausgabegröße, Stage-Geometrie, Safe-Area, Presenter-, Mikrofon-, Brand-, Evidenz-, Navigations- und Caption-Rechtecke sowie semantische Typografie und maximale Objektzahl.
- Numerische Tests prüfen, dass Brand, Evidenz, Navigation und Captions in ihrer Safe-Zone liegen und weder Presenter- noch Mikrofonregion schneiden.
- Social-Profile verwenden keine Desktop-Evidence-Spalte. Square und Feed reduzieren ältere Evidenzen; Vertical zeigt höchstens eine aktive Karte plus kompakten Memory-Marker.
- Das bestehende FOCUS→DOCK-Identitätsmodell bleibt erhalten. Die reduzierte Darstellung ändert nicht die Evidence-ID oder den Quellenvertrag.

## VoiceOpenGov

Der öffentliche Wirkungspfad lautet weiterhin:

`DEINE STIMME → PROGRAMM → VERHANDLUNG → BESCHLUSS → UMSETZUNG → WIRKUNG → RÜCKKOPPLUNG`

In 16:9 liegt er im rechten unteren Informationsbereich unterhalb der großen Evidenzkarten. In Social-Profilen wird er als kompakte Navigation in einer eigenen Region neu zusammengesetzt. Der aktuelle Schritt ist dominant, abgeschlossene Schritte sind ruhiger und kommende Schritte weiter zurückgenommen. Die Bewegung ist ausschließlich timeline-gesteuert.

Sichtbare interne Produktbegriffe und öffentliche Namens-/Buchtitel-Verweise wurden entfernt. Die demokratischen Leitplanken lauten öffentlich `GRUNDRECHTE`, `MINDERHEITENSCHUTZ`, `RECHENSCHAFT` und `ÜBERPRÜFUNG`. Die Beteiligungsszene konzentriert sich auf `WAS FOLGT AUS DEINER STIMME?` und eine definierte Folge. Der Schluss führt keine neue Idee ein:

`DEINE STIMME IST MEHR ALS EIN KREUZ.`  
`Mitmachen. Informiert bleiben.`

Im Schluss werden Navigation und Evidence Memory stark beruhigt; Voxy bleibt dominant.

## eDebatte

eDebatte behält eine eigenständige Media-Forensics-Grammatik:

`BEHAUPTUNG → ORIGINALQUELLE → PASSAGE → KONTEXT → GEGENPOSITION → OFFENE FRAGE`

Quellenobjekt und Belegpfad liegen je Profil in expliziten Evidenzregionen außerhalb von Presenter- und Mikrofonkorridor. Social-Profile zeigen jeweils ein dominantes Objekt, statt die Desktop-Spalte zu verkleinern. Der Schluss bewahrt die abgestufte Aussage, wobei der zweite Satz dominiert:

`DU MUSST MIR NICHTS GLAUBEN.`  
`DU SOLLST ES PRÜFEN KÖNNEN.`

## Captions

- Burned-in Voxy-Captions bleiben aktiviert.
- VTT- und SRT-Sidecars bleiben Bestandteil des Rendervertrags.
- Caption-Cues stammen aus dem kanonischen gesprochenen Segmenttext.
- Lange Sätze werden an semantischen Satz- und Klauselgrenzen geteilt, nie Wort für Wort.
- Pro Zustand sind höchstens zwei sichtbare Zeilen zulässig.
- Position, Größe und Breite sind je Profil stabil und Safe-Zone-gebunden.
- Blinken, Typewriter und Caption-Spiegelung im Lower Third bleiben ausgeschlossen.

## Preview-first-Evidence

Reproduzierbarer Befehl:

```bash
cd apps/web
pnpm run render:voxy-homepage-multiformat-previews -- --output=/tmp/voxy-homepage-v3-9-previews-exact-head
```

Der Manifest-Head ist `04afe4e8a2f74d4cb26826250b6dfb4c7f82005d`. Er umfasst 56 repräsentative Frames und acht Kontaktbögen: sieben verlangte Momente je Film in allen vier Profilen. Mit Kontaktbögen sind es 64 lokale PNG-Dateien. Die Artefakte bleiben privat außerhalb des Repositories. Der Preview-Pass synthetisiert keine neue Stimme und ersetzt nicht den späteren vollständigen D1-Render.

Die technische Sichtprüfung der Kontaktbögen bestätigte die profilabhängige Re-Komposition, stabile Captions und die Trennung der semantischen Regionen. Dies ist ausdrücklich kein menschlicher Visual-PASS.

## Tests

Ausgeführt auf dem Implementierungsstand:

```text
pnpm exec vitest run <10 fokussierte Voxy-Homepage-Vertragsdateien>
10 Testdateien, 83 Tests: PASS

pnpm run typecheck
PASS

pnpm run lint
PASS

git diff --check
PASS
```

Der neue V3.9-Vertrag prüft alle vier Profile, Zielmaße, echte profilabhängige Geometrie, Safe-Zone- und Clearance-Rechtecke, Caption-Grenzen, reduzierte Social-Dichte, den VOG-Wirkungspfad, öffentliche Sprache, beide Finals, 48-Frame-/2-Sekunden-Lesbarkeit, Pause-Hold und sämtliche Release-Gates.

Lokaler Hinweis: Die installierte Laufzeit meldete Node `v25.9.0`, während das Paket Node `20.x` deklariert; Tests, Typecheck, Lint und der Preview-Renderer liefen dennoch erfolgreich.

## Offene menschliche Gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- `homepageIntegrationIncluded = false`

Als nächster Schritt sind vollständige private D1-Render aller benötigten Ausgaben und ihre menschliche Bild-/Tonabnahme erforderlich. PR `#624` bleibt offen, Draft und ungemergt; kein Deploy, Upload, Publish oder Homepage-Einbau ist Teil dieses Slices.
