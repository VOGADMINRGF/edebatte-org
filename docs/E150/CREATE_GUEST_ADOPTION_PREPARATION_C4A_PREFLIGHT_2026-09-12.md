# C4A Guest Adoption Preparation — Fail-Blocked Preflight

Status: **historische, revisionsgebundene Preflight-Evidence**
Datum: **2026-09-12**

```text
BASE_MAIN_SHA=0103c90e0364f3da2f86ab56ac4a230fafc74049
TASK=CREATE-GUEST-ADOPTION-PREPARATION-FOUNDATION-01
RESULT=FAIL_BLOCKED
TASK_PREFLIGHT=FAIL_BLOCKED
SECURITY_PREFLIGHT=FAIL_BLOCKED
PERSISTENCE_PREFLIGHT=FAIL_BLOCKED
SESSION_BINDING_PREFLIGHT=PASS
PRIVACY_PREFLIGHT=FAIL_BLOCKED
TRANSITION_CARRIER_PREFLIGHT=PASS
ABUSE_PREFLIGHT=PASS
SIZE_PREFLIGHT=PASS
COLLISION_RESULT=FAIL_BLOCKED_AT_REST_PROTECTION
SPLIT_REQUIRED=false
```

## Befund und Blocker

Der temporäre Roh-Claim muss serverseitig über die Login-Navigation bestehen. Das Repository belegt keine genehmigte application-level At-Rest-Encryption-Primitive und keinen Key-Loading-/Rotation-Contract dafür. Daher gilt:

```text
EXISTING_AT_REST_ENCRYPTION_AVAILABLE=false
TEMP_RAW_PAYLOAD_ALLOWED=false
```

Mongo-TTL und C3C-Safety-Scanning ersetzen keinen Schutz ruhender Rohdaten nicht. Als Repositoriesignale für die gemeinsame Sicherheitslücke gelten `core/db/pii/userPaymentProfiles.ts` (kein Persistieren vollständiger IBAN ohne zentralen Encryption Helper) sowie `docs/E150/SOCIAL_PROVIDER_SECRET_MANIFEST_01.md` (zukünftige `SOCIAL_TOKEN_ENCRYPTION_KEY_REF`, aber keine Encryption Runtime oder Key-Wert). Social-Key und Social-Infrastruktur dürfen nicht für Create wiederverwendet werden.

## Positive, bedingte C4A-Findings

Der vorgesehene Flow bleibt nach Behebung des Blockers: `PRE_SUBMIT_EXPLICIT_CONTINUE` — Guest-Text → getrennte explizite „continue/sign in“-Aktion → temporäre Vorbereitung → Login. Normales anonymes C3D-Submit bleibt unverändert und bereitet nichts automatisch vor.

`C3D_ACCEPTED_TEXT_CLEAR_REQUIRED_BY_CONTRACT=true`; `C3D_OPERATION_ID_EPHEMERAL_RETENTION_ALLOWED=false`; `C3D_CONTRACT_COMPATIBLE=true`; `C3D_BEHAVIOR_CHANGE_REQUIRED=false`. C3C bleibt Safety-Reuse-only (`createGuestClaimSafety` / `inspectGuestClaim`), ohne Result-Schema- oder Persistenzänderung. Die Bindung nutzt die verifizierte signierte anonyme C3A-Session und persistiert ausschließlich einen domain-separated SHA-256 Binding-Hash (`RAW_ANON_SESSION_ID_PERSISTED=false`). Die Preparation-ID ist servergenerierte UUIDv4; Client-Authority ist false.

Konzeptionell bestanden: ein host-only opaque `HttpOnly`-Cookie `edebatte_create_adoption_preparation`, `SameSite=Lax`, in Production `Secure`, `Path=/`, `MaxAge=min(900 seconds, remaining anonymous-session lifetime)`. Es trägt keinen Rohinhalt, ist kein Auth-Credential und verwendet weder URL-Token noch Browser Storage. Es soll `/create → /login → successful login → /create` überdauern.

Nur bedingte, nicht autorisierte Modell-Evidence: Core MongoDB-Collection `create_guest_adoption_preparations`, Felder `version`, `preparationId`, `anonymousSessionBindingHash`, `claim`, `claimFingerprint`, `createdAt`, `expiresAt`; unique `preparationId`, unique `anonymousSessionBindingHash` und TTL `expiresAt` mit `expireAfterSeconds=0`. Höchstens eine aktive Preparation pro anonymer Session, maximal 15 Minuten und nie über Session-Expiry; gleicher Claim reuse/replace nach späterem Vertrag, geänderter Claim atomar replace/supersede. Diese Aussage autorisiert weder Collection noch Persistenz.

## Folgezustand

```text
C4A_STATUS=blocked
C4A_PREFLIGHT_RESULT=FAIL_BLOCKED
C4A_BLOCKER=AT_REST_PROTECTION
C4A_IMPLEMENTATION_AUTHORIZED=false
C4A_DONE=false
C4A_SPLIT_REQUIRED=false

PREREQUISITE=CREATE-TEMP-PAYLOAD-AT-REST-PROTECTION-01
PREREQUISITE_STATUS=codex_ready
PREREQUISITE_AUTHORIZATION=preflight_only
PREREQUISITE_IMPLEMENTATION_AUTHORIZED=false
PREREQUISITE_DONE=false
C4B_STATUS=blocked
C4B_AUTHORIZATION=none
```

Der neue Prerequisite-Preflight bewertet erst eine etablierte authenticated-encryption-Primitive der aktuellen Node-Runtime, server-only dediziertes Key-Loading, Key-Validierung, Envelope-/Key-Versionierung, Integritätstag, Nonce/IV-Eindeutigkeit, Domain Separation/AAD, sichere Decrypt-Fehler, Rotation, Umgebungsgrenzen, Redaction und Test-Key-Strategie. Mögliche AES-256-GCM-Verwendung ist nur Prüfgegenstand, nicht kanonisiert oder autorisiert. Keine eigene Kryptographie, kein Hash/HMAC als Encryption und keine Wiederverwendung von C3A-, CSRF-, JWT-, Social-, OAuth- oder Datenbank-Secrets.

Die Reihenfolge ist verbindlich: Prerequisite-Preflight → getrennte Implementierungsautorisierung nur bei PASS → Foundation-Implementierung/Review/Merge → refreshed main → frischer C4A-Preflight. Der Abschluss der Foundation autorisiert C4A nicht direkt. Der frische C4A-Preflight muss auch das bedingte `CORE_CONTRACT_COUNT=4` gegen das Ziel `<=2` erneut bewerten. C4B, C5–C12, G1–G5, T0–T8, Alpha2 und Production/Output bleiben unverändert und nicht autorisiert; kein Auto-Publish.
