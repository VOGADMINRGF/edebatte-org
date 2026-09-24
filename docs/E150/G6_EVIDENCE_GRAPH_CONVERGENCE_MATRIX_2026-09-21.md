# G6 Evidence / Graph Convergence Matrix

Date: 2026-09-21

```text
TRACK=G6
BASE_MAIN_SHA=e9d9d649ecb94a0202a1d0f4ec8243e250fb6e08
MATRIX_STATUS=complete_for_current_main
G6_IMPLEMENTATION_AUTHORIZED=false
G6_STATUS=blocked_on_T9_verified_handoff
NEW_EVIDENCE_STORE_AUTHORIZED=false
NEW_GRAPH_STORE_AUTHORIZED=false
GRAPH_TO_DOMAIN_TRUTH_WRITEBACK=false
AUTO_TRUTH=false
AUTO_PUBLISH=false
```

## 1. Purpose

This matrix satisfies the documentation/convergence prerequisite required by
G6/#952 before any derived provenance implementation is considered. It does not
authorize G6 runtime or persistence code.

It establishes one write-direction rule across the existing evidence surfaces:

```text
canonical domain/semantic contracts
        |
        v
existing persistence owners / compatibility adapters
        |
        v
derived readmodels / graph projections / consumers

NEVER: projection/readmodel -> domain truth
```

The matrix is deliberately based on current `main` only. Open PRs, including
C13 metadata work, are not treated as merged canon.

## 2. Canonical convergence decision

### 2.1 Semantic owner

`features/analyze/atomicClaimSourceRelationContract.ts` is the current canonical
semantic contract for atomic evidence reasoning. It owns the meaning of:

- `SourceArtifact`;
- `SourceSegment`;
- `AtomicClaim` and its explicit scope dimensions;
- `SourceFamily`;
- `ClaimSourceRelation` and relation taxonomy;
- `EvidenceAssessment` as a multidimensional assessment;
- `PublicationClassification` resolution constraints;
- `SynthesisReceipt` validation.

G6 may reference these IDs and semantics. It may not copy them into a second
independent Graph-domain model whose values can diverge.

### 2.2 Persistence owner

`core/evidence/db.ts` remains the existing durable Evidence persistence surface,
with these collections:

```text
evidence_claims
evidence_items
evidence_links
evidence_decisions
```

G6 does not create a fifth Evidence collection, a parallel Graph collection, or
a second Evidence DB module.

The current persisted schemas in `core/evidence/types.ts` predate the richer
atomic contract. Future persistence convergence, if separately authorized, must
therefore be additive/versioned and compatibility-safe rather than pretending
that every legacy field already carries the newer semantics.

### 2.3 Derived Analyze readmodel

`features/analyze/evidenceGraph.ts` is a derived Analyze readmodel builder. Its
current node IDs are generated from claim text and canonicalized URLs; edges are
presentation/analysis relations such as `supports`, `refutes` or `mentions`.

Those IDs are not promoted to canonical domain identity by G6. In particular,
a hash produced by `idFromText()` is a readmodel identity only unless it already
references a canonical domain ID supplied by an owner.

`AnalyzeResult.evidenceGraph` remains optional output/readmodel state under
`features/analyze/schemas.ts`; presence in an Analyze result does not turn the
graph into a persistence or truth owner.

### 2.4 Compatibility adapter

`features/evidence/syncFromAnalyze.ts` is an existing Analyze -> Core Evidence
write adapter for legacy `EvidenceClaimDoc` records.

Its current behavior derives scalar `meta.confidence` from claim `importance`.
That field is legacy compatibility metadata only. It must not be interpreted as,
or promoted into, any of the multidimensional `EvidenceAssessment` dimensions.

G6 may require a later separately authorized convergence change to this adapter,
but the direction remains:

```text
Atomic/Analyze domain result -> compatibility validation/mapping -> core/evidence
```

Never:

```text
legacy scalar confidence -> newer EvidenceAssessment truth
EvidenceGraph edge/weight -> EvidenceAssessment truth
Graph node -> new AtomicClaim/SourceFamily truth
```

