from pathlib import Path

source = Path('apps/web/src/features/voxyVideo/studioLocalCompositionFreshness.ts')
text = source.read_text()
old = '''  const binding = getVoxyEditorialLanguageVariantBinding(input.draft.storyPlan);
  if (!binding) return { current: true, blockers: [] };

  const repository = input.draftRepository ?? getVoxyStudioDraftRepository();
  const briefingDrafts = await repository.listDrafts({
    briefingId: input.draft.briefingId,
    dossierId: input.draft.dossierId,
    limit: 100,
  });
  const masterCandidates = briefingDrafts.filter(
    (candidate) =>
      candidate.draftId !== input.draft.draftId &&
      candidate.dossierId === input.draft.dossierId &&
      candidate.storyPlan.storyPlanId === binding.translatedFromStoryPlanId,
  );
  if (masterCandidates.length !== 1) {
    return {
      current: false,
      blockers: [
        masterCandidates.length === 0
          ? "language_variant_master_story_missing"
          : "language_variant_master_story_ambiguous",
      ],
    };
  }

  const master = masterCandidates[0]!;
  return evaluateVoxyEditorialLanguageVariantFreshness({
    plan: input.draft.storyPlan,
    masterStoryPlanId: master.storyPlan.storyPlanId,
    masterStoryPlanRevision: master.storyPlan.revision,
    evidenceSourcePackId: input.evidenceSourcePackId,
  });
'''
new = '''  const repository = input.draftRepository ?? getVoxyStudioDraftRepository();
  const briefingDrafts = await repository.listDrafts({
    briefingId: input.draft.briefingId,
    dossierId: input.draft.dossierId,
    limit: 100,
  });
  const visitedStoryPlanIds = new Set<string>();
  let currentDraft = input.draft;

  while (true) {
    const currentStoryPlanId = currentDraft.storyPlan.storyPlanId;
    if (visitedStoryPlanIds.has(currentStoryPlanId)) {
      return { current: false, blockers: ["language_variant_master_story_cycle"] };
    }
    visitedStoryPlanIds.add(currentStoryPlanId);

    const binding = getVoxyEditorialLanguageVariantBinding(currentDraft.storyPlan);
    if (!binding) return { current: true, blockers: [] };

    const masterCandidates = briefingDrafts.filter(
      (candidate) =>
        candidate.draftId !== currentDraft.draftId &&
        candidate.dossierId === input.draft.dossierId &&
        candidate.storyPlan.storyPlanId === binding.translatedFromStoryPlanId,
    );
    if (masterCandidates.length !== 1) {
      return {
        current: false,
        blockers: [
          masterCandidates.length === 0
            ? "language_variant_master_story_missing"
            : "language_variant_master_story_ambiguous",
        ],
      };
    }

    const master = masterCandidates[0]!;
    if (visitedStoryPlanIds.has(master.storyPlan.storyPlanId)) {
      return { current: false, blockers: ["language_variant_master_story_cycle"] };
    }
    const freshness = evaluateVoxyEditorialLanguageVariantFreshness({
      plan: currentDraft.storyPlan,
      masterStoryPlanId: master.storyPlan.storyPlanId,
      masterStoryPlanRevision: master.storyPlan.revision,
      evidenceSourcePackId: input.evidenceSourcePackId,
    });
    if (!freshness.current) return freshness;
    currentDraft = master;
  }
'''
if text.count(old) != 1:
    raise SystemExit(f'source anchor count {text.count(old)}')
source.write_text(text.replace(old, new, 1))

test = Path('apps/web/tests/voxy-language-variant-master-freshness.contract.test.ts')
text = test.read_text()
french_end = '''  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: SOURCE_PACK_ID,
    translationRevision: 1,
    translationStatus: "approved",
  });
}

function draft'''
italian = '''  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: SOURCE_PACK_ID,
    translationRevision: 1,
    translationStatus: "approved",
  });
}

function italianVariant(master: VoxyEditorialStoryPlan): VoxyEditorialLanguageVariantPlan {
  const translated = plan({
    storyPlanId: "story-it-1",
    revision: 1,
    title: master.title,
    locale: "it",
    originalLanguage: master.outputLanguage,
    outputLanguage: "it",
    derivedFromStoryPlanId: master.storyPlanId,
    derivedFromRevision: master.revision,
    chapters: master.chapters.map((chapter) => ({ ...chapter })),
  });
  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: SOURCE_PACK_ID,
    translationRevision: 1,
    translationStatus: "approved",
  });
}

function draft'''
if text.count(french_end) != 1:
    raise SystemExit(f'french anchor count {text.count(french_end)}')
text = text.replace(french_end, italian, 1)

