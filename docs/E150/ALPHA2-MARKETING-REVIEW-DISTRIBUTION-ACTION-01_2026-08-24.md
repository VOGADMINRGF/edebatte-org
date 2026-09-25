# ALPHA2-MARKETING-REVIEW-DISTRIBUTION-ACTION-01

Stand: 2026-08-24
Status: `implementation / in_progress`

## Ziel

Die bestehende Admin-Marketing-Inhaltsprüfung wird mit dem bereits in `main` vorhandenen Marketing→Social-Persistence-Pfad verbunden. Ein menschlich ausgelöster Review-Schritt darf einen `review_ready`-Inhalt in die bestehende Social-Distribution-Queue übergeben, ohne externe Veröffentlichung auszulösen.

## Umsetzung

- neue operator-only API-Route: `POST /api/admin/marketing/review/items/[contentId]/distribution`;
- Route nutzt `requireAdminOrResponse` inklusive Session-/2FA-Gate;
- `MarketingContentOperation` wird ausschließlich aus dem kanonischen Marketing-Bestand aufgelöst;
- Übergabe erfolgt über `persistMarketingSocialDistribution(...)` und damit über dieselbe `social_distribution_posts`-Runtime;
- Ergebnis startet weiterhin `needs_review`;
- `noAutoPublish=true` und `externalPosting=false` bleiben unverändert;
- `/admin/marketing/review` erhält eine explizite Aktion „Für Social-Distribution freigeben“;
- nicht vorhandene Connector-Ziele wie Facebook/TikTok/YouTube bleiben sichtbar als unsupported, statt einen Connector vorzutäuschen.

## Operator-Scope-Kompatibilität

Der bestehende Social-Distribution-v1-Contract verlangt noch ein nicht-leeres `organizationId`, während der globale Betreiber-Modus kanonisch `organizationId=null` führt. Bis die Social Runtime einen expliziten `platform_operator`-Owner-Scope besitzt, verwendet dieser Admin-Pfad den technischen Queue-Partition-Key `platform-marketing-global`.

Dieser Wert ist **keine** öffentliche Marke, **keine** juristische Organisationsidentität und **kein** Membership-Scope. Die API weist ihn ausdrücklich als `queueScope.kind=platform_operator` aus.

Follow-up: den Legacy-Social-Owner-Contract später um einen expliziten Owner-Scope erweitern, statt den technischen Partition-Key dauerhaft über `organizationId` zu tragen.

## Guardrails

- kein Auto-Publish;
- keine eigenmächtige externe Ausspielung;
- kein Bypass der Social-Review-/Scheduler-Gates;
- keine zweite Social Queue;
- keine Synthetic-Grassroots- oder sensible politische Microtargeting-Logik;
- Brand-/CTA-Sicherheitsprüfung bleibt im vorhandenen Marketing-Persistence-Pfad aktiv.

## Tests

- neue Route-Tests für erfolgreichen Operator-Handoff, Idempotenz, unbekannte Content-ID und Auth-Gate;
- bestehende Marketing-Review-Seitentests prüfen die sichtbare Distribution-Aktion und den Hinweis auf die separate Publishing-Freigabe;
- beide Tests laufen im bestehenden `test:web-pr-critical-guardrails`-Set.

## Operative Quelle

Issue #642 bleibt der ausführbare Tracking-Anker für den Marketing/Social-Executor. `docs/E150/OpenTasks.md` ist laut `AGENTS.md` die SSOT; der Connector liefert die Datei aktuell wegen ihrer Größe leer zurück, deshalb wird sie in diesem Slice nicht blind überschrieben. Die Synchronisierung muss über einen sicheren vollständigen File-Read oder einen repo-lokalen Codex-Lauf erfolgen.
