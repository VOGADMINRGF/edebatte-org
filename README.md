# VoiceOpenGov / eDbtt – Monorepo

eDbtt bündelt die VoiceOpenGov-Apps (Next.js 15 App Router), die Domain-Logik und die KI-Orchestrierung für den E150-Standard. Ziel ist eine transparente Plattform für demokratische Beteiligung mit klarer Trennung von Kern-, Votes- und PII-Daten.

## Architektur-Überblick

- **apps/web** – Next.js 15 Frontend (App Router) inkl. Admin-Tools.
- **core** – Domain-Logik (Tri-Mongo, Identity/Verification, Telemetrie, Orchestrator).
- **features** – Wiederverwendbare UI- und Domain-Module.
- **packages/tri-mongo** – DB-Abstraktion für `core`, `votes`, `pii`, `ai_reader`.
- **packages/ui** u. a. – gemeinsame UI-Bausteine.

## Tech-Stack

- Node.js 20, pnpm 10.x
- Next.js 15 (App Router)
- MongoDB (Tri-Mongo), Redis; optional Neo4j / Graph-Komponenten
- KI-Orchestrierung mit mehreren Providern (OpenAI, Anthropic, Gemini, Mistral, You.com)

## Getting Started

1) Abhängigkeiten installieren

```bash
pnpm install --frozen-lockfile
```

2) ENV vorbereiten (siehe `apps/web/.env.example` als Referenz)

```bash
cp apps/web/.env.example apps/web/.env.local
# Werte anpassen (keine Secrets ins Repo committen)
```

3) Dev-Server starten

```bash
pnpm -C apps/web dev
```

## Qualität & Builds

- `pnpm -C apps/web exec tsc --noEmit` – TypeScript-Check für die Web-App
- `pnpm -C apps/web run lint` – ESLint
- `pnpm -C apps/web run build` – Next.js Production-Build

## CI-Überblick (`.github/workflows/e150-ci.yml`)

- Läuft auf Ubuntu mit Node 20 + pnpm 10.17
- Services: MongoDB, Redis, Neo4j
- Schritte: Install, Typecheck, Lint, optionale Tests (`test:ci`), Web-Build, Semgrep, Gitleaks, Docker Build + Trivy, ZAP-Baseline-Scan

## Orphan-Scanner (VPM25)

Markdown-Report per Script:

```bash
pnpm exec tsx scripts/orphan_features_scan.ts
```

Die Ergebnisse können in `docs/ORPHAN_FEATURES_VPM25.md` eingetragen werden.

## Admin-Dashboards

- Identity-Funnel: `/admin/telemetry/identity` – zeigt pro Zeitraum Event-Zählungen vom Register bis „strong completed“.
- AI-Usage: `/admin/telemetry/ai/usage` – Tokens, Kosten, Calls und Fehler pro Provider/Pipeline.
- Orchestrator-Smoke: `/admin/telemetry/ai/orchestrator` – einfacher Smoketest für die AI-Pipelines.

Alle Admin-APIs prüfen die Rolle via `u_role`-Cookie; Endpunkte liegen unter `apps/web/src/app/api/admin/**`. Die Dashboards sind nur für Staff/Admin gedacht und greifen ausschließlich auf Telemetrie-Aggregate zu, nicht auf PII.

## Datenschutz & PII

Die Trennung von PII und Nicht-PII ist in `docs/PII_ZONES_E150.md` dokumentiert. PII darf nur über die ausgewiesenen Core-Helper (`core/db/pii/**`) angesprochen werden.
