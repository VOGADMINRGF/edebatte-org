# eDebatte SEO & Discovery Contract

Status: **verbindlicher Arbeitscontract im SEO-/Discovery-Slice**  
Stand: **2026-09-03**  
Owner-Slice: Issue #709 / Draft-PR #710  
Abhängigkeit: kanonische Brand-/Citizen-Positionierung aus Draft-PR #672; operative Synchronisierung mit `docs/E150/OpenTasks.md` bleibt Pflicht vor Abschluss nach Repo-Governance.

## 1. Zweck

Dieser Contract manifestiert, wie eDebatte organische Auffindbarkeit, internationale Sichtbarkeit und AI-Search-Discovery aufbaut, ohne die Produktwahrheit, Neutralität oder Citizen-first-Architektur zu verwässern.

SEO ist **kein separater Marketing-Trick**. Die Auffindbarkeit soll aus der eigentlichen Produktstärke entstehen:

`gesellschaftliches Signal → Problemklärung / Sensemaking → Quellen / Evidenz / Widersprüche → Handlungsoptionen / Zielkonflikte → Deliberation / Priorisierung → institutioneller Anschluss → nachvollziehbarer Debatten- und Wissensstand`

Die öffentlich verständliche Leitidee bleibt:

> **Beteiligung beginnt vor dem Verfahren.**

Die strategische internationale Kategorie kann ergänzend mit Begriffen wie **democratic problem-solving**, **civic collective intelligence**, **public reasoning**, **participatory democracy** und **deliberative democracy** beschrieben werden, ohne die verständliche Bürgeransprache durch Fachsprache zu ersetzen.

## 2. Free-first / Zero-recurring-cost-Prinzip

Für SEO, Discovery, Indexierung und AI-Search gilt standardmäßig:

1. **Keine kostenpflichtige SEO-, AEO-, GEO-, Backlink-, Keyword- oder Übersetzungssoftware als Voraussetzung.**
2. Vor jeder kostenpflichtigen Lösung müssen freie Webstandards, bestehende Repo-Funktionen und kostenlose First-Party-Werkzeuge ausgeschöpft werden.
3. Zulässige bevorzugte Werkzeuge sind insbesondere:
   - Google Search Console,
   - Bing Webmaster Tools,
   - IndexNow,
   - Schema.org / JSON-LD,
   - XML-Sitemaps,
   - `robots.txt`, Canonicals und `hreflang`,
   - bestehende GitHub-/CI-/Vercel- und Produktmetriken, soweit ohne neue laufende Kosten verfügbar.
4. Keine gekauften Backlinks, keine Linkfarmen, keine künstlichen Erwähnungen und keine bezahlten Rankingversprechen.
5. Keine Massenproduktion dünner KI-Texte oder austauschbarer SEO-Landingpages.
6. Keine Sonderarchitektur nur für vermeintliche „AI SEO“-Hacks. Dateien oder Protokolle ohne belastbaren Search-/Produktnutzen werden nicht eingeführt, nur weil sie als Trend vermarktet werden.
7. Eine spätere bezahlte Maßnahme braucht eine separate dokumentierte Entscheidung mit Nutzen, Kosten, Datenschutz-/Governance-Auswirkung und messbarem Ziel.

## 3. Internationale URL- und Sprachstrategie

### 3.1 Nicht „nur Englisch“

Englisch ist **die erste echte internationale Index-Sprache**, nicht die einzige zukünftige Sprachversion.

Die Architektur muss weitere Sprachen ermöglichen, sobald dafür hochwertige Inhalte, reale Zielgruppen oder Community-Signale existieren.

Beispielhafte zukünftige Struktur:

- Deutsch: kanonischer Default ohne Sprachpräfix, z. B. `/warum-edebatte`
- Englisch: `/en/...`
- später mögliche echte Sprachversionen: `/fr/...`, `/es/...`, `/pl/...`, `/it/...` usw.

Diese Beispiele sind ein Discovery-Muster und begründen **keine Pflicht**, sofort jede bestehende App-Route in jede Sprache zu duplizieren.

### 3.2 Kriterien vor Indexierung einer neuen Sprache

