# ALPHA2-PREMIUM-REALDOC-FINAL-ACCEPTANCE-01

Stand: 2026-08-28
Status: **blocked until P0–P2 + Exact-Head CI/Vercel/Human gates are green**
Parent: Issue #660 `PREMIUM-KNOWLEDGE-02`

## Purpose

Reserve the existing 96-page election-program PDF as the final real-world acceptance probe for the Premium material/knowledge flow. Alpha2 must not consume this document early or bypass the product path.

## Trigger contract

Alpha2 may start this task only when all conditions are true:

1. all related P0–P2 implementation slices are complete;
2. the relevant exact head is the intended candidate head;
3. Exact-Head CI is green;
4. Vercel exact-head preview is green;
5. required review threads are resolved;
6. required Human/Manual gates are green.

Until then the task remains `blocked` and no AI/provider analysis of the 96-page document may be started.

## Automatic sequence after trigger

### Phase A — free Dry-Run / Preflight

Run locally without AI/provider calls and without commercial credits:

- extract the complete PDF;
- record exact page count and extracted character count;
- detect headings, chapters, sections and paragraph boundaries;
- run semantic segmentation preview;
- verify that no text is silently truncated;
- report segment count, hard-limit fallbacks and extraction/segmentation anomalies.

If any extraction, completeness or segmentation invariant fails, stop and create/continue a repair slice. Do not proceed to paid analysis.

### Phase B — explicit cost gate

Only after Phase A is green:

- calculate the real internal analysis-unit estimate from the extracted text;
- surface the volume/cost estimate through the official product flow;
- require the existing explicit cost/volume approval gate before provider calls.

Alpha2 must not self-approve a human cost gate.

### Phase C — official first ingest

After explicit approval:

- run the document only through the official material flow;
- persist versioned material identity and provenance;
- keep Knowledge-Ingest separate from Question Generation;
- perform Graph-first matching before new work;
- persist durable knowledge, not stale question drafts;
- produce review-required working drafts only;
- write provider/usage/internal-units/quoted-vs-charged economics to the ledger;
- no auto-publish, no auto-Graph-write, no auto-merge.

### Phase D — reuse proof

After the first ingest passes review, use the identical document again and verify:

- duplicate/fingerprint recognition occurs before a new full analysis;
- existing versioned knowledge is reused;
- only compact/relevant retrieval is used for new concrete work;
- the full 96-page source is not unnecessarily re-analysed;
- economics distinguish first-ingest and reuse work;
- no democratic weighting/truth/signal/priority is monetized.

## Pass criteria

The task is complete only when:

- free Dry-Run is green;
- official first ingest is green;
- human review path is green;
- identical reupload/reuse proof is green;
- cost/margin audit evidence is present;
- no silent truncation occurred;
- no auto-publication, auto-Graph-write or auto-merge occurred;
- Issue #660 DoD can be evidenced from the exact tested head.

## Fail-closed rules

- P0–P2 incomplete -> stay blocked.
- CI/Vercel/review/Human gate not green -> stay blocked.
- Dry-Run anomaly -> repair, then rerun Dry-Run.
- Cost approval required but absent -> stop before provider calls.
- Source/version ambiguity -> require review; never merge versions automatically.

## Alpha2 ownership rule

This is a continuation/final-acceptance task for the existing Premium-material work. Alpha2 must reuse the existing owner branch/PR where one exists and must not create a parallel implementation slice unless the canonical task ownership evidence requires a repair handoff.
