from pathlib import Path
from textwrap import dedent


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


freshness = Path("apps/web/src/features/voxyVideo/studioLocalCompositionFreshness.ts")
text = freshness.read_text()
text = replace_once(
    text,
    'import { buildVoxyEditorialScriptVersion } from "@/features/voxyVideo/editorialLanguageVariant";',
    dedent('''\
    import {
      buildVoxyEditorialScriptVersion,
      evaluateVoxyEditorialLanguageVariantFreshness,
      getVoxyEditorialLanguageVariantBinding,
      type VoxyEditorialLanguageVariantFreshness,
    } from "@/features/voxyVideo/editorialLanguageVariant";'''),
    "freshness import",
)
helper_anchor = "export function validateVoxyStudioLocalCompositionFreshness(input: {"
helper = dedent('''\
export async function resolveVoxyStudioLanguageVariantFreshness(input: {
  draft: VoxyStudioDraft;
  evidenceSourcePackId: string;
  draftRepository?: VoxyStudioDraftRepository;
}): Promise<VoxyEditorialLanguageVariantFreshness> {
  const binding = getVoxyEditorialLanguageVariantBinding(input.draft.storyPlan);
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
}

''')
text = replace_once(text, helper_anchor, helper + helper_anchor, "freshness helper insertion")
worker_anchor = dedent('''\
        if (evidence.sourcePack.sourcePackId !== expectedSourcePackId) {
          throw new Error("voxy_local_composition_freshness_stale:evidence_snapshot_race");
        }

        const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft, evidence.sourcePack.sourcePackId);''')
worker_replacement = dedent('''\
        if (evidence.sourcePack.sourcePackId !== expectedSourcePackId) {
          throw new Error("voxy_local_composition_freshness_stale:evidence_snapshot_race");
        }

        const languageVariantFreshness = await resolveVoxyStudioLanguageVariantFreshness({
          draft,
          draftRepository,
          evidenceSourcePackId: evidence.sourcePack.sourcePackId,
        });
        if (!languageVariantFreshness.current) {
          throw new Error(
            `voxy_local_composition_freshness_stale:${languageVariantFreshness.blockers.join(",")}`,
          );
        }

        const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft, evidence.sourcePack.sourcePackId);''')
text = replace_once(text, worker_anchor, worker_replacement, "worker freshness insertion")
freshness.write_text(text)

route = Path("apps/web/src/app/api/admin/voxy-studio/[draftId]/render/route.ts")
text = route.read_text()
route_import = 'import { mergeVoxyStudioAllFormatLayoutSafetyIntoValidation } from "@/features/voxyVideo/studioLayoutSafety";'
text = replace_once(
    text,
    route_import,
    route_import + '\nimport { resolveVoxyStudioLanguageVariantFreshness } from "@/features/voxyVideo/studioLocalCompositionFreshness";',
    "route import",
)
get_anchor = dedent('''\
  const validation = validateRenderReadiness(draft, evidence);
  const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    draft,
    evidence.sourcePack.sourcePackId,
  );
  const approvalEvidenceCurrent =
    draft.status === "approved_for_render" &&
    Boolean(draft.renderApproval) &&
    draft.renderApproval?.decisionGateId === currentDecisionGateId &&
    validation.renderEligible;''')
get_replacement = dedent('''\
  const validation = validateRenderReadiness(draft, evidence);
  const languageVariantFreshness = await resolveVoxyStudioLanguageVariantFreshness({
    draft,
    evidenceSourcePackId: evidence.sourcePack.sourcePackId,
  });
  const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    draft,
    evidence.sourcePack.sourcePackId,
  );
  const approvalEvidenceCurrent =
    draft.status === "approved_for_render" &&
    Boolean(draft.renderApproval) &&
    draft.renderApproval?.decisionGateId === currentDecisionGateId &&
    validation.renderEligible &&
    languageVariantFreshness.current;''')
text = replace_once(text, get_anchor, get_replacement, "route GET freshness")
text = replace_once(
    text,
    "    approvalEvidenceCurrent,\n    evidenceValidation: validation,",
    "    approvalEvidenceCurrent,\n    languageVariantFreshness,\n    evidenceValidation: validation,",
    "route GET response",
)
post_anchor = dedent('''\
    if (evidence.sourcePack.sourcePackId !== expectedEvidenceSourcePackId) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_evidence_snapshot_binding_mismatch",
          renderTriggered: false,
          uploadTriggered: false,
          publishTriggered: false,
        },
        { status: 409 },
      );
    }
    const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(''')
post_replacement = dedent('''\
    if (evidence.sourcePack.sourcePackId !== expectedEvidenceSourcePackId) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_evidence_snapshot_binding_mismatch",
          renderTriggered: false,
          uploadTriggered: false,
          publishTriggered: false,
        },
        { status: 409 },
      );
    }
    const languageVariantFreshness = await resolveVoxyStudioLanguageVariantFreshness({
      draft,
      evidenceSourcePackId: evidence.sourcePack.sourcePackId,
    });
    if (!languageVariantFreshness.current) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_language_variant_stale",
          blockers: languageVariantFreshness.blockers,
          renderTriggered: false,
          uploadTriggered: false,
          publishTriggered: false,
        },
        { status: 409 },
      );
    }
    const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(''')
text = replace_once(text, post_anchor, post_replacement, "route POST freshness")
route.write_text(text)

