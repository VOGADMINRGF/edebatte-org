# ADMIN-REGION-PRODUCT-ACCEPTANCE-02

Stand: 2026-08-02
Issue: #528
Branch: `fix/admin-region-product-acceptance-02`
Kanonischer Taskstatus auf `main`: `codex_ready`
Empfohlener technischer Endstatus: `review`

## Ausgangspunkt

PR #513 ist gemergt und bleibt die technische Basis. Dieser Slice korrigiert ausschließlich
die bei der Produktabnahme festgestellte Directory-Integration, Regionsauflösung,
Directory-Diagnose, Theme-Darstellung und die regionalen Handoffs. Es gibt keinen Revert,
keine neue Runtime, keine neue Persistenz und keine Änderung an Rollen, Entitlements oder
Governance.

Der korrektive Lauf integrierte `origin/main@d615149a25178ae1def02b7b20418cacaee75aec`
genau einmal per Merge in den bestehenden Branch. Beim erwarteten Konflikt wurde
`docs/E150/OpenTasks.md` vollständig aus `origin/main` übernommen. Die beiden neuen
`codex_ready`-Zeilen aus PR #542 blieben erhalten; danach wurde die Datei nicht weiter
verändert. Alpha bleibt alleiniger SSOT-Schreiber und setzt den Task nach Abschluss
gesammelt auf `review`.

## Korrektives Follow-up

### Amtliches Verwaltungsdirectory

`buildOfficialRegionsFromDirectory()` ist jetzt Bestandteil des operativen
Regionskatalogs. Die Quellenreihenfolge lautet:

1. Registry
2. amtliches Directory
3. Fixtures

Nur identische stabile IDs, AGS oder ARS führen zur Deduplizierung. Gleiche Namen allein
werden nicht zusammengeführt. Der kontrollierte Stand:

- 13.339 gelesene XLSX-Zeilen,
- 12.401 amtlich abgeleitete Regionen,
- 7 weiterhin technisch verfügbare Fixtures,
- 0 Registry-Einträge, weil `RegionRegistry.snapshot.json` nicht verbunden ist,
- 12.408 operative Regionen,
- 384 Gruppen beziehungsweise 481 überzählige Slug-Kollisionen vor der Korrektur,
- 0 doppelte Slugs nach deterministischer Ergänzung von AGS beziehungsweise ARS.

Die Deduplizierung bildet jetzt echte transitive Komponenten über normalisierte
ID-, AGS- und ARS-Tokens. Union-Find verbindet deshalb auch zwei zunächst getrennte
Gruppen, wenn ein späterer Kandidat beide Identitäten trägt. Der Repräsentant wird
deterministisch nach Registry, Directory und Fixture sowie innerhalb derselben Quelle
nach ID, AGS, ARS und Slug gewählt. Alternative IDs, Codes, Slugs, Namen und
Verwaltungsbezeichnungen bleiben als Auflösungsaliase der Komponente erhalten. Die
grüne Permutationsmatrix belegt den Brückenfall für alle sechs Reihenfolgen.

Die XLSX-Quelle wird serverseitig als Buffer gelesen. Erfolgreiche immutable Imports
bleiben pro Prozess dauerhaft im Cache. `missing`- und `error`-Ergebnisse behalten
Status, Nachricht und Fehlercode, werden aber nur fünf Sekunden festgehalten und danach
erneut geprüft. Der daraus gebildete operative Katalog vergleicht bei jedem Zugriff den
aktuellen Quellenstatus und baut sich nach einer Recovery neu auf; ein früherer
Fallback wird nicht als endgültige Wahrheit zweitgecacht. Registry und Fixtures bleiben
während eines Fehlers technisch verfügbar. Die Oberfläche zeigt ausdrücklich, dass
kein vollständiges amtliches Verzeichnis geladen ist, und entfernt die Diagnose nach
erfolgreicher Wiederherstellung.

### Regionsauflösung

Die operative Auflösung akzeptiert ausschließlich eindeutige Treffer über ID, Slug, AGS,
ARS, Namen oder Verwaltungsbezeichnung. Mehrdeutige Namen liefern keinen heuristischen
Treffer. Hamburg ist belegt über:

- `Hamburg` → `region-land-02`,
- AGS `02000000` → `region-official-02000000`,
- ARS `020000000000` → `region-official-02000000`,
- ID `region-official-02000000`,
- Slug `hamburg-freie-und-hansestadt-02000000`,
- Verwaltungsbezeichnung `Senat der Freien und Hansestadt Hamburg`.

