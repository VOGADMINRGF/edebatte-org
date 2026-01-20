V3 MERGE BRIEFING – VPM25 + eDbtt (Stand: nach Block B/Evidence/Map/Locale)
0. Kontext

Wir haben drei historische Stände, die in 03_edbtt_baseline_2025-11-19 konsolidiert werden sollen:

01_vpm25_original/
– ursprüngliche VPM25-App mit vielen fertigen Features
– Membership/Org-Rechner, alte Dashboards, Streams, Map-/Evidence-Ansätze

02_vpm25_landing_legacy/
– Legacy-Landing + CI/Texte, einzelne Overlays/Stream-Views

03_edbtt_baseline_2025-11-19/
– aktuelles eDbtt mit:

E150-Analyzer & Multi-Provider-Orchestrator

triMongo-Kern für Core/Votes/PII

Membership/Pricing-Split (eDebatte vs eDbtt-Nutzung)

Feeds-Pipeline inkl. StatementCandidates, Analyze-Queue & VoteDrafts

Telemetrie-Grundlage (ai_usage / ai_usage_daily, Dashboard)

Evidence-Graph (Claims, Items, Links, Decisions), Reports & Map

Lokalisation (DE/EN als Kern, erweiterte Sprachen on-demand)

Ziel:
eDbtt ist der Master. VPM25 liefert Features/Layouts/Ideen, die wir in eine saubere, moderne Struktur überführen.
Keine zweite App – sondern ein harmonisiertes System mit klaren „Blöcken“.

1. Architektonische Leitplanken (bitte NIEMALS brechen)
1.1 E150-Kern

Analyzer: apps/web/src/features/analyze/analyzeContribution.ts

Orchestrator: apps/web/src/features/ai/orchestratorE150.ts

Multi-Provider-Profil (OpenAI u.a.), parallele Calls, Timeout, Scoring, Meta-Infos

API: /api/contributions/analyze (JSON, später SSE)

UI:

/contributions/new (Level 2, „Mehr Fakten“, mit Kontext/Fragen/Knoten)

/statements/new (Level 1, gesprochene/vereinfachte Form)

Claims + Kontext/Fragen/Knoten werden nur hierüber erzeugt.
Keine „Schnell-Analyzer“ außen drum herum.

1.2 triMongo

Einzige Mongo-Wahrheit: core/db/triMongo.ts (Core, Votes, PII).

Alle produktiven Collections kommen von hier:

z. B. ai_usage, ai_usage_daily, feed_items, statement_candidates,
analyze_results, vote_drafts, feed_statements,
evidence_claims, evidence_items, evidence_links, evidence_decisions, …

Alte Hilfen sind legacy und bleiben im Migration-Ordner:

apps/web/src/lib/triMongo.ts

apps/web/src/utils/triMongo.ts

apps/web/src/shims/core/db/triMongo.ts

