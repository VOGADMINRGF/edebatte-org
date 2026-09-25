# ALPHA2-MARKETING-SOCIAL-EXECUTOR-01

Stand: 2026-08-24
Status: `implementation / stacked_review`

## Ziel

Die in PR #641 eingeführte Drei-Marken-Marketinglogik wird an die vorhandene Social-Distribution-Welt herangeführt, ohne eine zweite Social Queue oder einen Auto-Publish-Pfad zu erzeugen.

## Dieser Slice

- übersetzt bestehende `MarketingContentOperation`-Kanäle in bereits vorhandene `SocialDistributionChannel`-Ziele;
- hält eDebatte, VoiceOpenGov und Vote4Gov anhand des kanonischen Brandprofils getrennt;
- prüft, dass ein verifizierter CTA zur Domain der jeweiligen öffentlichen Marke gehört;
- kennzeichnet nicht vorhandene Legacy-Queue-Kanäle wie TikTok, Facebook und YouTube explizit als `unsupportedChannels`, statt einen Connector vorzutäuschen;
- erzeugt nur `distribution_prepare` und niemals externes Publishing;
- bleibt review-first, `autoPublishEligible=false`;
- verbietet Synthetic Support und sensibles politisches Microtargeting im Contract.

## Vorhandene Queue-Wiederverwendung

Aktuell unterstützt die bestehende Social Queue u. a.:

- `instagram_asset`
- `linkedin_draft`
- `newsletter_draft`
- `press_note`

Die Marketing-Bridge mappt dorthin, ohne neue Queue-Wahrheit.

## Bewusste Grenze dieses Slices

Noch **kein persistenter Write** in `social_distribution_posts`, weil deren kanonischer `sourceContextType` bislang auf Dossier/Topic/Round/Claim begrenzt ist. Ein MarketingCampaign-Objekt darf nicht verdeckt als Dossier oder Topic ausgegeben werden.

Der nächste Sub-Slice erweitert daher die bestehende Social-Distribution-Source-Contract sauber um einen Marketing-Kontext und reicht erst dann `distribution_prepare` an `createOrReplaceDraft` weiter.

## Tests

`marketing-social-distribution-preparation.contract.test.ts` prüft:

- eDebatte Brand/CTA/Channel-Mapping;
- explizite Kennzeichnung nicht unterstützter Kanäle;
- Domain-Mismatch blockiert fail-closed;
- Draft-Content wird nicht zur Distribution vorbereitet;
- kein Auto-Publish und keine externe Veröffentlichung.

Der Test ist in `test:web-pr-critical-guardrails` aufgenommen.

## Abhängigkeiten

- PR #641 Multi-Brand Marketing Control Plane
- Issue #642 Marketing/Social Executor
- bestehende V1/V2 Social Distribution Queue + review-first Scheduler