Die gleichnamigen amtlichen Einträge `Hamburg, Freie und Hansestadt` bleiben getrennt.
Die Verwaltungsbezeichnung bevorzugt nur dann den kanonischen kommunalen Eintrag, wenn
unter den sonst gleichlautenden amtlichen Treffern genau ein AGS-geführter Eintrag
existiert.

### Serverseitige Regionssuche und Payload

Der vollständige operative Katalog wird nicht mehr als natives Datalist mit 12.408
`option`-Elementen in jedes Dokument serialisiert. Die bestehende Page verarbeitet ein
progressiv verbessertes GET-Formular mit `regionQuery` vollständig serverseitig; es gibt
keinen neuen API-Endpunkt und keine JavaScript-Pflicht.

Die Trefferreihenfolge lautet:

1. exakte ID-, AGS- oder ARS-Treffer,
2. ein eindeutiger Präfixtreffer,
3. deterministisch nach Name und ID sortierte Texttreffer.

Die Page rendert höchstens 40 Ergebnisse und wählt ausschließlich über die stabile
`regionId`. Ohne Query erscheint nur die Suchaufforderung mit aggregierten Typzahlen.
Der aktuelle Regionskontext bleibt bei einer weiteren Suche sichtbar. Sichtbares Label,
Ergebnisstatus und Ergebnisliste verwenden native Formular- und Linksemantik; es wird
keine ARIA-Combobox nachgebildet. Lange Namen, Verwaltungsbezeichnungen und IDs tragen
kontrollierte Umbruch- und `min-width: 0`-Verträge für 320 Pixel, Mobile und Textzoom.

### Light/Dark und Diagnose

Selektor, operative Zusammenfassung, Eingabe, Placeholder, Fehlerzustand, Typ- und
Status-Badges sowie Fokuszustände verwenden lokale Theme-Tokens und explizite
Dark-Mode-Verträge. Der Selektor nutzt keine weißen Karten oder hellen
`from-cyan-50`-Verläufe mehr. Seine H1 trägt `no-grad`, sodass die globale H1-Regel
den lokalen Textkontrast nicht überschreibt. Es wurde keine globale CSS-Datei verändert
und keine zweite Designwelt eingeführt.

Der bestehende Beteiligungssignal-Regressionstest ist wieder geschlossen: Das Lagebild
zeigt die vorhandenen anonymisierten beziehungsweise aggregierten Readmodel-Werte kompakt,
ohne Personenprofile, Repräsentativitätsbehauptung oder automatische amtliche Übernahme.

## Operative Zusammenfassung

Nach einer Regionsauswahl ist der Auswahlkopf kompakt. Direkt danach zeigt eine
zusammenhängende operative Zusammenfassung:

- die ausgewählte Region und ihren Typ,
- das erste belegte Nicht-Fixture-Signal oder einen ehrlichen Signal-Leerstand,
- nachvollziehbare Herkunft und Reviewstatus des Signals,
- aktive und kontrolliert geprüfte Quellen,
- den letzten im Readmodel hinterlegten Quellen-/Prüfstand,
- eine qualitative Belastbarkeitsaussage ohne erfundene Coverage-Quote,
- offene Reviewhinweise und deduplizierte offene Fragen,
- die aus dem vorhandenen Stand abgeleitete Arbeitspriorität,
- genau eine dominante nächste Aktion.

Nicht-Fixture-Signale werden vor klar gekennzeichneten Pilot-/Fixture-Signalen gezeigt.
Fehlen Signale, Quellen, Prüfergebnisse, Aktualitätsangaben oder offene Fragen, erscheint
jeweils ein expliziter Leerzustand. Aus kontrollierten Dry Runs wird weder Live-Abdeckung
noch Veröffentlichung abgeleitet.

Die Profilkarten folgen erst nach der operativen Zusammenfassung und der horizontal
scrollbaren Workspace-Navigation. Ausführliche Fähigkeiten-, Evidenz-, Erfahrungs- und
Lückenkarten liegen in einem standardmäßig geschlossenen Diagnosebereich.

## Schnellaktionen und Handoffs

Fünf sichtbare sekundäre Schnellaktionen verwenden ausschließlich vorhandene Routen:

1. `Quellen sammeln` → regionaler Bereich `Quellen & Feeds`
2. `Recherche vertiefen` → `/admin/research/tasks`
3. `Beitrag erstellen` → `/create`
4. `Dossier vorbereiten` → `/create`
5. `Kampagne planen` → `/admin/marketing`