alles unter tools/migration/VPM25/_legacy/triMongo/**

Neue Models (z. B. Votes) nutzen dünne Wrapper:

apps/web/src/models/votes/Vote.ts etc. → geben getCollection + ObjectId zurück.

1.3 Prisma

Relationale Daten nur über:

@db/core

@db/web

Keine neuen Prisma-Client-Instanzen direkt in Apps/Features.
Immer über die bestehenden DB-Pakete gehen.

1.4 AI & Telemetrie

Alle relevanten AI-Calls (Analyzer, Feeds, News-Summaries, Übersetzungen, …) laufen über die AI-Layer (z. B. orchestratorE150, callOpenAIJson etc.).

Jeder AI-Call mit Kosten muss Telemetrie schreiben:

Typen & Pipelines in core/telemetry/aiUsageTypes.ts

logAiUsage als zentraler Helper

Telemetrie-Storage:

ai_usage (Events)

ai_usage_daily (Aggregates)

Dashboard:

/dashboard/usage + UsageKPIPanel als Startpunkt
(später mehr Filter & Tabellen).

1.5 Localization & Regionen

Locale-Definition:

CORE_LOCALES = ["de", "en"] – Pflichtsprachen

EXTENDED_LOCALES = ["fr","pl","es","tr","ar","ru","zh"] – on-demand

zentral in core/locale/locales.ts und apps/web/src/config/locales.ts

Locale-Handling:

LocaleContext + LocaleProvider in apps/web/src/context/LocaleContext.tsx

LocaleSwitcher in Header (apps/web/src/app/(components)/SiteHeader.tsx)

Root-Layout asynchron, liest Cookies/Accept-Language und setzt <html lang>.

Helfer:

resolveLocalizedField / getLocalizedField mit Fallback-Kette:

Ziel-Locale → Fallback → andere Core-Locales → Extended → sourceLocale → Originaltext

Regionen:

Region-Typen & Keys in core/regions/types.ts

Übersetzungen & Labels in core/regions/regionTranslations.ts

Map & Reports nutzen Region-Keys + Übersetzungen statt Hardcoded-Strings.

1.6 Membership & Pricing

eDebatte-Mitgliedschaft (Bewegung)

Modul: apps/web/src/features/membership/*

Grundlage:

1 %-Logik / Mindestbeitrag 5,63 € (dokumentiert in MEMBERSHIP_NOTES.md)

Rechner-Komponente: MembershipCalculator_VOG

Seiten:

/unterstuetzen

/mitglied-werden

Keine Vermischung mit Nutzungscredits für eDbtt.

eDbtt-Nutzungsmodell (Pricing)

Modul: apps/web/src/features/pricing/*

ACCESS_TIER_CONFIG (public → citizen → institution → staff)

Credits/Earn-Rules (Swipes, Beiträge Level 1/2 etc.)

Helper: credits.ts (applySwipesToCredits, canPostContribution, consumeContribution)

UI: PricingWidget_eDbtt

Seiten:

/nutzungsmodell – erklärt Tiers + Earned Credits

Hinweise in anderen Seiten verlinken nur hierauf.

1.7 Legacy-Grenzen & Typecheck

tools/migration/** ist Sandbox, niemals produktiv:

dort liegen 01/02/03-Stände, alte Dashboards, Overlays, Streams etc.

_disabled-Ordner sind reine Referenz.

Typecheck:

apps/web/tsconfig.e150-smoke.json = heiliger Kern

E150-Analyzer, AI, Feeds, Evidence, Reports, Map, Membership/Pricing etc.

Immer grün halten.

apps/web/tsconfig.json exkludiert Migration/_legacy.

2. Stände & Migration

Kurz:

tools/migration/VPM25/01_vpm25_original/
→ Vollausbau VPM25 (Dashboard, Streams, Map-Prototyp, Membership-Org-Rechner).

02_vpm25_landing_legacy/
→ Landing-Variante + Overlays / Stream-Views.

03_edbtt_baseline_2025-11-19/
→ Master-Code, in dem wir alles zusammenführen.

MIGRATION_PLAN.md dokumentiert bereits:

welche Features aus 01/02 „KEEP“, „MIGRATE“ oder „LEGACY“ sind

welche nun in 03 landen.

3. Blöcke A–F – Überblick & Status
Block A – Telemetrie & Dashboards (AI Usage)

Status:

✅ Typen & Collections:

ai_usage, ai_usage_daily inkl. Pipelines in aiUsageTypes.ts

✅ Helper:

logAiUsage schreibt Events inkl. Provider, Model, Tokens, Dauer, Pipeline

✅ API & Dashboard:

/api/admin/telemetry/ai – Snapshot/Aggregate-API

/dashboard/usage – erstes Telemetrie-Panel (UsageKPIPanel)

Nächste Schritte:

Alle AI-Call-Sites anschließen:

orchestratorE150

Feeds/StatementCandidates-Analyze

News-Summaries & Translations (siehe Plan B unten)

ggf. Factcheck-Pipelines

Dashboard erweitern:

Filter: Zeitraum, Provider, Pipeline

Tabelle: Top-Endpoints, Error-Rates

kleine Sparklines/Verläufe pro Provider/Endpoint

Block B – Feeds → StatementCandidates → Votes & News/Evidence („Plan B“)
B.1 – Feeds → StatementCandidates (✅)

Modul: apps/web/src/features/feeds/*

Types:

FeedItemInput, StatementCandidate (+ Status/Meta)

Utils:

buildCanonicalHash, buildStatementCandidate

Storage:

Collections in triMongo:

feed_items (optional raw storage)

statement_candidates (Unique-Index auf canonicalHash)

analyze_results, vote_drafts, feed_statements

API:

/api/feeds/batch (Node, force-dynamic)

POST { items: FeedItemInput[] }

Dedupe via canonicalHash, persistiert neue Kandidaten.

Script:

tools/feeds/import_rss.ts zieht RSS/Atom, normalisiert zu FeedItemInput und postet nach /api/feeds/batch.

B.2 – StatementCandidates → Analyze → VoteDrafts + Admin (✅)

Analyze-Queue:

features/feeds/analyzePending.ts:

claimt statement_candidates mit analyzeStatus = "pending"

ruft analyzeContribution inkl. Locale/Pipeline

speichert Ergebnis in analyze_results

erzeugt vote_drafts mit Titel/Summary/Top-Claims/RegionMeta

Publish-Flow:

features/feeds/voteDrafts.ts

features/feeds/publishVoteDraft.ts:

schreibt feed_statements

aggregiert ggf. vorhandene Votes und synchronisiert Decisions (→ Evidence)

Admin-API:

apps/web/src/app/api/admin/feeds/drafts/**

list/detail/status-update/publish

Role-Guard (staff/admin)

Admin-UI:

/admin/feeds/drafts – Liste mit Filtern

/admin/feeds/drafts/[id] – Detail: Feed-Text, Analyze-Result, Draft-Content, Buttons (Review/Discard/Publish)

Doku & Backfill:

tools/migration/VPM25/FEED_PIPELINE_NOTES.md

tools/migration/VPM25/feeds_backfill_candidates.ts

B.3 – Neuer Fokus: News/RSS als Evidence-Quelle („Plan B – Faktencheck only“) (🚧)

Idee:
RSS/News dienen nicht zur Produktion eigener eDebatte-Statements, sondern als Evidence-Quellen für Claims.
Wir speichern nur Kurztexte + Metadaten, keine Volltexte. Darstellung immer mit Link auf das Original.

Bestehende Feeds/StatementCandidates/Evidence-Funktionen (Block B, Evidence, Reports, Map) sollen weiter funktionieren – wir erweitern/refactoren, bauen nichts ab.

B.3.1 – RSS-Import auf Metadaten + Short Summary begrenzen

Datei: tools/feeds/import_rss.ts

Beim Bau von FeedItemInput:

Nicht den kompletten Artikeltext oder lange Description übernehmen.

title: wie bisher

summary/body:

bereinigter Kurztext (z. B. aus description), HTML strippen

hart auf ~500–800 Zeichen schneiden

keine Bilder, keine Volltexte

url: Pflichtfeld (kanonische Artikel-URL)

neue Felder:

sourceName: "Tagesschau", "Reuters", "dpa", …

sourceType: "news" | "press_release" | "blog" …

sourceLocale / regionCode: wie bisher, aber normalisiert (Locale-Helper / Region-Helper).

FEED_PIPELINE_NOTES.md ergänzen:

klarer Satz: „Wir speichern aus Feeds nur Kurztexte + Metadaten, keine Volltexte.“

B.3.2 – EvidenceItemDoc als News-Quelle modellieren

Dateien: core/evidence/types.ts + DB-Helper

EvidenceItemDoc erweitern um:

sourceKind: "news_article" | "press_release" | "blog" | "official_doc"

url: string (unique)

publisher: string

publishedAt: Date

author?: string

licenseHint?: "unknown" | "cc_by" | "paywalled" | "public_domain" | …

shortTitle: string

shortSummary: string (max ~800 Zeichen)

quoteSnippet?: string (max ~300 Zeichen, optional)

isActive: boolean (default true)

Indexe:

Unique-Index auf url

Indexe für publisher, sourceKind, publishedAt

B.3.3 – Pipeline: Candidate → Analyze → EvidenceItem + EvidenceLinks

Dateien: features/feeds/analyzePending.ts, features/evidence/syncFromAnalyze.ts (Hook), ggf. features/feeds/voteDrafts.ts

In analyzePendingStatementCandidates:

Erkennen, ob Candidate aus RSS/News kommt:

z. B. pipelineMeta.source === "rss" oder sourceName/feedItemId vorhanden.

Nach analyzeContribution + syncAnalyzeResultToEvidenceGraph:

neuen Helper aufrufen, z. B.:
syncNewsEvidenceForCandidate({ candidate, analyzeResult })

Neuer Helper features/evidence/syncNewsEvidence.ts:

EvidenceItem:

findOrCreate per url

füllt publisher, publishedAt, sourceKind, shortTitle, shortSummary, licenseHint

EvidenceLinks:

für relevante/Top-Claims des AnalyzeResults:

fromClaimId → evidenceItemId

linkType: "source_context" | "reported_by"

pipeline: "news_factcheck"

B.3.4 – Helper gegen Volltext: summariseForEvidence

Datei (neu): features/evidence/summariseForEvidence.ts

Signatur:

summariseForEvidence(input: string, maxChars: number): Promise<string>

v1 Implementation:

HTML strippen

Whitespace normalisieren

hart auf maxChars schneiden

Optional später:

GPT-Kurzfassung (Pipeline-Name z. B. "content_summarize_news")

auch hier: logAiUsage zwingend

Verwendung:

beim Bau von FeedItemInput.body/summary

in syncNewsEvidenceForCandidate, falls Analyse-Text neu summarisiert werden soll

B.3.5 – Public Evidence-UI: Quellen anzeigen, nicht replizieren

Dateien: apps/web/src/app/evidence/[regionCode]/page.tsx, ggf. EvidenceClaimCard

Wenn ein Claim EvidenceItems mit sourceKind = "news_article" hat:

Unterhalb des Claims Box „Quellen aus Medienberichten“ darstellen:

je Item:

publisher

shortTitle oder kurzer Ausschnitt aus shortSummary

Link „Zur Quelle“ (url, target="_blank")

Keine langen Fließtexte. Immer Kurzinfo + Link.

Kurzer Disclaimer, z. B.:

„Hinweis: Die Inhalte der verlinkten Quellen liegen in der Verantwortung der jeweiligen Anbieter. Wir zitieren nur kurze Ausschnitte zur Einordnung.“

/reports + /map:
optional Kennzahlen ergänzen:

Anzahl News-Quellen pro Thema/Region

Top-Publisher-Namen (ohne Inhalte)

B.3.6 – Admin-UI für EvidenceItems (Quellenverwaltung)

Dateien:

API:

apps/web/src/app/api/admin/evidence/items/**

list, detail, update (isActive, licenseHint, optional Textfelder)

staff/admin-Guard

UI:

/admin/evidence/items

Tabelle mit publisher, sourceKind, locale/region, publishedAt, verknüpften Claims, isActive-Toggle

/admin/evidence/items/[id]

Detailseite mit Bearbeitungsformular

Wirkung:

isActive === false → Quelle erscheint nicht mehr in Public-Views
(Claim/Links bleiben technisch, Rendering filtert sie raus).

B.3.7 – Telemetrie

Datei: core/telemetry/aiUsageTypes.ts

Pipelines klarziehen/ergänzen:

"feeds_to_statementCandidate" (bestehend)

neu: "news_factcheck" (für Sync/AI-Summaries)

optional "content_summarize_news" für summarise-GPT-Variante

logAiUsage an den News-Summarize-/Translate-Call hängen.

B.3.8 – Briefing aktualisieren

Diese Plan-B-Sektion ist genau dafür da: dokumentiert, dass:

RSS = Seed für EvidenceItems, nicht für Citizens-Statements

nur Kurztexte + Links gespeichert werden

Evidence-Graph Claim ↔ Quelle abbildet

Admin Quellen feinsteuern kann

Block D – Localization / Mehrsprachigkeit

Status:

✅ Locale-Infra:

CORE_LOCALES & EXTENDED_LOCALES in core/locale/locales.ts & apps/web/src/config/locales.ts

LocaleProvider, LocaleContext, LocaleSwitcher, asynchrones Layout

✅ Region-Übersetzungen:

Region-Typen & region_translations + Helper zum Namen-Lookup

✅ Seiten-Strings:

Landing, /unterstuetzen, /mitglied-werden, /nutzungsmodell, /faq, /impressum, /daten etc. nutzen strings.ts + useLocale()

Aktuell: DE als Master, alle anderen Locales fallbacken auf deutsche Texte (kein „freestyle“-EN).

✅ Übersetzungshelfer:

translateAndStore (DE/EN-Backfill, speichert in content_translations)

translateOnDemand (Core/Extended-Locales nur bei Bedarf)

Fallback-Logik nutzt sourceLocale und resolveLocalizedField.

Nächste Schritte (später aktivieren, nicht sofort):

On-Demand-Übersetzungen für Daten-Content:

Feeds/Statement-Detail, Evidence-Claims, Regions → bei Wechsel auf FR/PL/ES/TR/AR/RU/ZH translateOnDemand triggern, Ergebnis speichern, Telemetrie loggen.

Form-Flows (/contributions/new, /statements/new) Schritt für Schritt auf strings.ts-Pattern heben, aber:

KEINE automatischen Content-Änderungen ohne explizite Freigabe (E150-Prompts bleiben stabil).

Block C & G – Evidence-Graph, Reports & Map

Status:

✅ Evidence-Core:

core/evidence/types.ts + triMongo-Collections:

evidence_claims, evidence_items, evidence_links, evidence_decisions

features/evidence/syncFromAnalyze.ts:

wandelt AnalyzeResult in Claims mit stabilen claimId, Region, Locale, Pipeline-Meta

features/evidence/syncFromVotes.ts:

erzeugt/aktualisiert Decisions (yes/no/abstain-Anteile) aus Votes

✅ Query-Layer:

core/evidence/query.ts:

filterbare Aggregation inkl. Links & Decisions

berechnet latestDecision pro Claim

✅ Admin-Layer:

API: /api/admin/evidence/claims* (Liste/Detail/Update)

UI: /admin/evidence/claims + /admin/evidence/claims/[id]

Filter (Locale, Region, Pipeline, Text)

Edit für Text/Topic/Region/Visibility

✅ Public Evidence-Views:

/evidence/[regionCode]:

listet Claims einer Region, Filter für Locale/Pipeline/Text

zeigt Decision-Badge („Mehrheit: X % Zustimmung – Stand: …“)

/evidence/[regionCode]/[topicKey]:

einfache Themenliste

Navigation: „Evidence“-Link in Header (z. B. /evidence/global)

✅ Reports:

features/report/evidenceAggregates.ts:

fasst Claims/Decisions pro Region/Topic zusammen

API: /api/reports/overview

Service: features/reports/service.ts → getRegionReportOverview

UI: /reports:

zeigt Evidence-Totals, Topic-KPIs, Decision-Infos (mit Access-Tier-Gating)

✅ Map:

API: /api/map/points:

aggregiert Evidence-Claims pro Region

reichert mit lokalisierten Namen + Prisma-Region-Meta (Koordinaten) an

filtert per Locale/BBox

UI:

features/map/components/MapClient.tsx (Marker-Radius ~ Claim-Volume)

Wrapper ClientWrapper / MapePageClient erhalten Locale aus Header

Nächste Schritte (zusätzlich zu Plan B-News):

Region-Meta anreichern:

region.meta.center (lat/lon) für alle relevanten Regionen füllen, damit Map sauber rendert.

Evidence-Graph optional auf GraphDB spiegeln:

Arango/Neo4j-Adapter als optionale Stubs, Builds dürfen nie scheitern, wenn Graph nicht konfiguriert ist.

Block E – Membership & Pricing (Bewegung vs Nutzung)

Status:

✅ eDebatte-Membership:

features/membership/*, MembershipCalculator_VOG

1 %-Logik/Mindestbeitrag 5,63 € dokumentiert

eingebunden auf /unterstuetzen, /mitglied-werden

✅ eDbtt-Pricing:

features/pricing/* mit Access-Tiers & Earn-Regeln (Swipes → Credits → Beiträge)

PricingWidget_eDbtt zeigt Tiers, Limits, Earn-Mechanik

/nutzungsmodell erklärt das Modell

✅ Trennung:

VoG-Mitgliedschaft ≠ eDbtt-Nutzung, Texte und UI klar getrennt.

Nächste Schritte (Detail-Feinschliff):

Earn-Regeln in UI klarer machen (z. B. „100 Swipes → 1 Beitrag Level 1“, „500 Swipes → Level 2“ etc.).

Reporting-Hooks (Telemetrie) für Swipes/Credits definieren.

Block F – Streams, Overlays, Dashboards (✅)

Umgesetzt:
- Domain-Layer: `features/stream/types.ts` + triMongo-Collections (`stream_sessions`, `stream_agenda_items`).
- APIs: `/api/streams/sessions`, `/api/streams/sessions/[id]/agenda`, `/api/streams/sessions/[id]/overlay-feed`, `/api/streams/sessions/[id]/vote` (creator/staff-guarded).
- Creator UI: `/dashboard/streams` (Sessionliste) & `/dashboard/streams/[id]` (Cockpit mit Agenda, Live-Ansicht, Item-Erstellung).
- OBS-Overlay: `/overlay/stream/[id]` liest Overlay-Feed, zeigt Frage/Statement + Poll-Balken inkl. anonym/öffentlich-Badge.
- Votes landen weiter in `votes`-Collection, ergänzt um `streamSessionId`/`agendaItemId`; `features/evidence/syncFromVotes` hat TODO-Stub für spätere Evidence-Hooks.

4. Umsetzungsspielregeln für Codex

Keine neuen node_modules in tools/migration/**.

tsconfig.e150-smoke.json muss immer grün sein.
Neue Blöcke zuerst gegen den Smoke-Typecheck führen.

_disabled & _legacy sind Deko/Referenz, nicht reaktivieren.

Neue Features:

in features/*

APIs unter app/api/* mit:

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

AI-Calls:

nur über bestehende AI-Layer (orchestratorE150, callOpenAIJson…)

immer logAiUsage verwenden, Pipeline sauber setzen.

Lokalisierung:

DE ist Master, andere Locales fallbacken, solange wir keine geprüften Übersetzungen hinterlegt haben.

Keine „kreativen“ EN-Texte in statischen Seiten ohne explizite Freigabe.

Legal / News:

Keine Volltexte oder Paywall-Texte in Mongo spiegeln.

Nur Kurzfassungen + Metadaten; Darstellung immer mit Link zur Originalquelle.

Admin-Controls (isActive, licenseHint) respektieren.

5. Konkreter nächster Auftrag: News & Evidence – Plan B umsetzen

Bitte genau diesen Block abarbeiten (Reihenfolge kann leicht variieren, aber alles innerhalb von Block B.3):

tools/feeds/import_rss.ts so umbauen, dass nur Kurztexte (500–800 Zeichen), Metadaten, URL, SourceName/Type gespeichert werden – keine Volltexte.

EvidenceItemDoc in core/evidence/types.ts um sourceKind, url, publisher, publishedAt, author, licenseHint, shortTitle, shortSummary, quoteSnippet, isActive erweitern + passende Indexe setzen.

analyzePendingStatementCandidates erweitern:

Source-Erkennung für RSS/News

neuen Helper syncNewsEvidenceForCandidate nach Analyze/Sync aufrufen.

features/evidence/syncNewsEvidence.ts implementieren:

News-EvidenceItem findOrCreate per URL

EvidenceLinks Claim → Item mit linkType = "source_context" | "reported_by", pipeline = "news_factcheck".

summariseForEvidence als schlanken Helper bauen (HTML strip + Hard-Cut), GPT-Option später, aber schon pipeline-Tag vorsiehen.

/evidence/[regionCode] erweitern:

unter Claims Kurzliste „Quellen aus Medienberichten“ (Publisher, kurzer Titel/Teaser, Link), mit Disclaimer.

Admin-API & UI für EvidenceItems (/api/admin/evidence/items/**, /admin/evidence/items/**) aufsetzen, inkl. isActive & licenseHint.

Telemetrie-Pipelines in aiUsageTypes.ts um "news_factcheck" (und optional "content_summarize_news") ergänzen und alle neuen AI-Helper mit logAiUsage anhängen.

Diese Plan-B-Sektion nach Umsetzung im Briefing kurz updaten (Status-Flag: ✅ / 🚧), aber keine anderen Blöcke rückbauen.
