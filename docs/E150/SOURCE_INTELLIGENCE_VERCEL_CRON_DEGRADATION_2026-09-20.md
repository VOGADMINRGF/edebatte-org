# Source Intelligence — Vercel Cron Production Degradation

Date: 2026-09-20

## Incident truth

The last confirmed successful Vercel production deployment is `main@cb6343d4bd3494bf8a94f5278dc0fd02ca917ef2` (PR #930).

PR #929 subsequently added the Source Intelligence scheduler and the following Vercel cron entry:

```json
{ "path": "/api/cron/source-intelligence", "schedule": "17 * * * *" }
```

Starting with the #929 merge commit `33b6f63820d85c5fadc57b03607fec89cff9f95d`, GitHub receives an immediate Vercel `Deployment failed` status while the repository Web CI build, lint, typecheck and security gates remain green. Later `main` commits reproduce the same deployment failure and no corresponding new deployment object is visible through the connected Vercel project API.

The exact Vercel account/plan rejection reason is not exposed by the available connected API surface. Therefore this repair does not claim a verified billing-plan cause. It uses the narrowest reversible compatibility change supported by current Vercel cron documentation: one daily Source Intelligence invocation.

## Bounded production repair

`/api/cron/source-intelligence` is scheduled at `03:17 UTC` once per day:

```json
{ "path": "/api/cron/source-intelligence", "schedule": "17 3 * * *" }
```

This changes only platform invocation frequency. It does **not** change:

- the canonical Open Data source registry;
- per-source `intervalMinutes` metadata;
- due/backoff calculation;
- source snapshot/evidence identity;
- provider retry/backoff authority;
- sequential provider execution;
- the `CRON_SECRET` authentication boundary;
- review-first/no-auto-publish behavior.

The internal scheduler continues to decide whether a source is due when an invocation occurs.

## Explicit limitation

The original #929 operational target was an hourly platform wake-up. This compatibility repair intentionally degrades maximum wake-up frequency to daily in order to restore deployability. Hourly invocation must not be silently reintroduced until the active Vercel project is verified to accept that cron frequency, or an already-authorized plan-independent scheduler surface exists.

## Acceptance

The repair is complete only when:

1. the focused Source Intelligence cron contract passes;
2. full exact-head Web CI passes;
3. the PR/merge commit receives a successful Vercel deployment status;
4. no source/evidence truth or publication semantics changed.

Until item 3 is proven, this remains a production P1 investigation rather than a closed incident.