Eine neue Sprachversion wird erst als eigenständige indexierbare SEO-Fläche angelegt, wenn mindestens folgende Bedingungen erfüllt sind:

- Hauptinhalt ist tatsächlich in dieser Sprache verfügbar und redaktionell plausibilisiert;
- Title, Description, Headings und Kernbotschaften sind sprachlich eigenständig und nicht nur UI-Chrome;
- die Seite bietet denselben fachlichen Wert wie die kanonische Fassung oder einen klar dokumentierten lokalisierten Mehrwert;
- Canonical verweist auf die eigene Sprach-URL;
- `hreflang` ist wechselseitig korrekt;
- Sprachumschaltung ist als normaler crawlbarer Link möglich;
- keine automatische IP-basierte Geolokalisierung verändert still den indexierbaren Hauptinhalt;
- die neue Sprache erzeugt keine dünnen, nahezu identischen Doorway-Seiten.

Wenn diese Qualität nicht erreicht wird, wird die Sprachversion **nicht nur für SEO erzeugt**.

### 3.3 `hreflang` / Canonical

Für echte Sprachpaare gilt:

- jede Version listet sich selbst und alle vorhandenen Alternativen;
- `hreflang` ist reziprok;
- `x-default` dient als definierter Fallback;
- Canonicals bleiben sprachspezifisch selbstreferenziell, sofern der Hauptinhalt wirklich übersetzt/lokalisiert ist;
- Sitemap und Metadata müssen dieselbe Sprachbeziehung ausdrücken oder bewusst eine einzige gepflegte Methode wählen, wenn die Wartung sonst Drift erzeugt.

Aktueller P0-Start in PR #710:

- `/warum-edebatte` ↔ `/en/why-edebatte`
- `/vergleich` ↔ `/en/civic-tech-landscape`

Weitere Sprachpaare folgen **qualitäts- und nachfragegetrieben**, nicht nach Anzahl unterstützter UI-Sprachen.

## 4. Knowledge & Research Layer als organischer Wachstumshebel

Der wichtigste langfristige SEO-/AI-Discovery-Hebel ist kein Keyword-Volumen, sondern **eigene zitierfähige Wissenssubstanz**.

eDebatte soll schrittweise einen öffentlichen Knowledge-/Research-Layer erhalten. Der endgültige Routenname (`/wissen`, `/research` oder eine andere kanonische Benennung) ist eine eigene Produkt-/Naming-Entscheidung und wird nicht in diesem Contract still festgelegt.

### 4.1 Priorisierte Pillar-Themen

Erste sinnvolle Themencluster:

- Was ist gesellschaftliche Willensbildung?
- Was bedeutet Agenda-Setting in einer Demokratie?
- Was ist Public Reasoning?
- Was ist Civic Collective Intelligence?
- Bürgerbeteiligung vs. gesellschaftliche Willensbildung
- Warum demokratische Beteiligung vor einer Abstimmung beginnt
- Evidenz, Perspektive, Behauptung und Unsicherheit in öffentlicher Debatte
- Wie digitale Deliberation funktioniert
- Wie KI demokratische Zusammenarbeit unterstützen darf – und wo menschliche Verantwortung bleibt
- internationaler Civic-Tech-/Digital-Democracy-Landscape-Report

### 4.2 Original Research statt Commodity Content

Bevorzugt werden Inhalte, die nicht beliebig austauschbar sind:

- eigene Taxonomien und Vergleichsmodelle,
- nachvollziehbare Plattformvergleiche mit Quellen und Methodik,
- eigene aggregierte, datenschutzkonforme Produkt-/Debattenbeobachtungen,
- transparent dokumentierte Research-Methoden,
- Changelogs und Aktualisierungsstände,
- zitierfähige Dossiers, Matrizen, Zeitreihen oder Landscape-Reports,
- explizite Unsicherheiten und Gegenpositionen.

Zu vermeiden:

- generische „10 Vorteile von Bürgerbeteiligung“-Artikel ohne eigenen Erkenntniswert,
- massenhaft erzeugte Definitionen ohne Quellen oder originären Beitrag,
- SEO-Seiten, deren Hauptzweck nur das Abfangen eines Keywords ist.

