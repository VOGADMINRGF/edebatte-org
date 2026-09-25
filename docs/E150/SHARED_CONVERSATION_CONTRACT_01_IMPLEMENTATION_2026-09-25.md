# SHARED-CONVERSATION-CONTRACT-01 — Implementation Evidence

Stand: 2026-09-25
Status: implementation / review-first
Task: `SHARED-CONVERSATION-CONTRACT-01`
Parent: Issue #604
Run-Pack: `docs/E150/SHARED_CONVERSATION_CONTRACT_01_CODEX_RUNPACK_2026-08-08.md`

## Scope

Dieser Slice implementiert ausschließlich den produktneutralen typed Conversation-/Message-Vertrag und seine deterministische serverseitige Capability-Matrix. Er aktiviert keine Conversation-Runtime, keine neue Persistenz, keine Route, keine UI, keinen Provider und keine VoiceOpenGov-spezifische Parallelwelt.

Kanonischer Domain-Owner dieses Slices:

- `features/conversation/sharedConversationContract.ts`

Fokussierte Contract-Evidence:

- `apps/web/tests/shared-conversation-contract.contract.test.ts`
- eigener Web-CI-Schritt `Focused shared conversation contract`

## Wiederverwendungsgrenze

Bestehende Runtime-Wahrheit bleibt unverändert:

- Direct-Messaging-Eligibility bleibt im bestehenden Social-/Relationship-Pfad;
- `social_messages` bleibt bestehende Direct-Message-Persistenz;
- Topic-/Region-/Dossier-Kontext bleibt in bestehenden Community-/Domain-Ownern;
- Unified Review bleibt die Review-Wahrheit.

Der neue Contract konsumiert nur serverseitig abgeleitete Capability-Fakten. Er erzeugt weder eine zweite Message-Collection noch eine zweite Review-Queue.

## Contract

### Conversation

Der Vertrag führt ein:

- stabile `conversationId`;
- `scope`: `direct | group | topic | regional | project`;
- kanonische Origin-Referenz statt kopierter Domainobjekte;
- explizite Participant-/Visibility-/Retention-/Moderation-/Handoff-Policies;
- Lifecycle `active | read_only | archived | closed`;
- `representativenessStatus`, `truthStatus` und `publishStatus` ausschließlich als `not_asserted`.

Scope und Origin-Kind sind fest gekoppelt. Eine Direct-ID kann nicht als Group-/Region-Origin umgedeutet werden.

### Message

Der Vertrag führt ein:

- stabile `messageId` und `conversationId`;
- serverseitige Author-/Actor-Referenz;
- serverseitigen ISO-Zeitpunkt;
- Lifecycle `active | edited | deleted`;
- keine Authority-, Public-, Claim- oder Publish-Promotion.

### Capability Matrix

Deterministisch abgeleitet werden:

- `canRead`;
- `canPost`;
- `canReply`;
- `canEditOwn`;
- `canDeleteOwn`;
- `canModerate`;
- `canInvite`;
- `canRequestHandoff`.

Ein Handoff kann ausschließlich `review_candidate_only` sein. `canAutoHandoff`, `canPublish`, `canProjectPublic` und `canPromoteClaim` sind unveränderlich `false`.

Clientseitig behauptete Rollen oder Publisher-/Moderatorrechte sind keine Eingabe des Vertrags und verändern keine Capability.

## Fail-closed Gegenproben

Die fokussierte Suite deckt mindestens ab:

- alle fünf Scopes mit korrekter Origin-Referenz;
- bestätigte Direct-Conversation;
- Group-Moderator/Invite ausschließlich aus serverseitiger Policy;
- `read_only` bleibt lesbar und nicht schreibbar;
- `archived` bleibt von `read_only` und `closed` getrennt;
- fremde, ausgetretene, entfernte und blockierte Actors;
- clientseitig behauptete Autorität ohne Wirkung;
- Origin-Mismatch;
- fehlende Participant-Policy;
- bestehende Direct-Messaging-Eligibility als zusätzliche Write-Grenze;
- Message→Conversation-Mismatch;
- keine automatische Public-/Claim-/Publish-Promotion;
- geschlossene Conversation erzeugt keinen Handoff-/Publish-/Claim-Erfolg.

## Harte Grenzen

- keine zweite Chat-Datenwelt;
- keine Runtime-/DB-/Schema-/Migration-/API-/UI-Änderung;
- kein Auto-Handoff;
- kein Auto-Publish;
- keine automatische Public-Projektion;
- keine politische Profilbildung;
- keine Repräsentativitäts- oder Wahrheitsbehauptung aus Chat-Inhalten;
- keine E2E-Verschlüsselungsbehauptung;
- Translation bleibt Lesefassung, keine Evidenz.

## Review / nächster Schritt

Nach grüner Exact-Head-CI bleibt der Task gemäß Run-Pack zunächst `review`. Erst danach darf ein separater Runtime-Preflight inventarisieren, ob gegenüber `social_messages` überhaupt eine additive Persistenzänderung erforderlich ist. Dieser Slice autorisiert keine Runtime-Folgearbeit.
