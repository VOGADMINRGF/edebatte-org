# ALPHA2-MARKETING-SOCIAL-EXECUTOR-02

Stand: 2026-08-24
Status: `done / merged`

## Ziel

Marketing-Content aus eDebatte, VoiceOpenGov und Vote4Gov soll über die bestehende Social-Distribution-Runtime persistent in denselben review-first Queue-Pfad übergeben werden können. Keine zweite Queue, kein Auto-Publish.

## Umgesetzt

1. Multibrand-Basis aus PR #641 ist in `main` gemergt.
2. Bestehender Social-Source-Contract kennt einen ehrlichen `marketing_campaign`-Kontext.
3. Brand-/CTA-sichere `distribution_prepare`-Records werden über `createOrReplaceDraft` persistiert.
4. Review, Scheduler und Audit der bestehenden Runtime werden wiederverwendet.
5. PR #643 ist in `main` gemergt; Merge-Commit `fd6bbe7757e39e70e50056d7e7a3082dbf0caa4f`.

## Guardrails

- Marketingkampagnen werden nicht als Dossier, Topic, Round oder Claim ausgegeben.
- VoiceOpenGov und Vote4Gov dürfen nicht auf eDebatte-Branding zurückfallen.
- externe Veröffentlichung bleibt approval-pflichtig;
- keine Synthetic-Support-/Astroturfing-Logik;
- kein sensibles politisches Microtargeting;
- TikTok/Facebook/YouTube bleiben bis zu echten Connector-Contracts explizit unsupported.

## Nächster Slice

`ALPHA2-MARKETING-REVIEW-DISTRIBUTION-ACTION-01` verbindet die Admin-Inhaltsprüfung mit diesem bereits gemergten Persistence-Pfad. Die Social-Queue bleibt auch nach der Marketing-Freigabe review-first und ohne Auto-Publish.