### 4.3 Global Civic Tech Landscape

Der bestehende Vergleichscluster aus PR #710 bildet den Startpunkt für einen späteren versionierten **Global Digital Democracy / Civic Tech Landscape Report**.

Der Report soll mindestens dokumentieren:

- betrachtete Plattformen und Kategorien,
- Auswahlkriterien,
- Stand der Recherche,
- Quellen,
- Unterschiede zwischen institutionellen Beteiligungsprozessen, Bottom-up-Initiativen, Mass Deliberation, Computational Democracy und AI/Collective Intelligence,
- eDebatte-Zielbild ohne falsche Exklusivbehauptungen,
- Änderungsverlauf bei Aktualisierungen.

Er soll als Presse-, Research-, Partner-, Investor- und Backlink-fähige Referenz funktionieren, nicht als Werbevergleich.

## 5. Topic-, Dossier- und Community-SEO

Langfristig soll **das Produkt selbst** der stärkste organische Discovery-Motor werden.

### 5.1 Öffentliche Themen und Dossiers

Öffentliche indexierbare Themen-/Dossier-Seiten sollen, soweit im Produkt vorhanden und freigegeben:

- eine stabile kanonische URL haben;
- einen klaren Titel und eine verständliche Zusammenfassung besitzen;
- Problemdefinition und Kontext sichtbar machen;
- Quellen/Evidenzen von Positionen unterscheiden;
- Gegenargumente, Widersprüche und Unsicherheiten nicht verstecken;
- Handlungsoptionen und Zielkonflikte nachvollziehbar darstellen;
- Aktualisierungsstand und relevante Zeitbezüge sichtbar machen;
- intern zu verwandten Themen, Quellen, Dossiers und Beteiligungsmöglichkeiten verlinken.

Nicht indexieren bzw. kein SEO-Ziel:

- private Inhalte,
- Review-/Admin-Flächen,
- leere oder fast leere Drafts,
- technische Zwischenzustände,
- personenbezogene oder sensible Inhalte, die nicht ausdrücklich öffentlich sein dürfen,
- dünne automatisch erzeugte Varianten ohne eigenständigen Nutzen.

### 5.2 Discussion-/Community-Markup

Wenn öffentliche eDebatte-Seiten tatsächlich nutzergenerierte Diskussionsbeiträge enthalten, soll geprüft und implementiert werden:

- `DiscussionForumPosting` für echte Diskussionsinhalte,
- `ProfilePage` für reale öffentliche Creator-/Autorprofile,
- Verknüpfung zwischen Beiträgen und öffentlichen Profilen nur innerhalb der geltenden Privacy-/Visibility-Regeln.

Dieses Markup darf **nicht** auf Marketingseiten simuliert werden. Structured Data muss den sichtbaren Seiteninhalt korrekt beschreiben.

## 6. Structured Data

Bevorzugte sinnvolle Schema-Layer:

- `WebSite` für die Domain,
- passende `Organization`-Angaben für eDebatte,
- `BreadcrumbList` für echte Navigationshierarchien,
- `Article` bzw. passende redaktionelle Typen für echte Research-/Knowledge-Publikationen,
- `DiscussionForumPosting` für reale öffentliche Community-Diskussionen,
- `ProfilePage` für reale öffentliche Creatorprofile.

Regeln:

- kein Schema-Markup nur zum Erzwingen eines Rich Results;
- keine Angaben, die auf der sichtbaren Seite nicht gestützt werden;
- kein Rating-/Review-/FAQ-Markup ohne sachlich passenden Seitentyp und aktuelle Search-Guideline;
- Structured Data ist Ergänzung, kein Ersatz für crawlbaren, verständlichen Hauptinhalt.

## 7. Interne Informationsarchitektur

Organisches Wachstum soll über klare Cluster entstehen:

`Pillar / Hub → vertiefende Wissensseite → Dossier / Thema → Quellen / Beteiligung → verwandte Themen`

und für Wettbewerbs-/Landscape-Research:

`/vergleich → Plattform-/Kategorievergleich → Methodik / Research → warum eDebatte → passende reale Produktfläche`