test = Path("apps/web/tests/voxy-language-variant-master-freshness.contract.test.ts")
test.write_text(dedent('''\
import { describe, expect, it } from "vitest";

import {
  bindVoxyEditorialLanguageVariant,
  type VoxyEditorialLanguageVariantPlan,
} from "@/features/voxyVideo/editorialLanguageVariant";
import type { VoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import type { VoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import {
  createVoxyStudioLocalCompositionFreshnessAuthority,
  resolveVoxyStudioLanguageVariantFreshness,
} from "@/features/voxyVideo/studioLocalCompositionFreshness";

const FINGERPRINT = "a".repeat(64);
const SOURCE_PACK_ID = `voxy-studio-dossier:dossier-1:${FINGERPRINT.slice(0, 40)}`;

function plan(overrides: Partial<VoxyEditorialStoryPlan> = {}): VoxyEditorialStoryPlan {
  return {
    version: "voxy-editorial-story-plan-v1",
    storyPlanId: "story-master-1",
    revision: 4,
    briefingId: "brief-1",
    dossierId: "dossier-1",
    title: "Belegter Master",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "preview",
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Ausgangslage",
        narration: "Die belegte Ausgangslage.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
        consequences: [],
        motion: "explaining",
      },
    ],
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    ...overrides,
  };
}

function frenchVariant(master: VoxyEditorialStoryPlan): VoxyEditorialLanguageVariantPlan {
  const translated = plan({
    storyPlanId: "story-fr-1",
    revision: 1,
    title: "Master vérifié",
    locale: "fr",
    originalLanguage: "de",
    outputLanguage: "fr",
    derivedFromStoryPlanId: master.storyPlanId,
    derivedFromRevision: master.revision,
    chapters: master.chapters.map((chapter) => ({
      ...chapter,
      headline: "Situation initiale",
      narration: "La situation vérifiée.",
    })),
  });
  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: SOURCE_PACK_ID,
    translationRevision: 1,
    translationStatus: "approved",
  });
}

function draft(draftId: string, storyPlan: VoxyEditorialStoryPlan): VoxyStudioDraft {
  return {
    draftId,
    revision: 1,
    dossierId: "dossier-1",
    briefingId: "brief-1",
    selectedFormat: "16:9",
    status: "approved_for_render",
    storyPlan,
  } as VoxyStudioDraft;
}

function repository(drafts: VoxyStudioDraft[]): VoxyStudioDraftRepository {
  return {
    async createOrGetDraft({ draft: value }) {
      return value;
    },
    async getDraft(draftId) {
      return drafts.find((item) => item.draftId === draftId) ?? null;
    },
    async listDrafts(params) {
      return drafts.filter(
        (item) =>
          (!params?.briefingId || item.briefingId === params.briefingId) &&
          (!params?.dossierId || item.dossierId === params.dossierId) &&
          (!params?.status || item.status === params.status),
      );
    },
    async replaceDraftIfRevision() {
      return false;
    },
    async appendAuditEvent() {},
    async listAuditEvents() {
      return [];
    },
    getPersistenceState() {
      return {
        mode: "persistent_primary",
        productionTruth: true,
        restartReconstructable: true,
        deploymentReconstructable: true,
      };
    },
  };
}

describe("Voxy language-variant master freshness at render/worker boundary", () => {
  it("keeps an approved variant current while its exact master revision is unchanged", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const result = await resolveVoxyStudioLanguageVariantFreshness({
      draft: variantDraft,
      draftRepository: repository([draft("draft-master", master), variantDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(result).toEqual({ current: true, blockers: [] });
  });

  it("fails closed when the current master revision advances after variant approval", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const result = await resolveVoxyStudioLanguageVariantFreshness({
      draft: variantDraft,
      draftRepository: repository([advancedMaster, variantDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(result.current).toBe(false);
    expect(result.blockers).toContain("language_variant_master_revision_changed");
  });

  it("makes the production worker freshness authority reject master-only drift", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const authority = createVoxyStudioLocalCompositionFreshnessAuthority({
      draftRepository: repository([advancedMaster, variantDraft]),
      evidenceAuthority: {
        async resolveEvidenceContext() {
          return {
            sourcePack: {
              sourcePackId: SOURCE_PACK_ID,
              reviewState: "approved",
              sources: [],
              openGaps: [],
              reviewRequired: false,
              autoPublish: false,
            },
            claims: [],
            findings: [],
            openQuestions: [],
          } as any;
        },
      },
      editorialReviewAuthority: {
        async resolveEditorialReview() {
          throw new Error("review_resolution_must_not_be_reached_after_master_drift");
        },
      },
      loadEvidenceReviewState: async () =>
        ({
          snapshot: { fingerprint: FINGERPRINT },
          approved: true,
          reviewRecord: null,
          persistence: { mode: "persistent_primary" },
        }) as any,
    });

    await expect(
      authority.assertCurrent({
        job: {} as VoxyLocalCompositionJob,
        request: {
          renderProfile: "editorial_v1",
          artifactId: variantDraft.draftId,
        } as VoxyLocalCompositionRequest,
      }),
    ).rejects.toThrow("language_variant_master_revision_changed");
  });
});
'''))

workflow = Path(".github/workflows/voxy-local-composition-runtime.yml")
text = workflow.read_text()
text = replace_once(
    text,
    '      - "apps/web/tests/voxy-local-composition-freshness.contract.test.ts"\n',
    '      - "apps/web/tests/voxy-local-composition-freshness.contract.test.ts"\n      - "apps/web/tests/voxy-language-variant-master-freshness.contract.test.ts"\n',
    "runtime workflow path",
)
text = replace_once(
    text,
    '          pnpm -C apps/web exec vitest run tests/voxy-local-composition-freshness.contract.test.ts tests/voxy-production-operations-readiness.contract.test.ts\n',
    '          pnpm -C apps/web exec vitest run tests/voxy-local-composition-freshness.contract.test.ts tests/voxy-language-variant-master-freshness.contract.test.ts tests/voxy-production-operations-readiness.contract.test.ts\n',
    "runtime workflow test command",
)
workflow.write_text(text)
