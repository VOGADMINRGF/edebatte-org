# DB-MIGRATION-BASELINE-01

Status: Fresh-DB-Baselines reproduzierbar verifiziert / Brownfield offen
Issue: #728
Branch: `chore/db-migration-baseline-01`

## Ziel

Die bereits vorhandene Trennung von `prisma/web/schema.prisma` und `prisma/core/schema.prisma` wird zu zwei kanonischen, reproduzierbaren Prisma-Migration-Historien vervollständigt.

Künftig gilt:

```text
prisma/web/schema.prisma
prisma/web/migrations/...

prisma/core/schema.prisma
prisma/core/migrations/...

prisma/migrations/ = Legacy-Historie, nicht als Web-/Core-Deploy-Quelle verwenden
```

## Ist-Zustand

- Web nutzt PostgreSQL über `WEB_DATABASE_URL`.
- Core nutzt PostgreSQL über `CORE_DATABASE_URL`.
- Root-Scripts besitzen getrennte `prisma:migrate:web` und `prisma:migrate:core` Aufrufe.
- Unter `prisma/web/` und `prisma/core/` existiert nun jeweils eine getrennte, aus dem aktuellen Schema generierte Baseline.
- Die historische Root-Historie unter `prisma/migrations/` enthält alte, teils destruktive Migrationen und darf nicht blind auf heutige Web-/Core-Datenbanken angewendet werden.

## Unverhandelbare Regeln

1. Kein `prisma db push` gegen Preview, Staging oder Production.
2. Kein automatisches Production-`prisma migrate deploy` im normalen Vercel-Build.
3. Keine Root-Legacy-Migration unter `prisma/migrations/` auf Web/Core ausführen.
4. Keine Production-DB-Mutation im Baseline-Intake.
5. Keine `migrate resolve --applied`-Markierung ohne vorherigen Schema-/Drift-Nachweis.
6. Keine destruktiven Statements ohne Backup-, Rollback- und Human-Gate.
7. Keine Secrets/Connection-Strings oder Dateninhalte in Git, PR, Logs oder Evidence.
8. `docs/E150/OpenTasks.md` bleibt Single-Writer-SSOT gemäß #447.

## Baseline-Verfahren

Die Baseline wird aus dem aktuellen Schema mit der im Repository gepinnten Prisma-Version erzeugt, nicht manuell geschrieben.

Web:

```bash
pnpm exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/web/schema.prisma \
  --script \
  | sed '${/^$/d;}' \
  > prisma/web/migrations/20260906_web_baseline/migration.sql
```

Core:

```bash
pnpm exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/core/schema.prisma \
  --script \
  | sed '${/^$/d;}' \
  > prisma/core/migrations/20260906_core_baseline/migration.sql
```

Die resultierenden SQL-Dateien werden unter den jeweiligen `migrations/<baseline>/migration.sql` abgelegt und vor Commit auf unerwartete destruktive Statements geprüft.

## Reproduzierbare Baseline-Evidence — 2026-09-06

Werkzeugstand:

- Node.js: `v20.20.2`
- Prisma CLI: `6.16.3`
- Prisma Client: `6.16.3`
- lokaler Testserver: PostgreSQL 16 in Docker

Artefakte:

- Web: `prisma/web/migrations/20260906_web_baseline/migration.sql`
- Core: `prisma/core/migrations/20260906_core_baseline/migration.sql`
- beide Migration-Historien besitzen eine eigene `migration_lock.toml` mit `provider = "postgresql"`

Gemessene SQL-Struktur:

| Domäne | `CREATE TYPE` | `CREATE TABLE` | `CREATE INDEX` inkl. Unique | Foreign Keys | `DROP`/`TRUNCATE` |
| --- | ---: | ---: | ---: | ---: | ---: |
| Web | 8 | 9 | 24 | 9 | 0 |
| Core | 12 | 18 | 39 | 20 | 0 |

Der maschinelle Vergleich der Prisma-Modelle mit den erzeugten `CREATE TABLE`-Statements war für beide Schemas ohne Abweichung. Die alte Root-Migration `20250903104032_init_topics_statements` wird in keiner der beiden kanonischen Historien referenziert.

Fresh-DB-Testmethodik:

1. ausschließlich die neuen lokalen Wegwerf-Datenbanken `edebatte_web_baseline_test` und `edebatte_core_baseline_test` auf PostgreSQL 16 anlegen;
2. `prisma migrate deploy` pro Schema mit der jeweils zugehörigen Datenbank ausführen;
3. die tatsächlich angewendete Migration aus `_prisma_migrations` prüfen;
4. vollständigen Prisma-Diff von der Schema-Datasource zum jeweiligen Datamodel mit `--script` ausführen;
5. `prisma migrate status` prüfen;
6. `prisma migrate deploy` ein zweites Mal ausführen und auf `No pending migrations to apply.` prüfen.

Ergebnis:

| Gate | Web | Core |
| --- | --- | --- |
| Fresh-DB `migrate deploy` | PASS | PASS |
| angewendete Migration | `20260906_web_baseline` | `20260906_core_baseline` |
| DB ↔ Schema zero drift | PASS — leere Migration | PASS — leere Migration |
| `migrate status` synchron | PASS | PASS |
| zweiter Deploy idempotent | PASS | PASS |

Nicht Bestandteil dieses Nachweises:

- keine Preview-, Staging- oder Production-Datenbank geöffnet oder verändert;
- kein `prisma db push`;
- kein `prisma migrate resolve`;
- keine Migration aus `prisma/migrations/` ausgeführt;
- keine Brownfield-Adoption oder Backup-Aussage.

## Fresh-DB-Gate

Für Web und Core separat:

1. leere PostgreSQL-Testdatenbank;
2. `prisma migrate deploy --schema=<schema>`;
3. `prisma migrate status`;
4. Schema-vs-DB-Diff muss null sein;
5. keine Seed-Annahme für Schema-Reproduzierbarkeit.

Eine Baseline gilt erst dann als technisch belastbar.

## Brownfield-Adoption

Bestehende Preview-/Production-Datenbanken werden nicht neu initialisiert.

Reihenfolge:

1. Backup/Snapshot bzw. belegter Restore-Pfad;
2. schema-only Inventory;
3. Diff: reale DB ↔ kanonisches Schema;
4. nur bei belegter Übereinstimmung darf die Baseline mit `prisma migrate resolve --applied <baseline>` als bereits vorhanden markiert werden;
5. bei Drift wird eine additive Reconciliation-Migration erstellt;
6. danach Status- und Health-Smoke.

`resolve` ist kein Werkzeug zum Verbergen von Drift.

## Deployment-Modell

Produktionsmigrationen werden als eigener kontrollierter Operator-/GitHub-Workflow ausgeführt:

```text
Exact Commit
→ Migration Status
→ Backup/Restore Gate
→ Human Approval
→ migrate deploy
→ Drift/Healthcheck
→ Application Deploy / Smoke
```

Kein paralleler Migration Runner und kein verstecktes DB-Migrate im Vercel-Build.

## Expand → Migrate → Contract

Nach realen Nutzerdaten:

- Expand: additive/nullable Änderung zuerst.
- Migrate: Backfill bzw. Datenüberführung separat und idempotent.
- Contract: alte Felder/Tabellen erst in späterem Release entfernen.

Destruktive Änderungen benötigen eigenes Gate.

## Seed-Policy

`prisma/seed.cjs` wird separat auditiert. Production-Seeding läuft niemals automatisch beim Deployment. Dev-Fixtures und produktive System-/Data-Migrations werden getrennt geführt.

## Nächste technische Schritte

1. Preview-DB schema-only inventarisieren, sobald dafür ein eigener autorisierter und credential-gated Lauf vorliegt.
2. Drift gegen das passende kanonische Schema bewerten.
3. Erst danach Brownfield-Adoption bzw. additive Reconciliation planen.
4. Production bleibt bis Human-Gate unangetastet.

## Definition of Done

- getrennte Web-/Core-Migration-Historien;
- Fresh DB reproduzierbar;
- zero drift nach Deploy;
- Legacy-Historie klar ausgeschlossen;
- Preview Brownfield-Adoption ohne Datenverlust belegt;
- Production-Migrate kontrolliert und separat vom Vercel-Build;
- kein produktives `db push`;
- Seed-Policy sauber getrennt;
- Human Review vor Production-Mutation.