old_helper = '''function masterDriftAuthority(variantDraft: VoxyStudioDraft, advancedMaster: VoxyStudioDraft) {
  return createVoxyStudioLocalCompositionFreshnessAuthority({
    draftRepository: repository([advancedMaster, variantDraft]),'''
new_helper = '''function masterDriftAuthority(
  variantDraft: VoxyStudioDraft,
  advancedMaster: VoxyStudioDraft,
  ancestorDrafts: VoxyStudioDraft[] = [],
) {
  return createVoxyStudioLocalCompositionFreshnessAuthority({
    draftRepository: repository([advancedMaster, ...ancestorDrafts, variantDraft]),'''
if text.count(old_helper) != 1:
    raise SystemExit(f'helper anchor count {text.count(old_helper)}')
text = text.replace(old_helper, new_helper, 1)

insertion_anchor = '''  it("makes the production worker freshness authority reject master-only drift", async () => {'''
regression = '''  it("keeps a transitive de -> fr -> it chain current while every ancestor revision is unchanged", async () => {
    const master = plan();
    const frenchDraft = draft("draft-fr", frenchVariant(master));
    const italianDraft = draft("draft-it", italianVariant(frenchDraft.storyPlan));
    const result = await resolveVoxyStudioLanguageVariantFreshness({
      draft: italianDraft,
      draftRepository: repository([draft("draft-master", master), frenchDraft, italianDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(result).toEqual({ current: true, blockers: [] });
  });

  it("fails closed transitively when only the root master revision advances", async () => {
    const master = plan();
    const frenchDraft = draft("draft-fr", frenchVariant(master));
    const italianDraft = draft("draft-it", italianVariant(frenchDraft.storyPlan));
    const result = await resolveVoxyStudioLanguageVariantFreshness({
      draft: italianDraft,
      draftRepository: repository([draft("draft-master", plan({ revision: 5 })), frenchDraft, italianDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(result.current).toBe(false);
    expect(result.blockers).toContain("language_variant_master_revision_changed");
  });

  it("fails closed on missing, ambiguous and cyclic language-variant ancestors", async () => {
    const master = plan();
    const french = frenchVariant(master);
    const frenchDraft = draft("draft-fr", french);
    const italian = italianVariant(french);
    const italianDraft = draft("draft-it", italian);

    const missing = await resolveVoxyStudioLanguageVariantFreshness({
      draft: italianDraft,
      draftRepository: repository([italianDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(missing.blockers).toContain("language_variant_master_story_missing");

    const ambiguous = await resolveVoxyStudioLanguageVariantFreshness({
      draft: italianDraft,
      draftRepository: repository([frenchDraft, draft("draft-fr-duplicate", french), italianDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(ambiguous.blockers).toContain("language_variant_master_story_ambiguous");

    const cyclicFrench = {
      ...french,
      languageVariant: {
        ...french.languageVariant,
        translatedFromStoryPlanId: italian.storyPlanId,
        translatedFromStoryPlanRevision: italian.revision,
      },
    } as VoxyEditorialLanguageVariantPlan;
    const cyclic = await resolveVoxyStudioLanguageVariantFreshness({
      draft: italianDraft,
      draftRepository: repository([draft("draft-fr", cyclicFrench), italianDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(cyclic.blockers).toContain("language_variant_master_story_cycle");
  });

  it("makes the production worker freshness authority reject master-only drift", async () => {'''
if text.count(insertion_anchor) != 1:
    raise SystemExit(f'insertion anchor count {text.count(insertion_anchor)}')
text = text.replace(insertion_anchor, regression, 1)

old_worker = '''  it("blocks the real worker path before any executor call after master-only drift", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const freshnessAuthority = masterDriftAuthority(variantDraft, advancedMaster);
    const request = {
      requestedByUserId: "user-1",
      artifactId: variantDraft.draftId,
      briefingId: "brief-1",
      scriptVersion: "script-v1",
      locale: "fr",'''
new_worker = '''  it("blocks the real worker path before any executor call after transitive root-master drift", async () => {
    const master = plan();
    const frenchDraft = draft("draft-fr", frenchVariant(master));
    const variantDraft = draft("draft-it", italianVariant(frenchDraft.storyPlan));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const freshnessAuthority = masterDriftAuthority(variantDraft, advancedMaster, [frenchDraft]);
    const request = {
      requestedByUserId: "user-1",
      artifactId: variantDraft.draftId,
      briefingId: "brief-1",
      scriptVersion: "script-v1",
      locale: "it",'''
if text.count(old_worker) != 1:
    raise SystemExit(f'worker anchor count {text.count(old_worker)}')
text = text.replace(old_worker, new_worker, 1)
test.write_text(text)
