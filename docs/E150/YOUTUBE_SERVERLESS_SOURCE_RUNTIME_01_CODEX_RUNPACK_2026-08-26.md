# YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01 — Codex Run-Pack

Stand: 2026-08-26
Task: `YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01`
Issue: #644
Priorität: P0
Statusziel nach kanonischer Serialisierung: `codex_ready`

## Zweck

Dieser Slice etabliert die belastbare Media-Acquisition-Grenze für YouTube/Video vor Issue #629 Slice 4. Er baut keine zweite Create-, Research- oder Providerarchitektur und aktiviert keinen Provider, kein Secret, kein Production-Deployment und kein Publishing.

## Belegte Ausgangslage

Draft-PR #627 belegt für zwei öffentlich erreichbare, lokal transcript-fähige YouTube-Videos in Exact-Head-Vercel:

- `POST /youtubei/v1/player` beantwortet die Anfrage mit HTTP 200, aber `playabilityStatus.status=LOGIN_REQUIRED` und ohne Caption Tracks;
- der Watch-Page-Fallback liefert HTTP 200 mit reCAPTCHA statt nutzbarer Player-/Caption-Evidence;
- `transcriptStatus=runtime_incompatible`, `sourceLoaded=false`, `analysis.state=fetch_failed`;
- `providerAttempts=[]`; kein Modell wird aufgerufen;
- kein erfundener Transcript-/Media-Erfolg und kein Verbrauch von Analyse-/Research-Kontingent.

Die anonyme Web-/InnerTube-Kette ist damit kein belastbarer Serverless-Produktionsvertrag. Kein Proxy, Cookie, Consent-Bypass, Browser-Scraping oder Anti-Bot-Evasion ist zulässig.

## Governance- und Abhängigkeitsgrenzen

- `docs/E150/OpenTasks.md` bleibt operative SSOT.
- Vor Produktbranch: `node scripts/codex-task-preflight.mjs YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` auf sauberem aktuellen `main`.
- Nur bei exakt `status=codex_ready`, `executable=true`, `branchCreationAllowed=true` darf der Produktbranch entstehen.
- PR #588 bleibt reserviert/read-only. Die bereits kanonische Wahrheit `VOXY-200PCT-VISUAL-QA-CHECKPOINT-01 = review` darf nicht zurückgedreht werden.
- PR #627 bleibt Draft/unmerged, solange der Exact-Preview-YouTube-Pfad `sourceLoaded=false/fetch_failed` liefert.
- Issue #629 konsumiert später den hier entstehenden Media Source Artifact Contract; #629 darf die Acquisition-Grenze nicht duplizieren.
- Keine Gemini-/Google-/YouTube-Credentials aktivieren oder verändern.

## Erster erlaubter Implementierungsslice

Nur nach positivem taskbezogenem Preflight:

1. Typed `MediaSourceArtifact`-Vertrag ergänzen.
2. Failure Taxonomy ergänzen.
3. Credential-freie Fixtures und Contract-Tests ergänzen.
4. Bestehende #627-Source-/Security-/Support-/Quota-Verträge wiederverwenden.

Noch nicht enthalten:

- realer Provider-/Media-Adapter;
- Gemini-/YouTube-API-Aktivierung;
- OAuth-/Secret-Änderungen;
- Provider-Routing in `/create`;
- #629-Specialist-Composition;
- Production-Deployment.

## Typed Media Source Artifact

Der erste Slice soll mindestens folgende Felder definieren:

- `contractVersion`
- `sourceType`
- `originalUrl`
- `sourceId`
- `modality`
- `acquisitionMethod`
- `acquisitionState`
- `segmentEvidence[]`
- `timestampEvidence[]` soweit verfügbar
- `coverageReceipt`
- `extractionLimitations[]`
- `rightsReviewState`
- `consentRequirement`
- `regionAvailabilityState`
- `providerRequirement`
- `contentHash` beziehungsweise sichere Artifact-Hashes ohne Quellvolltext
- `safeFailureClass`

Quellvolltext, Transcript-Volltext, Prompts, Cookies, Tokens, Header, Secrets und PII dürfen nicht in Telemetrie oder Run-Metadaten gelangen.

## Failure Taxonomy

Mindestens getrennt:

- `source_unavailable`
- `no_transcript`
- `runtime_incompatible`
- `region_restricted`
- `rights_or_consent_required`
- `provider_not_configured`
- `provider_quota_exhausted`
- `provider_upstream_failure`
- `invalid_source_artifact`
- `unsupported_media`

Die bestehende sichtbare Produktdegradation darf diese sicheren technischen Klassen in `fetch_failed`/manual abbilden, ohne intern Ursachen zu vermischen.

## Fixtures

Credential-freie Fixtures müssen mindestens abdecken:

1. transcript-fähiges YouTube-Artifact mit Segment-/Timestamp-Evidence;
2. Video ohne Transcript;
3. Vercel-artiges `LOGIN_REQUIRED`/reCAPTCHA → `runtime_incompatible`;
4. region-/rights-gated Quelle;
5. schema-invalide beziehungsweise leere Segment-Evidence;
6. sichere Telemetrie ohne Transcript-/Prompt-/Secret-Inhalt.

Fixtures simulieren Provider-/Upstream-Antworten; sie dürfen keine realen Secrets oder fremde persistente Medienkopien enthalten.

## Akzeptanz erster Slice

- Typed Artifact und Failure Taxonomy sind zentral und wiederverwendbar.
- Keine zweite Media-/Create-SSOT entsteht.
- `runtime_incompatible` bleibt fail-closed und erzeugt keine erfundene Analyse.
- Segment-/Timestamp-Evidence ist erforderlich, bevor ein Media-Artifact als geladen gilt.
- Failure verbraucht kein Research-/Analyse-Kontingent.
- technische und redaktionelle Handoffs bleiben getrennt.
- Contract-/Fixture-Tests laufen ohne Credentials.
- Kein Provider, kein Secret, kein Deployment, kein Publish.

## Späteres Environment/Human Gate

Erst ein separater freigegebener Folge-Slice darf eine offizielle oder demonstrierbar vertraglich belastbare Media-Schnittstelle anbinden. Vor einer solchen Aktivierung sind Capability, Kosten, Consent, Copyright/Rechte, Datenschutz/Retention, Region-Verfügbarkeit, Abuse-Limits und echte Exact-Preview-Smokes zu prüfen.

Die Zielakzeptanz aus Issue #644 bleibt:

- mindestens zwei öffentliche YouTube-Videos liefern in Exact-Head-Preview einen grounded Source Artifact mit nichtleerer Segment-/Timestamp-Evidence, **oder** der Produktvertrag bleibt ausdrücklich manual-only;
- `/create` darf `sourceLoaded=true` und `analysis.state=result_ready` nur setzen, wenn Evidence tatsächlich geladen wurde.

## Verbindliche Preflight-Reihenfolge

1. `docs/foundation/*` gemäß `AGENTS.md` lesen.
2. `AGENTS.md` lesen.
3. kanonischen operativen Kopf von `docs/E150/OpenTasks.md` lesen.
4. `docs/E150/CODEX_RUN_PACK_CONTRACT.md` lesen.
5. `node scripts/codex-task-preflight.mjs YOUTUBE-SERVERLESS-SOURCE-RUNTIME-01` ausführen.
6. Nur bei positivem Ergebnis den ersten Produktbranch vom dann aktuellen `main` erstellen.