Es gibt keine `href="#"`, keine Dead Clicks und keinen automatischen Folgeschritt.

Der Research-Handoff trägt gefahrlos ignorierbar:

- `regionId=<regionaler Slug>`
- `topic=<vorhandenes Thema>`, soweit vorhanden
- `source=<vorhandene Quellenbezeichnung>`, soweit vorhanden
- `origin=admin-region`

`/admin/research/tasks` wertet weiterhin nur den bestehenden `taskId`-Pfad aktiv aus.
Die zusätzlichen Parameter starten keinen Provideraufruf, kein Crawling, Scraping oder
Deep Search.

Der Marketing-Handoff trägt:

- `lang=de`
- `segment=b2g`
- `reach=regional`
- `region=<regionaler Slug>`
- `topic=<vorhandenes Thema>`, soweit vorhanden
- `content=<vorhandener Signaltitel>`, soweit vorhanden
- `origin=admin-region`

Die Parameter sind Filter-/Handoff-Kontext. Sie erzeugen keine Kampagne, keine Registry,
keinen Publish-Vorgang und keine Persistenz.

Create- und Dossier-Handoffs behalten `source=admin_region`, den regionalen Slug,
`scope=regional`, vorhandenen Signal-/Themenkontext und `reviewState=needs_review`.

## Testabdeckung

`apps/web/tests/admin-region-page.render.test.tsx` prüft:

- operative Zusammenfassung vor Profil-, Erfahrungs-, Evidenz- und Diagnosebereichen,
- genau eine dominante Hauptaktion,
- genau fünf sichtbare Schnellaktionen,
- Research-Handoff mit Region, Thema, Quelle und `origin`,
- Marketing-Handoff mit Sprache, Segment, Reichweite, Region, Inhalt und `origin`,
- regionalen Create- und Dossier-Kontext,
- Erreichbarkeit aller sieben Workspace-Bereiche,
- horizontal nutzbare mobile Navigation,
- kontrollierten Umbruch langer Texte,
- keine Dead Clicks,
- keine Auto-Research-, Auto-Publish-, Draft-, Dossier- oder Provideraktivierung,
- GET-Suche ohne Datalist oder nachgebildete ARIA-Combobox,
- höchstens 40 serverseitig gerenderte Ergebnisse und kein Katalog im Leerzustand,
- Hamburg-Suche per Name, AGS und ARS mit stabiler `regionId`,
- sichtbares Suchlabel, Ergebnisanzahl, Tastatur-Linksemantik und kontrollierte Umbrüche,
- sichtbare `missing`- und `error`-Diagnosezustände,
- Verschwinden der Diagnose nach erfolgreicher Wiederherstellung,
- lokale Light-/Dark-Verträge für Selektor, Eingabe, Placeholder, Fehler, Badges und Fokus,
- die Abgrenzung des Selektor-H1 von der globalen H1-Verlaufsregel.

`apps/web/tests/regional-official-directory.contract.test.ts` prüft:

- Hamburg per Name, ID, Slug, AGS, ARS und Verwaltungsbezeichnung,
- 13.339 gelesene Directory-Einträge und 12.401 amtlich abgeleitete Regionen,
- 12.408 operative Regionen statt einer stillen Reduktion auf sieben Fixtures,
- eindeutige Slugs nach der deterministischen AGS-/ARS-Ergänzung,
- Union-Find-Komponenten über ID, AGS und ARS,
- alle sechs Permutationen des transitiven A-/B-/C-Brückenfalls,
- Verbindung zweier zunächst getrennter Gruppen durch einen späteren Kandidaten,
- reihenfolgeinvariante Registry-/Directory-/Fixture-Priorität und Repräsentantenwahl,
- Erhalt aller alternativen Identitäten und Bezeichnungen für die Auflösung,
- getrennte gleichnamige Orte und `null` bei mehrdeutiger Namensauflösung,
- deterministische, auf 40 Einträge begrenzte Suche,
- weiterhin verfügbare Registry-/Fixture-Einträge bei fehlender oder fehlerhafter Quelle,
- nachvollziehbare `missing`- und `error`-Statusdaten,
- Recovery von `missing` und `error` zu `ready`,
- dauerhafte Wiederverwendung erfolgreicher Imports ohne unkontrollierten Lese-Loop.

## Automatische Checks

- `git diff --check`
  - grün
