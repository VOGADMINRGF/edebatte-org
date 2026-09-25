# VOXY-HOMEPAGE-REFERENCE-FILMS-01 — Mobile Readability V3.10

Datum: 2026-08-21  
Implementierungs- und Preview-Head: `bd2e093c50a29778aef73de527d9b1ede1955f9a`  
Branch: `pr/voxy-homepage-reference-films-01`  
Draft-PR: `#624`

## Ergebnis und Grenze

V3.10 korrigiert ausschließlich Lesbarkeit und Informationsdichte der bestehenden Social-Profile. Semantische Timelines, D1-Stimme, Voxy- und NEWS-5-Canon, Quellenidentität, FOCUS→DOCK, Current-/Future-Produktwahrheit, 48-Frame-Lesbarkeitslock, Caption-Sidecars und Release-Gates bleiben unverändert. Es gibt keine Homepage-Integration, kein Publishing, keinen Produktions-Deploy und keinen vollständigen D1-Render.

`landscape_16_9` bleibt die eingefrorene V3.9-Baseline. Alle 14 repräsentativen Landschaftsframes und beide Landschafts-Kontaktbögen aus dem V3.10-Preview-Satz sind byte-identisch zur privaten V3.9-Evidenz.

## Menschliche V3.9-Feststellungen

Die vorgegebene menschliche Sichtung der V3.9-Previews hatte die Architektur bestätigt und folgende Restmängel benannt:

- VoiceOpenGov 9:16 und 4:5 zeigten alle sechs Journey-Bezeichnungen gleichzeitig; die Labels kollidierten und waren bei normaler Telefongröße nicht lesbar.
- VoiceOpenGov 1:1 zeigte teilweise die detaillierte Prozessleiter und die vollständig beschriftete globale Journey zugleich. Das duplizierte Information, wirkte wie ein verkleinertes Desktop-Dashboard und ließ Prozesszeilen in Richtung Caption-Zone fallen.
- eDebatte 9:16 und 4:5 pressten sechs lange Prüfschritte in eine Drei-Spalten-Anordnung; insbesondere die erste Reihe kollidierte.
- Brandhierarchie, Voxy-Größe und Captions waren bereits stark. Die Korrektur durfte deshalb nicht alles pauschal vergrößern, sondern musste gleichzeitige Labels reduzieren und typografische Prioritäten schärfen.

Ein globales Vergrößern wurde verworfen, weil es Presenter-, Mikrofon-, Evidence-, Navigations- und Caption-Regionen gegeneinander verschoben und tertiäre Information auf Kosten der Primäraussage aufgewertet hätte. V3.10 lässt unwichtige Metadaten klein oder blendet sie aus und reserviert größere Schrift ausschließlich für bedeutungstragende Ebenen.

## VoiceOpenGov

In 4:5 und 9:16 bleibt der vollständige Wirkungspfad semantisch und timeline-gesteuert erhalten, sichtbar ist jedoch eine mobile Navigationsgrammatik aus lesbarem Ursprung `DEINE STIMME`, sechs Zustandsknoten und genau einer aktiven Stufenbezeichnung. Abgeschlossene und kommende Stationen bleiben über Zustand und Farbe erkennbar. Browserzeit, Ticker, Carousel und rotierende Navigation werden nicht verwendet.

Die Prozessszene verwendet in den Social-Profilen eine adaptive `VORHER → AKTUELL → DANACH`-Darstellung. Die globale Journey bleibt dabei nur ruhiger Fortschrittskontext. Besonders in 1:1 verhindert dies eine zweite vollständig beschriftete Prozessdarstellung und schützt die Caption-Zone.

Die bestehende Guardrail-Hauptaussage bleibt erhalten. `GRUNDRECHTE`, `MINDERHEITENSCHUTZ`, `RECHENSCHAFT` und `ÜBERPRÜFUNG` stehen darunter als lesbares 2×2-Raster. Im finalen CTA dominieren weiterhin `DEINE STIMME IST MEHR ALS EIN KREUZ.` und `Mitmachen. Informiert bleiben.`; Journey und Evidence Memory sind stark beruhigt, und es erscheint keine neue aktive Stufenbezeichnung.

## eDebatte

Der mobile Prüfpfad verwendet in 1:1, 4:5 und 9:16 zwei Spalten und drei Reihen:

`BEHAUPTUNG → ORIGINALQUELLE → PASSAGE → KONTEXT → GEGENPOSITION → OFFENE FRAGE`

