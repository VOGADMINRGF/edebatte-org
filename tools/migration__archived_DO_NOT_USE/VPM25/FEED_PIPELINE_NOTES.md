# Feed Pipeline Notes

## Overview

```
Feed → statement_candidates → analyze_results → vote_drafts → feed_statements
```

1. `/api/feeds/batch` nimmt Roh‑Feeds entgegen und legt `statement_candidates` an.
2. `/api/feeds/analyze-pending` zieht pending Kandidaten, ruft den E150‑Analyzer und speichert Ergebnisse in `analyze_results` + `vote_drafts`.
3. Admins prüfen die Drafts unter `/admin/feeds/drafts`, setzen sie auf `review` und veröffentlichen sie.
4. `/api/admin/feeds/drafts/[id]/publish` erzeugt einen Datensatz in `feed_statements`, der später in die Voting‑Logik übernommen wird.

## Scheduler / Cron

- **Analyse anstoßen:** alle 15–30 Minuten `POST /api/feeds/analyze-pending` aufrufen.
  - Body z. B. `{ "limit": 10 }`.
  - Standard-Limit ist 10; >50 wird serverseitig abgewiesen.
  - Route ist `runtime = "nodejs"` und kann ohne Auth verwendet werden (nur intern callen).
- **Feeddaten einspielen:** `/api/feeds/batch` kann von jedem Worker aufgerufen werden, sobald neue Artikel/Kanäle geparst wurden.

### Beispiel (Curl)

```bash
curl -X POST https://edebatte.example/api/feeds/analyze-pending \
  -H 'content-type: application/json' \
  -d '{ "limit": 10 }'
```

## Telemetrie-Pipelines

| Schritt                           | Pipeline-Name                  |
|----------------------------------|--------------------------------|
| Contribution Analyze             | `contribution_analyze`         |
| Feed → Statement Candidate       | `feeds_to_statementCandidate`  |
| GPT-Übersetzungen von Content    | `content_translate`            |
| Draft Publish (optional future)  | `feeds_draft_publish`          |

Alle KI-Aufrufe loggen über `logAiUsage`. Publish selbst nutzt aktuell keine KI, wird aber mit dem Pipeline-Label versehen, sobald zusätzliche Modelle notwendig werden.

## Region Keys

- `statement_candidates.regionCode` entspricht den Codes aus `core/regions/types.ts`.
- Admin-UI nutzt `region_translations`, um menschenlesbare Labels anzuzeigen.
- Feeds ohne Region sollten `regionCode = null` oder `""` setzen → werden als „Global“ markiert.

## Migration / Backfill

Script: `tools/migration/VPM25/feeds_backfill_candidates.ts`

1. `pnpm tsx tools/migration/VPM25/feeds_backfill_candidates.ts`
2. Setzt fehlende Felder (`analyzeStatus`, `analyzeRequestedAt` usw.) auf Defaults.
3. Alte Kandidaten werden wieder auf `pending` gesetzt und laufen automatisch durch `/api/feeds/analyze-pending`.

Bitte vorher ein Backup fahren (`mongoexport`), falls produktive Daten betroffen sind.

### Automatisierter RSS-Import (Beispiel)

Unter `tools/feeds/import_rss.ts` liegt ein kleiner Fetcher, der ausgewählte RSS/Atom-Feeds lädt, in `FeedItemInput` mappt und an `/api/feeds/batch` sendet:

```bash
# .env.local (Beispiel)
export FEEDS_API_URL="https://app.edebatte.org/api/feeds/batch"
export FEEDS_API_TOKEN="<optional bearer token>"

# ad-hoc Lauf lokal
cd tools/feeds
FEEDS_API_URL="http://localhost:3000/api/feeds/batch" ts-node import_rss.ts feeds.json
```

`feeds.json` kann so aussehen:

```json
{
  "feeds": [
    {
      "name": "Tagesschau",
      "url": "https://www.tagesschau.de/xml/rss2",
      "locale": "de",
      "regionCode": "DE"
    },
    {
      "name": "Reuters EU",
      "url": "https://www.reuters.com/rssFeed/worldNews",
      "locale": "en",
      "regionCode": "EU"
    }
  ]
}
```

**Cron / GitHub Action**

```yaml
name: Import Feeds
on:
  schedule:
    - cron: "*/30 * * * *"  # alle 30 Minuten
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install --filter tools/feeds...
      - run: |
          cd tools/feeds
          FEEDS_API_URL="${{ secrets.FEEDS_API_URL }}" \
          FEEDS_API_TOKEN="${{ secrets.FEEDS_API_TOKEN }}" \
          pnpm ts-node import_rss.ts feeds.json
```

Alternativ lässt sich das Script auch über Vercel Cron oder einen kleinen Worker triggern – wichtig ist nur, dass `FEEDS_API_URL` auf die produktive `/api/feeds/batch`-Route zeigt.

**Hinweis Plan B:** RSS-Feeds liefern nur Metadaten + Kurztexte (max. ca. 800 Zeichen) und werden ausschließlich als Evidence-Quellen gespeichert. Volltexte landen nie in triMongo; öffentliche UIs zeigen nur Publisher, Titel, Kurzinfo und verlinken auf die Originalseite.