## 3. Surface-by-surface matrix

| Surface | Current role | Domain/semantic truth | Persistence owner | IDs / identity status | Allowed write direction | Legacy / compatibility rule | G6 decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `features/analyze/atomicClaimSourceRelationContract.ts` | Atomic Source/Segment/Claim/Relation/Assessment/Receipt contract | **Yes — semantic owner for these concepts** | none in this module | explicit domain IDs supplied by contract objects | domain producers -> validated contract objects | n/a | reference/extend only; do not duplicate |
| `features/analyze/schemas.ts` | Analyze result schema/transport validation | Analyze result shape only; not independent Evidence truth | none | result-local fields; `evidenceGraph` optional | producer -> schema-valid Analyze result | older fields may remain readable where schema allows | keep as validation/read boundary |
| `features/analyze/evidenceGraph.ts` | Derived Analyze graph/readmodel | **No** | none | current claim/evidence node IDs are deterministic hashes of text/URL and therefore projection-local | canonical/analyze inputs -> graph projection | weights/edge labels are presentation/readmodel data, not truth promotion | derived-only; future canonical refs may replace/add IDs without reverse writes |
| `core/evidence/types.ts` | Legacy/current durable Evidence document schema | durable representation, but older semantics must not override atomic contract | `core/evidence/db.ts` | `EvidenceClaimDoc.claimId`, Mongo `_id`, URL-keyed items, ObjectId links | validated domain/adapter -> existing collections | scalar `meta.confidence`, reliability hints and older relation shapes remain compatibility fields | additive/versioned convergence only |
| `core/evidence/db.ts` | Collection/index owner | no separate semantic taxonomy | **Yes — existing Evidence persistence owner** | collection-specific unique keys/indexes | approved adapters -> core collections | existing collections retained; no destructive reinterpretation | reuse/version; no third store |
| `features/evidence/syncFromAnalyze.ts` | Analyze -> Evidence compatibility write adapter | **No** | writes `evidence_claims` through core owner | builds stable legacy claim ID from claim ID or source/index fallback | Analyze/domain -> adapter -> core persistence | `importance -> meta.confidence` must remain legacy-only and cannot establish EvidenceAssessment | future adapter hardening only; no Graph truth |
| Dossier/public consumers of `analyze.evidenceGraph` | UI/read projection consumers | **No** | their existing Dossier owner only | consume graph/readmodel IDs | domain/readmodel -> consumer | must tolerate compatibility/version changes intentionally | read-only from Evidence perspective |
| G6 projection | future cross-domain lineage/readmodel | **No** | no new Evidence/Graph store authorized | edges must reference already canonical IDs/revisions/receipts | canonical owners -> G6 projection | may expose compatibility aliases, never promote them | blocked until T9 handoff; derived-only |

## 4. Canonical identity rules

### 4.1 Observation identity

`DurableSourceSnapshot.snapshotId` remains Observation Identity wherever a
Source/Observation binding exists. G6 must not invent a competing observation ID
or reinterpret URL identity as observation identity.

### 4.2 Source Artifact and Segment

The atomic contract's `SourceArtifact.id` and `SourceSegment.id` are semantic
references inside the atomic Source/Claim model. They must remain traceable to
whatever canonical Source/Observation owner produced them.

G6 may project:

```text
Observation/Snapshot -> SourceArtifact -> SourceSegment
```

only from existing bindings. Missing bindings remain missing/review-required;
G6 cannot synthesize them from URL similarity.

### 4.3 Atomic Claim

`AtomicClaim.id` is the semantic claim reference for the atomic contract.

Legacy `EvidenceClaimDoc.claimId` may carry a compatible reference, but the
current adapter can also fall back to `<sourceBase>:<index>`. Therefore legacy
claim IDs are not automatically proof of canonical atomic identity. A future
adapter must distinguish explicit canonical IDs from compatibility fallback IDs.

### 4.4 Source Family

`SourceFamily.id` and `ClaimSourceRelation.sourceFamilyId` own source-family
semantics in the atomic contract. G6 may project same-family/independence edges
only when those values are established by the canonical contract/verification
path.

