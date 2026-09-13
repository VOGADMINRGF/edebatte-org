# Web Prisma migrations

This directory is the canonical migration history for `prisma/web/schema.prisma`.

Rules:

- Generate migrations only against `prisma/web/schema.prisma`.
- Do not use `prisma/migrations/` as a deploy source for Web.
- Do not run `prisma db push` against Preview, Staging, or Production.
- Baseline SQL must be generated with the repository-pinned Prisma version and verified on a fresh PostgreSQL database before adoption.
- Existing databases are Brownfield: compare schema drift first; only then mark a verified baseline as applied.
- Production migration execution remains a separate human-gated operator workflow, not part of the normal Vercel build.

See `docs/E150/DB_MIGRATION_BASELINE_01_2026-09-06.md` and issue #728.
