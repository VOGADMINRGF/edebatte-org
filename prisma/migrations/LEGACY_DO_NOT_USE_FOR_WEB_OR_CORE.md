# Legacy Prisma migration history

`prisma/migrations/` is retained only as historical/forensic migration evidence.

It is **not** the canonical deploy history for either:

- `prisma/web/schema.prisma`, or
- `prisma/core/schema.prisma`.

Do not run these legacy migrations against current Web/Core Preview, Staging, or Production databases.

Reason: this history predates the current split schemas and includes destructive statements that are not a safe baseline for the present database contracts.

Canonical locations going forward:

- `prisma/web/migrations/`
- `prisma/core/migrations/`

Any existing database must first undergo schema-only inventory and drift comparison before a new baseline can be marked as applied.

See `docs/E150/DB_MIGRATION_BASELINE_01_2026-09-06.md` and issue #728.