Publisher equality, URL host equality, translation, repeated syndication or
multiple model runs are not sufficient to assert independent roots.

### 4.5 Core Evidence Mongo IDs

Mongo `_id` values in `evidence_claims`, `evidence_items`, `evidence_links` and
`evidence_decisions` remain storage identities. They do not replace semantic
Atomic Claim, Source Artifact, Source Segment, Source Family, Dossier, Decision
or receipt IDs.

## 5. Write-direction matrix

Allowed:

```text
Source/Observation owners
  -> Atomic Source/Segment/Claim/Relation contract
  -> validated compatibility/persistence adapter
  -> core/evidence collections
  -> read/query layer
  -> Analyze/Dossier/G6 projections
```

Also allowed:

```text
Atomic contract + existing domain IDs
  -> transient/derived Analyze EvidenceGraph
```

Forbidden:

```text
Analyze EvidenceGraph -> AtomicClaim creation/promotion
Analyze EvidenceGraph -> SourceFamily truth
Analyze EvidenceGraph -> EvidenceAssessment promotion
G6 projection -> core/evidence truth writeback
G6 projection -> Dossier/Decision/Swipe truth writeback
legacy scalar confidence -> multidimensional EvidenceAssessment promotion
translation/read version -> independent Evidence Root
model/provider repetition -> independent Source Root
```

## 6. Legacy compatibility decisions

### 6.1 `EvidenceClaimDoc.meta.confidence`

Current `syncFromAnalyze.ts` derives this scalar from claim `importance`.
Therefore:

- it may be displayed/read by old consumers only as legacy metadata;
- it cannot satisfy `sourceSegmentFidelity`;
- it cannot satisfy `speakerAttributionConfidence`;
- it cannot satisfy `claimEntailmentStrength`;
- it cannot satisfy `sourceReliabilityForClaim`;
- it cannot satisfy `sourceIndependence`;
- it cannot satisfy `externalVerificationStatus`;
- it cannot satisfy freshness/generalizability/counterevidence/human-review
  dimensions;
- it cannot raise publication classification.

No migration may infer those dimensions from the scalar.

### 6.2 `EvidenceItemDoc.reliabilityHint`

This remains a legacy source/item hint. It is not equivalent to
`EvidenceAssessment.sourceReliabilityForClaim`, which is claim-specific.

### 6.3 Legacy link relation shapes

`EvidenceLinkDoc.relation` currently supports only `supports | refutes | context`
and optional older `linkType` values. These are compatibility persistence shapes,
not a replacement taxonomy for `ClaimSourceRelationType`.

Future additive persistence may retain a compatibility projection while storing
or referencing the richer canonical relation identity, but must not collapse the
richer relation back into the older enum as semantic truth.

### 6.4 Analyze graph weights

`EvidenceGraph` weights are readmodel/ranking-display data. They cannot establish
source reliability, claim entailment, verification status or publication status.

## 7. Persistence convergence rule

No new G6 collection is authorized.

If a later, separately authorized persistence slice needs to retain richer atomic
semantics durably, it must first prove an additive/versioned mapping into the
existing `core/evidence` owner. Acceptable classes of change include:

- additive canonical reference fields;
- schema/version discriminator fields;
- additive relation metadata;
- additive receipt/revision references;
- compatibility readers/adapters for older records.

Not authorized by this matrix:

- destructive rewrite of historical Evidence records;
- changing historical scalar confidence into new assessment truth;
- replacing existing collections with a new Graph database/collection;
- dual-writing two competing semantic stores;
- Graph-to-domain backfill that promotes derived values into truth.

## 8. Analyze EvidenceGraph convergence rule

The current graph builder is useful as a lightweight readmodel but cannot be the
G6 semantic backbone because it creates IDs from claim text/URL and simplifies
relations.

A future G6 projection may:

1. reuse existing canonical IDs when supplied;
2. expose compatibility aliases for old graph IDs;
3. add derived edges between already canonical IDs;
4. preserve the existing consumer shape through an adapter/versioned readmodel.

It may not create missing domain entities merely to make a graph connected.

## 9. Translation and cross-lingual rule