- fokussierte Directory-/Render-Verträge
  - 2 Testdateien, 12 Tests, grün
- bestehende Region-/Entitlement-/Navigation-Regression
  - 15 Testdateien, 57 Tests, grün
- `pnpm -C apps/web run typecheck`
  - grün
- `pnpm -C apps/web run lint`
  - grün
- `set -a; source apps/web/.env.example; set +a; pnpm -C apps/web run build`
  - Page-Contract, Paket-Builds, Next-Kompilierung, TypeScript, 322 statische Seiten und
    finale Build-Ausgabe grün

Ein erster Build ohne Env-Bootstrap kompilierte erfolgreich, stoppte aber erwartbar beim
globalen Page-Data-Collect an fehlenden Pflichtvariablen. Der abschließende Build verwendete
wie die bestehende Web-CI ausschließlich die eingecheckte `apps/web/.env.example`; es wurde
keine lokale Env-Datei angelegt, gelesen oder verändert. Lokal lief Node `v25.9.0`, während
das Repository Node `20.x` erwartet. CI bleibt die maßgebliche Node-20-Bestätigung.

## Product-Acceptance- und Closing-Pass am 2. August 2026

Die Oberfläche wurde zusätzlich mit der echten Serverkomponente, dem realen operativen
Katalog, der tatsächlich kompilierten App-CSS und Chromium geprüft. Dafür wurde weder eine
Admin-Session umgangen noch ein Benutzer- oder Berechtigungsdatensatz verändert. Der
temporäre Browser-Harness gehörte nicht zum PR-Diff.

Geprüfte Kombinationen:

- Desktop `1440 × 900`, Light und Dark,
- Mobile `390 × 844`, Light und Dark,
- vollständige Screenshots aller vier Kombinationen,
- Tastaturreihenfolge vom Suchfeld über den Submit bis zum ersten Treffer,
- sichtbarer Fokus, Formularlabel, native Ergebnisliste und Linksemantik,
- Root-Breite, Touch-Ziele sowie Eingabe-, Placeholder- und Aktionskontrast.

Die Suche lieferte im realen Katalog:

- `Hamburg`: vier nachvollziehbar getrennte Treffer; der Land-Eintrag steht zuerst,
- `02000000`: der kommunale Hamburg-Eintrag ist der erste exakte Identitätstreffer;
  weitere vier Code-Texttreffer bleiben sichtbar,
- `020000000000`, `region-official-02000000` und
  `hamburg-freie-und-hansestadt-02000000`: jeweils der erwartete kommunale Hamburg-Eintrag,
- `Senat der Freien und Hansestadt Hamburg`: zwei getrennte amtliche Treffer, darunter der
  AGS-geführte kommunale Eintrag,
- `Flensburg`: drei Verwaltungsebenen beziehungsweise Einträge,
- `Beispielstadt`: genau das weiterhin verfügbare Fixture,
- eine unbekannte Suchphrase: null Treffer mit sichtbarem Leerstand,
- `Hamburg, Freie und Hansestadt`: zwei getrennte und damit nicht heuristisch
  zusammengeführte Treffer.

Der Browserpass fand einen realen Kontrast- und Mobile-Hit-Area-Mangel: Die dominante Aktion
verwendete Weiß auf `--grad-from` und erreichte nur `2,77:1`. `ActionLink` verwendet nun
theme-adaptiv den dunklen Vordergrund beziehungsweise Dark-Mode-Hintergrund auf Cyan und
erreicht `6,70:1` im Light Mode sowie `7,23:1` im Dark Mode. Alle Aktions- und
Workspace-Links besitzen außerdem mindestens `44 px` Höhe.

Nach der Korrektur gilt für alle vier Kombinationen:

- Root-Scrollbreite entspricht der Viewportbreite; kein horizontaler Seitenüberlauf,
- keine abgeschnittenen Inhalte im Vollseitenbild,
- kein heller Lichtkegel und kein weißer Schatten im Dark Mode,
- Eingabetext und Placeholder jeweils mindestens `4,5:1`,
- Suchtreffer mindestens `74 px` hoch,
- kein sichtbares interaktives Ziel innerhalb der Regionsseite unter `44 × 44 px`,
- Fokus-Ring in Light und Dark sichtbar,
- ausgewählte Region, Wechsel-Suche und stabiler `regionId`-Kontext sichtbar,
- Research-, Marketing-, Create-, Dossier- und Review-Handoffs tragen nur den
  dokumentierten Kontext; kein Auto-Research, Auto-Publish oder Auto-Create-Parameter.

