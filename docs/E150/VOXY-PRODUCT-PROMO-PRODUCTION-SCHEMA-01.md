# VOXY-PRODUCT-PROMO-PRODUCTION-SCHEMA-01

Stand: 2026-08-30

## Zweck

Produktwerbung wird als eigener Voxy-Produktionsmodus modelliert. Der Modus übernimmt den akzeptierten Voxy-/D1-/Layout-Canon, ist aber nicht source-led wie ein NEWS-5-/Evidence-Film.

Verbindliche Grammatik:

```text
PRODUCT_SURFACE → INTERACTION → VALUE → SYNTHESIS → CTA
```

Quellen und Claims bleiben als Prüfschicht erhalten, damit keine geplante Funktion als bereits vorhanden beworben wird. Sie sind jedoch nicht automatisch sichtbare Hauptobjekte des Films.

## Kanonische Layouts

Die bestehenden Layoutprofile werden wiederverwendet:

- `landscape_16_9`
- `square_1_1`
- `feed_4_5`
- `vertical_9_16`

TikTok / Reels / Shorts verwenden `vertical_9_16` mit 1080×1920 und den bestehenden konservativen Safe Areas.

## Asset-Intake

Roh-Screenshots werden nicht in Git eingecheckt. Der Standardroot liegt außerhalb des Repositories und wird über eine Umgebungsvariable gesetzt:

```bash
export VOXY_PRODUCTION_ASSET_ROOT="$HOME/VoxyProductions"
```

Für die erste Produktion ist die Struktur:

```text
$VOXY_PRODUCTION_ASSET_ROOT/
└── edebatte-democracy-update-01/
    └── assets/
        ├── 01-product-home.png
        ├── 02-participation-entry.png
        └── 03-demo-ballot.png
```

Die Dateinamen sind nur die physische Ablage. Im Produktionsvertrag werden die Assets semantisch adressiert:

- `product-home`
- `product-participation-entry`
- `product-demo-ballot`

Spätere Produktionen dürfen alternativ `live_route_capture` verwenden. Das ist für stabile öffentliche Produktoberflächen zu bevorzugen, weil der Renderer den Stand reproduzierbar selbst erfassen kann. Private lokale Dateien bleiben sinnvoll für noch nicht öffentlich erreichbare UI-Zustände oder bewusst ausgewählte Review-Screens.

## Claim-Gate

Jede werbliche Aussage ist genau einer Klasse zugeordnet:

- `current_capability` — darf als vorhandene Produktfunktion beworben werden;
- `editorial_principle` — darf als Produkt-/Demokratieprinzip formuliert werden;
- `future_intent` — darf nicht als bereits vorhandene Funktion beworben werden.

Der Produktfilm darf deshalb emotionaler und CTA-orientierter sein als ein Evidence-Film, ohne den Current-Offer-Schutz aufzugeben.

## Erste Produktion

ID:

```text
edebatte-democracy-update-01
```

Ziel:

- TikTok / Reels / Shorts
- 9:16
- D1 als einzige Stimme
- reale eDebatte-Produktoberflächen als visuelle Hauptobjekte
- keine Nachrichten-/Quellenästhetik als Primärdramaturgie
- kein Auto-Publish

## Benutzer-Workflow

Für eine neue Produktion sollen zukünftig nur noch diese Schritte nötig sein:

1. Produktionsidee und Text festlegen.
2. Benötigte Produktoberflächen entweder als Route oder als Asset-Slot definieren.
3. Private Assets in den standardisierten Production Asset Root legen.
4. Generischen Renderer mit `--production=<id>` und optional `--layout-profile=<id>` ausführen.
5. Preview/Contact Sheet und Manifest menschlich prüfen.
6. Erst nach Review veröffentlichen.

Zielkommando nach Implementierung des generischen Renderers:

```bash
pnpm -w exec tsx apps/web/scripts/render-voxy-product-promo.ts \
  --production=edebatte-democracy-update-01
```

Der Renderer darf keine produktspezifischen `--screen-1`-/`--screen-2`-/`--screen-3`-Argumente verlangen. Die Zuordnung muss vollständig aus der Produktionsdefinition und dem Asset-Root hervorgehen.

## Render-Paket

Jeder Lauf soll mindestens erzeugen:

- MP4
- Preview
- Contact Sheet
- VTT/SRT
- `manifest.json`
- `source-manifest.json`
- `asset-manifest.json` mit SHA-256 der tatsächlich verwendeten Assets
- Motion-/Beat-Timeline
- Human-Review-Status

`productionEligible = false` und `autoPublish = false` bleiben bis zur expliziten menschlichen Freigabe bestehen.