Translation/reading-view information is an expression/representation relation,
not a new Evidence Root.

Therefore:

```text
original source/segment --translation-of/read-version-of--> reading view
```

is valid as derived metadata/relation, while:

```text
original evidence + translated copy = two independent evidence roots
```

is forbidden.

The atomic receipt validation already rejects translation evidence segments being
used as newly introduced evidence. G6 must preserve that directionality.

## 10. Source lineage and independence

Source-family and independence state must come from canonical lineage/verification
logic. G6 can make the result visible but cannot infer it from superficial graph
structure.

Required examples:

- several articles carrying one agency dispatch -> one upstream family when the
  canonical lineage owner establishes that relationship;
- programme clip plus factcheck quoting the same primary study -> shared root,
  not automatic independent corroboration;
- two independently established primary sources -> separate roots;
- A -> B -> A citation cycle -> cycle remains visible; no fabricated origin;
- expired/unavailable URL -> historical relation may remain visible, but
  availability does not become verified merely because the node exists.

## 11. Dossier / Decision / Swipe projection boundary

G6 may project references from Evidence/Claims into existing Dossier, Decision
and Swipe identities only where those owners already provide canonical IDs or
receipts.

The graph may answer "what references what?". It may not answer by mutation:

- which side is politically correct;
- which option should win;
- whether a Dossier is decision-ready;
- whether a Swipe candidate is publishable;
- whether a Decision is activated.

Those states remain with their existing domain/review owners.

## 12. T9 handoff remains unresolved

This matrix removes the Evidence/Graph ownership ambiguity on current `main`,
but it does not satisfy the separate T9 prerequisite.

G6 remains blocked until T9/#951, implemented through #629/E150 rather than a new
runtime, provides a verified handoff for at least the relevant lineage/
verification concepts such as:

- verified root-source independence;
- factcheck-of-factcheck status;
- counterevidence/conflict state;
- freshness;
- jurisdiction/generalizability;
- delta/revalidation receipts.

Until that handoff exists, G6 must not invent placeholder truth for these fields.

## 13. C13 relationship

C13 is the source/media intake path. G6 consumes only merged canonical C13
bindings/metadata. It does not acquire media itself and must never bypass #644.

Open C13 PRs are not treated as merged truth by this matrix. When C13 metadata is
merged, a future G6 preflight may add projection edges for programme/episode/
segment/speaker/timecode/lineage using those canonical fields without changing
the ownership decisions in this document.

## 14. Required future adapter acceptance

Before any future change to `syncFromAnalyze.ts` or `core/evidence` under G6,
focused tests must prove at least:

- atomic relation type is not strengthened by compatibility mapping;
- scalar legacy confidence cannot promote EvidenceAssessment;
- translation produces no independent root;
- same-family sources do not count as independent corroboration;
- missing source/segment binding fails closed;
- unknown/new schema version fails closed or follows an explicit compatible
  reader path;
- readmodel graph cannot write back truth;
- historical legacy consumers continue to read supported old records;
- no new Evidence/Graph collection appears.

## 15. G6 preflight result

```text
EVIDENCE_GRAPH_CONVERGENCE_MATRIX=complete_for_current_main
ATOMIC_SEMANTIC_OWNER=features/analyze/atomicClaimSourceRelationContract.ts
CORE_EVIDENCE_PERSISTENCE_OWNER=core/evidence/db.ts
ANALYZE_GRAPH_ROLE=derived_readmodel_only
SYNC_FROM_ANALYZE_ROLE=legacy_compatibility_write_adapter
LEGACY_SCALAR_CONFIDENCE_ROLE=compatibility_only_no_truth_promotion
NEW_EVIDENCE_OR_GRAPH_COLLECTION=false
GRAPH_TO_DOMAIN_TRUTH=false
T9_VERIFIED_HANDOFF=false
G6_IMPLEMENTATION_AUTHORIZED=false
NEXT_BLOCKER=T9_verified_handoff_via_629_E150
```

The matrix prerequisite is now documented for current `main`; G6 remains
fail-closed because the independent T9 verified handoff prerequisite is not yet
satisfied.