Pflichtprinzipien:

- wichtige Seiten dürfen nicht nur über Suche oder JavaScript erreichbar sein;
- Links verwenden beschreibende Anchor-Texte;
- verwandte Inhalte werden inhaltlich, nicht nur algorithmisch, verbunden;
- Breadcrumbs und Hub-Seiten bilden die Hierarchie sichtbar ab;
- die Homepage bleibt fokussiert und wird nicht zum Keyword-Verzeichnis.

## 8. Indexierung und Discovery

### 8.1 Google

Kostenlose Basis:

- Google Search Console verifizieren,
- XML-Sitemap einreichen und überwachen,
- Indexierungs-/Crawl-/Structured-Data-Probleme beheben,
- Search-Performance nach Themenclustern beobachten,
- verfügbare Berichte zu generativen KI-Funktionen nutzen, wenn für die Property freigeschaltet.

### 8.2 Bing und teilnehmende Suchmaschinen

- Bing Webmaster Tools verifizieren,
- Sitemap einreichen,
- **IndexNow** als bevorzugten automatischen Änderungs-Ping für neu veröffentlichte, aktualisierte oder gelöschte öffentliche URLs vorsehen.

IndexNow meldet Änderungen; es ist **keine Ranking- oder Indexierungsgarantie**.

### 8.3 IndexNow-Implementierungsregel

Wenn umgesetzt:

- nur echte öffentliche URL-Änderungen melden;
- keine privaten, Review-, Admin- oder nicht indexierbaren URLs einreichen;
- Publish/Update/Delete-Ereignisse idempotent behandeln;
- Fehler dürfen Publishing nicht blockieren;
- keine zusätzliche bezahlte SaaS-Abhängigkeit einführen.

## 9. AI Search / Generative Discovery

Die AI-Search-Strategie folgt denselben Qualitätsprinzipien wie klassische Suche:

- einzigartige, nicht austauschbare Inhalte,
- klare technische Crawl-/Indexierbarkeit,
- saubere Quellen und nachvollziehbare Aussagen,
- erkennbare Autor-/Organisationskontexte,
- Aktualität und Änderungsstand,
- gute Seitenstruktur,
- sinnvolle Bilder/Diagramme/Video nur dort, wo sie Erkenntnis hinzufügen.

Kein Ziel ist, Inhalte speziell für einen einzelnen Chatbot zu manipulieren. Ziel ist, dass eDebatte **als belastbare Quelle auffindbar und zitierfähig** ist.

## 10. Performance und Page Experience

Öffentliche SEO-, Knowledge-, Vergleichs- und Dossier-Seiten sollen besonders leicht und crawlbar bleiben.

Prioritäten:

- serverseitig bzw. statisch renderbarer Hauptinhalt, wo sinnvoll;
- keine unnötigen Client-Runtimes im Above-the-fold-Bereich;
- stabile Layouts;
- optimierte Medien;
- barrierefreie Semantik;
- Core Web Vitals fortlaufend überwachen;
- visuelle Effekte dürfen Inhalt und Lesbarkeit nicht verdecken.

Voxy-/Animation-/Interaktionslayer dürfen die textuelle Hauptinformation nicht zur Voraussetzung für Verständnis oder Indexierung machen.

## 11. Ecosystem-SEO und Neutralitätsgrenze

Das Ökosystem darf sichtbar sein, aber Rollen bleiben getrennt:

- **eDebatte:** offene Infrastruktur,
- **VoiceOpenGov:** internationale Mitgliederbewegung,
- **Vote4Gov:** gesellschaftliche Denkwerkstatt,
- **Voxy:** transparente Begleitung.

Kanonische Grenze:

> **VoiceOpenGov nutzt eDebatte, besitzt eDebatte aber nicht.**

SEO darf eDebatte nicht in ein Wahlkampf-, Partei- oder Bewegungsinstrument umdeuten. VoiceOpenGov darf als gesellschaftlicher Mobilisierungs-/Community-Layer erklärt und verlinkt werden, ohne die Neutralitäts- und Produktwahrheit der eDebatte-Infrastruktur zu überschreiben.

