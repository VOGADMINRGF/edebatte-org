# eDebatte Marketing & Growth OS

Status: `canonical_working_source`

## Zweck

Dieser Bereich ist die versionierte Arbeitsgrundlage für Marketing, Vertrieb, Social Media, Video, Presse, Partnerschaften, White-Label-Ausgaben und wiederverwendbare Kommunikationsvorlagen von eDebatte und VoiceOpenGov.

Er ersetzt keine Produkt-, Governance-, Pricing-, Rollen- oder Routingentscheidung. Marketing folgt der dokumentierten Produktwahrheit und darf keine Funktionen, Partner, Reichweiten, Ergebnisse oder Freigaben behaupten, die im Produkt und Repository nicht belegt sind.

## Verbindliche Trennung

- `docs/marketing/**` enthält Strategie, Copy, Kampagnenpläne, Briefings, Storyboards, Vorlagen, Schemas und Automationsregeln.
- `apps/web/public/marketing/**` enthält ausschließlich freigegebene, auslieferbare statische Assets und deren Manifest.
- `apps/web/public/brand/**` bleibt die kanonische Quelle für bestehende Brand- und Voxy-Assets.
- `docs/E150/OpenTasks.md` bleibt die operative Implementierungs-SSOT.
- `/admin/marketing` ist das Zielbild für operative Steuerung; Markdown bleibt Evidence und fachliche Quelle.

## Kanonische Grundlagen

Vor jeder Kampagne oder Zielgruppenunterlage sind mindestens zu prüfen:

- `apps/web/public/brand/README.md`
- `apps/web/public/brand/voxy/manifest.json`
- `apps/web/src/features/voxy/voxyAssets.ts`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/brand.ts`
- `docs/E150/UX-VOXY-MOTION-GUIDE-01_2026-05-29.md`
- `docs/E150/V3_VOXY_SELF_RENDER_AND_MARKETING_PILOT_ROADMAP_2026-07-13.md`
- `docs/E150/VOG-MISSION-LAYER-01_2026-07-26.md`
- `docs/E150/Part12_Campaigns_Admin_Telemetry.md`
- `docs/E150/membership_pricing.md`
- `docs/E150/Part04_B2G_B2B_Models.md`

Für SEO, öffentliche Discovery, internationale Landingpages, Knowledge/Research, Vergleichsseiten, Sitemap/Canonical/Hreflang, Structured Data, IndexNow und öffentliche Dossier-/Community-Indexierung ist zusätzlich verbindlich zu prüfen:

- `seo/SEO_DISCOVERY_CONTRACT_2026-09-03.md`

Der SEO-/Discovery-Contract ist eine Arbeitsprojektion unterhalb von Foundation und Brand Narrative. Er darf keine höhere Produkt- oder Governance-Wahrheit überschreiben.

## Arbeitsbereiche

- `brand/` — aus dem Repository abgeleitete Marketing-Designsprache
- `white-label/` — Brandprofile, Co-Branding, Dateinamen und Exportregeln
- `campaigns/` — Kampagnenplan und kampagnenspezifische Briefings
- `sales/` — Zielgruppenbotschaften, Onepager- und Pitchdeck-Strukturen
- `social/` — Content-Serien, Social-Formate und Videosystem
- `voiceopengov/` — Membership- und Partnermarketing innerhalb der bestehenden Decision-Grenzen
- `seo/` — Free-first SEO, Search-/AI-Discovery, Internationalisierung, Knowledge/Research und indexierbare Public-Content-Architektur
- `templates/` — wiederverwendbare Briefings und Produktionsvorlagen
- `admin/` — Zielbild für Marketingsteuerung, BI und CRM-light
- `schemas/` — anbieterneutrale, maschinenlesbare Datenverträge
- `agent-playbooks/` — Regeln für Automations-, Produktions- und Assistenzsysteme

## Zentrale Verträge

- Marketing-Designsprache: `brand/edebatte-marketing-language.md`
- SEO & Discovery: `seo/SEO_DISCOVERY_CONTRACT_2026-09-03.md`
- Kampagnenportfolio: `campaigns/campaign-plan-2026.md`
- Admin-Steuerung: `admin/marketing-control-plane.md`
- White-Labeling: `white-label/brand-profile-contract.md`
- Maschinenlesbares Zielmodell: `schemas/marketing-control-plane.schema.json`
- Light- und Dark-Brandprofile: `white-label/profiles/*.brand-profile.json`

Die angelegten eDebatte-Brandprofile stehen im Status `review_ready`. Sie sind aus realen Repo-Tokens abgeleitet, gelten aber erst nach expliziter Marketing-/Brandfreigabe als produktionsfreigegeben.

## Qualitätsregeln

1. **Product truth first.** Jede Aussage muss auf einer realen Funktion, dokumentierten Entscheidung oder klar gekennzeichneten Vision beruhen.
2. **Content before activism.** eDebatte ordnet Inhalte, Quellen, Argumente, Entwicklungen und Beteiligung. VoiceOpenGov vertritt nur nachvollziehbar zustande gekommene Positionen.
3. **Eine Voxy.** Keine zweite Figur, KI, Runtime, Datenbasis oder Persönlichkeit für VoiceOpenGov oder White-Label-Kunden.
4. **Keine Fake-Signale.** Keine erfundenen Nutzerzahlen, Partner, Live-Daten, Stimmen, Quellen, Erfolge oder Testimonials.
5. **Review first.** Politische, gesellschaftliche und partnerbezogene Kommunikation wird vor Veröffentlichung geprüft.
6. **Mehrsprachigkeit mit Originalerhalt.** Originalsprache, Lesefassung, UI-Sprache und Ausgabesprache dürfen nicht vermischt werden.
7. **CI aus dem Repo.** Keine generische Sci-Fi-, Government-Tech-, Neon-HUD- oder Stock-KI-Bildwelt.
8. **Barrierearm und mobil.** Untertitel, Kontrast, verständliche Sprache, reduzierte Bewegung und mobile Lesbarkeit sind Standard.
9. **Anbieterneutral.** Toolnamen gehören weder in Dateinamen noch in sichtbare Copy, Metadaten oder dauerhafte Datenmodelle.
10. **Eine operative Wahrheit.** Admin Board, Markdown, Asset-Manifest und Telemetrie werden über IDs und Evidence verbunden, nicht als parallele Datenwelten geführt.
11. **Free-first Discovery.** SEO-/AEO-/GEO-Arbeit nutzt zuerst freie Standards, First-Party-Webmaster-Werkzeuge und eigene Inhalte. Bezahlte Ranking-/Backlink-/SEO-Abhängigkeiten brauchen eine separate dokumentierte Entscheidung.
12. **International quality before quantity.** Eine unterstützte UI-Sprache erzeugt nicht automatisch eine indexierbare SEO-Sprachkopie. Neue Sprach-URLs entstehen erst bei echtem hochwertigem Hauptinhalt und sauberem Canonical-/Hreflang-Contract.

## Freigabestufen

- `draft` — intern, nicht veröffentlichen
- `review_ready` — fachlich und visuell prüfbar
- `approved` — zur Produktion oder Ausspielung freigegeben
- `published` — veröffentlicht und mit realem Ziel verknüpft
- `retired` — nicht mehr verwenden

## Kampagnenablauf

```text
Produkt-/Governance-Wahrheit
→ MarketingOpportunity
→ Zielgruppe und Problem
→ beobachtbarer Nutzen
→ Kernbotschaft und CTA
→ MarketingCampaign
→ Onepager / Pitchdeck / Landingpage
→ Social- und Videoableitungen
→ Review und Freigabe
→ DistributionRecord
→ aggregierte KPI- und Lernnotiz
```

## Markdown und Admin Board

Markdown bleibt geeignet für:

- Positionierung und Guardrails,
- ausführliche Briefings,
- Copy-Bibliotheken,
- Entscheidungsbegründungen,
- wiederverwendbare Vorlagen,
- nachvollziehbare Historie.

Das Admin Board übernimmt später:

- Marketingchancen aus neuen Features und Themen,
- Lifecycle, Owner und Blocker,
- Asset- und Versionsstatus,
- Freigaben,
- Ausspielhistorie,
- BI-Auswertung,
- CRM-light für qualifizierte institutionelle Beziehungen.

Damit wird die Dokumentation nicht abgeschafft, sondern operativ nutzbar gemacht.

## Statusentscheidung

- Dokumentations-Foundation: `review`
- Marketing Control Plane: `needs_decision` / operativ `manual_gate`
- technisches Registry-Readmodel: `blocked` bis zum Decision-Contract

## Nicht-Ziele dieses Foundations-Slices

- keine Website-, Routing- oder Rollenimplementierung
- keine Änderung an Membership, Pricing oder Governance
- keine automatische Veröffentlichung
- keine neuen Brand-Assets oder Voxy-Varianten
- keine Produktionsbehauptung über noch nicht vorhandene Funktionen
- kein paralleles Voll-CRM
- keine personenbezogene Tracking- oder Profiling-Logik