Alle sechs Zustände bleiben in Reihenfolge, Erreicht-/Offen-Hierarchie und Datenmodell erhalten. Die größere horizontale Fläche pro Eintrag beseitigt die V3.9-Kollisionen; die Aussage `Nicht nur das Ergebnis zeigen. Den Weg dorthin zeigen.` bleibt das dominante Objekt. Der Primärquellenzustand bleibt vom Presenter-, Mikrofon- und Caption-Bereich getrennt.

## Typografie und Caption-Schutz

Die verbindlichen Social-Floors lauten:

| Profil | Brand | Descriptor | Primäraussage | Caption | aktive Navigation |
| --- | ---: | ---: | ---: | ---: | ---: |
| `square_1_1` | 46 px | 23 px | 30 px | 26 px | 18 px |
| `feed_4_5` | 48 px | 23 px | 32 px | 28 px | 20 px |
| `vertical_9_16` | 56 px | 28 px | 38 px | 31 px | 22 px |

Numerische Verträge sichern für 4:5 und 9:16 die Reihenfolge Presenter → Evidence → Navigation → Caption → untere Plattform-Safe-Zone. Evidence und Navigation schneiden weder Presenter noch Mikrofon oder Caption. Square verwendet seine eigene Komposition, hält die Caption-Region aber ebenfalls frei.

Burned-in Captions, semantische Satz-/Klausel-Cues, maximal zwei sichtbare Zeilen, stabile profilgebundene Positionen sowie VTT-/SRT-Sidecars bleiben unverändert. Wort-für-Wort-Animation und Blinken bleiben ausgeschlossen.

## Vertrags- und Render-Evidenz

Neu ist `apps/web/tests/voxy-homepage-mobile-readability-v3-10.contract.test.ts`. Der Vertrag prüft die eingefrorene Landschaftsdefinition, reduzierte mobile VOG-Labels, Square-Anti-Duplikation, deterministische aktive Stufen bei sechs semantisch erhaltenen Journey-Stufen, das eDebatte-2×3-Raster, Typografie-Floors, räumliche Ausschlüsse, Caption-Grenzen, ruhigen Schluss, öffentliche Sprache und geschlossene Release-Gates.

Ausgeführt auf `bd2e093c50a29778aef73de527d9b1ede1955f9a`:

```text
pnpm exec vitest run <11 fokussierte Voxy-Homepage-Vertragsdateien>
11 Testdateien, 96 Tests: PASS

pnpm run typecheck
PASS

pnpm exec eslint --config apps/web/eslint.config.js <4 geänderte TypeScript-Dateien>
PASS

git diff --check
PASS
```

Die lokale Laufzeit meldete Node `v25.9.0`, während das Paket Node `20.x` deklariert; Tests, Typecheck, ESLint und Preview-Renderer liefen erfolgreich.

Exact-Head-CI auf demselben Implementierungs-Head:

- Web CI Run `32481823540`: Contracts, Security und Quality/Build `SUCCESS`
- Voxy first-party voice clone evidence Run `32481823504`: `SUCCESS`
- Voxy Mouth Canon and Motion v4 evidence Run `32481823610`: `SUCCESS`
- Voxy Mouth v4.1 and Motion v4.1 evidence Run `32481823588`: `SUCCESS`
- Voxy local TTS gate and voiced explainer v1 evidence Run `32481823624`: `SUCCESS`
- bestehender Vercel-PR-Preview-Check: `SUCCESS`; kein manueller oder Produktions-Deploy wurde ausgelöst

Erst nach grünem Exact-Head-Web-CI wurde ausschließlich der Multiformat-Preview-Renderer ausgeführt. Private Evidenz:

`/Users/RF/Arbeitsmappe/private-assets/voxy/previews/voxy-homepage-v3-10-bd2e093c`

Das Manifest trägt `schemaVersion = voxy-homepage-multiformat-preview-v3-10`, `mobileReadabilityLock = v3-10` und den exakten Preview-Head. Der Satz enthält 56 Einzelbilder und acht Kontaktbögen. Die technische Sichtprüfung umfasste alle verlangten Social-Momente sowie ausschließlich die 16:9-Regressions-Kontaktbögen; sie ist ausdrücklich kein Human Visual PASS.

## Offene menschliche Gates

- `humanHomepageFilmAcceptance = pending`
- `humanNews5VisualAcceptance = pending`
- `productionEligible = false`
- `autoPublish = false`
- `homepageIntegrationIncluded = false`

PR `#624` bleibt offen, Draft und ungemergt. Kein Merge, kein Ready-for-Review, kein Upload, kein Publishing und keine Homepage-Integration sind Teil von V3.10. Der nächste menschliche Schritt ist ausschließlich die Sichtung der frischen privaten V3.10-Multiformat-Previews.
