# QR-PUBLIC-ENTRY-02

Datum: 2026-07-25
OpenTasks-Status: done
PR-Phase: Merged
Evidence: PR #425

## Ziel

`/qr-studio` als einen kanonischen QR-Einstieg verankern, Legacy-QR-Routen kontrolliert weiterleiten und unsichere Ziel-Redirects fail-closed blockieren.

## Umgesetzt

- `features/qr/qrStudioTargetContract.ts` definiert jetzt den kleinen gemeinsamen Target- und Caller-Contract.
- Erlaubt bleiben:
  - interne Pfade wie `/dossier/...`, `/topic/...`, `/anlassraum?...`
  - freigegebene HTTPS-Ziele auf der bekannten eDebatte-Domain
- Blockiert werden:
  - `javascript:`
  - `data:`
  - Netzwerkpfade wie `//example.com`
  - fremde Hosts
  - URLs mit Credentials
- Legacy-Routen `/qrcodegenerator` und `/qrcodewizard` redirecten serverseitig auf `/qr-studio`.
- Content-Release- und Public-Topic-QR-Hrefs zeigen nicht mehr auf `/qrcodegenerator?target=...`, sondern auf den kanonischen `/qr-studio`-Pfad mit Caller-Kontext.
- `/qr-studio` rendert jetzt für solche Ziele eine eigene kanonische Public-QR-Karte mit:
  - Caller-Hinweis
  - Zieltyp (`interner Pfad` oder `freigegebenes HTTPS-Ziel`)
  - QR-Vorschau
  - fail-closed Warnzustand bei blockierten Legacy-Zielen

## Caller-Inventar

- `content_release_workbench`
- `public_topic_page`
- `organization_dashboard`
- `legacy_qrcodegenerator`
- `legacy_qrcodewizard`
- `qr_studio`

## Guardrails

- kein Open Redirect
- kein zweiter QR-Kanon neben `/qr-studio`
- keine automatische Freigabe, Veröffentlichung oder Mutation
- Print-/Share-/Review-Hrefs bleiben auf bestehende Public-Ziele beschränkt

## Tests

- `pnpm -C apps/web exec tsc --noEmit -p tsconfig.json --pretty false`
- `pnpm -C apps/web exec vitest run tests/qr-studio-target.contract.test.ts tests/legacy-qr-routes.redirect.test.ts tests/live-qr-entry.contract.test.tsx tests/qr-event-entry-mobile.contract.test.tsx tests/content-release-workbench.test.ts tests/topic-public-page.contract.test.tsx`