## 12. Messung ohne kostenpflichtige SEO-Suite

Mindestens beobachten:

- indexierte öffentliche URLs,
- Crawl-/Indexierungsfehler,
- Impressionen und Klicks,
- CTR,
- Suchanfragen und Themencluster,
- Brand vs. Non-Brand Queries,
- DE vs. EN und später weitere Sprachsegmente,
- Sichtbarkeit der Knowledge-/Research-Pillars,
- organische Einstiege in Themen/Dossiers,
- interne Weiterklicks von Wissensseiten in Beteiligung,
- Core Web Vitals,
- Backlinks/Verweise soweit über kostenlose First-Party-Werkzeuge sichtbar,
- Search-AI-Impressions, sobald die jeweilige Plattform diese Daten für die Property bereitstellt.

Kein KPI darf zur inhaltlichen Zuspitzung gegen die Foundation-Werte führen. Reichweite allein ist kein Fortschritt, wenn Vertrauen, Evidenz oder gesellschaftlicher Langzeitwert sinken.

## 13. Umsetzungsphasen

### P0 – bereits in / direkt nach PR #710

- Positionierung „Beteiligung beginnt vor dem Verfahren“
- `/warum-edebatte`
- internationaler `/vergleich`-Hub
- faire internationale Vergleichsseiten
- Sitemap-/Discovery-Cluster
- Structured-Data-Grundlage
- echte EN-Pillar-URLs für Positionierung und Landscape
- DE/EN-`hreflang`/Canonical-Contract
- Ecosystem-Erklärung ohne Ownership-Verwischung

### P1 – nächster Discovery-/Knowledge-Slice

- finalen Namen/Routencontract für Knowledge-/Research-Layer entscheiden
- 5–8 originäre Pillar-Seiten aufbauen
- Global Civic Tech Landscape als versionierte Research-Referenz ausarbeiten
- Methodik-/Quellenstandard für Research-Seiten
- Breadcrumbs für neue Wissens-/Vergleichshierarchie
- Google Search Console / Bing Webmaster Setup dokumentieren, soweit noch nicht vorhanden
- IndexNow implementieren, wenn technisch passend

### P2 – Produkt als Discovery Engine

- öffentliche Dossier-/Topic-Seiten nach Qualitäts-/Visibility-Gate systematisch indexierbar machen
- passende Discussion-/Profile-Structured-Data-Layer
- interne Knowledge→Dossier→Participation-Verlinkung
- sprachspezifische Expansion nach realer Nachfrage und Contentqualität

### P3 – Skalierung ohne Thin Content

- weitere echte Sprachversionen nach den Kriterien aus Abschnitt 3
- weitere Research-Reports/Datensichten
- internationale Partner-/Research-Zitationen
- kontinuierliche Aktualisierung statt massenhafter Seitenerzeugung

## 14. Nicht verhandelbare Grenzen

- keine falschen Feature- oder Rankingversprechen;
- keine Behauptung, eDebatte sei die einzige citizen-led Plattform;
- keine versteckte automatische Veröffentlichung;
- keine Abstimmung über Fakten oder Wahrheit;
- keine dünnen massenhaft generierten Sprach-/Vergleichsseiten;
- keine bezahlten SEO-Abhängigkeiten ohne neue explizite Entscheidung;
- keine SEO-Optimierung, die Quellen, Widersprüche, Unsicherheit oder menschliche Verantwortung reduziert;
- keine politische Vereinnahmung der eDebatte-Infrastruktur durch das Ökosystem.

## 15. Agenten-/Folgearbeitsregel

Jeder zukünftige Slice, der öffentliche Discovery, SEO, internationale Landingpages, Knowledge/Research, Vergleichsseiten, Sitemap/Canonical/Hreflang, Structured Data, IndexNow, öffentliche Dossiers oder Community-Indexierung verändert, soll diesen Contract zusammen mit den höher priorisierten Foundation-/Brand-Dokumenten prüfen.

Ein echter Bedeutungswechsel bleibt zuerst in Foundation/Brand zu entscheiden. Dieser Contract konkretisiert die **Discovery-Projektion**, nicht die Produktverfassung.