`ready` wurde mit dem realen Directory geprüft. Die kontrollierten `missing`-, `error`- und
Recovery-Verträge bleiben durch die fokussierten Import- und Render-Tests abgedeckt: Registry
und Fixtures bleiben verfügbar, die Diagnose behauptet keine vollständige amtliche Abdeckung,
der kurze Fehlercache wird erneut geprüft und die Diagnose verschwindet nach Recovery ohne
Prozessneustart.

Abschließende Validierung des Closing-Passes unter Node `v20.20.2`:

- fokussierte Directory- und Render-Verträge: 2 Dateien, 16 Tests, grün,
- Deduplizierung, alle sechs Union-Find-Permutationen sowie Missing-/Error-/Recovery sind
  Bestandteil der 10 grünen Directory-Verträge,
- erweiterte Region-/Entitlement-/Navigation-Matrix: 25 Dateien, 90 von 92 Tests grün,
- die zwei roten Verträge sind unverändert auch auf `origin/main` vorhanden und liegen
  außerhalb des erlaubten Scopes: `region-contract.test.ts` erwartet noch die Typmenge ohne
  das bereits kanonische `land`; `navigation-initiative-label.contract.test.ts` erwartet im
  globalen Header weiterhin einen nicht mehr vorhandenen Eintrag `Zur Initiative`,
- `pnpm -C apps/web run typecheck`: grün,
- `pnpm -C apps/web run lint`: grün,
- vollständiger `pnpm -C apps/web run build`: Page-Contracts, Paket-Builds und optimierter
  Next-Production-Build grün; ein finales `.next/BUILD_ID` wurde erzeugt,
- der Build exportierte `apps/web/.env.example`; Next lud zusätzlich die bereits vorhandene
  `.env.local`. Keine Env-Datei wurde verändert und kein Geheimnis ausgegeben,
- `git diff --check`: grün.

## Verbleibend

- einmalige manuelle Gegenprüfung im vollständigen authentifizierten Admin-Layout der
  PR-Preview; der lokale Pass umging bewusst keine Admin-Session,
- fachliche Reviewentscheidung zur aus den vorhandenen Readmodels abgeleiteten Signal- und
  Arbeitspriorisierung,
- die beiden out-of-scope Baseline-Verträge separat mit ihrem aktuellen Produkt- und
  Typvertrag harmonisieren,
- Merge erst nach Review und ausdrücklicher Produktfreigabe.

Der Task steht deshalb maximal auf `review`, nicht auf `done`.

## Post-Main-Sync-Revalidierung 2026-08-09

- Der bestehende Branch wurde konfliktfrei mit
  `origin/main@347c8b20eb5e9342c332f82114b5f8d63dd7d893` synchronisiert. Es wurde
  weder ein zweiter Branch noch ein zweiter Pull Request erzeugt.
- Code-Verify-Head vor diesem reinen Evidence-Nachtrag:
  `d65bbfa3034f5cb5efe874041964ab9c832caf23`.
- Die fokussierten Directory- und Render-Verträge sind unter Node `v20.20.2`
  mit **2 Dateien und 16 Tests** grün.
- Die breite Region-/Navigation-/Entitlement-Matrix bestätigt **118 grüne
  Tests**. Drei fachfremde Fehler sind unverändert auf `origin/main`
  reproduzierbar: der bereits kanonische Regionstyp `land`, das veraltete
  Header-Label `Zur Initiative` und der Deep-Search-Fallback-Vertrag. Keiner
  dieser Tests oder Schutzpfade wurde in diesem eng erlaubten Slice verändert.
- Web Critical Guardrails sind mit **17 Dateien und 72 Tests**, Production
  Guardrails mit **12 Dateien und 36 Tests** grün; statischer Guard,
  Typecheck, Lint und `git diff --check` sind ebenfalls grün.
- Der lokale Production-Build ist grün: **255** Page-Contracts ohne Verstoß
  und **322** statisch erzeugte Seiten. Der Worktree enthielt eine bereits
  vorhandene, unveränderte `.env.local`; der isolierte Umgebungsbeleg bleibt
  deshalb der Exact-Head-CI-/Vercel-Lauf.
- `docs/E150/OpenTasks.md` bleibt gegenüber `origin/main` unverändert. Die
  menschliche Desktop-/Mobile-, Light-/Dark- und kontrollierte
  Missing-/Error-/Recovery-Abnahme bleibt offen; Status maximal `review`.
