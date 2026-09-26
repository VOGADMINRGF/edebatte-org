from pathlib import Path
from textwrap import dedent
import re


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
text = replace_once(text, helper_anchor, helper + helper_anchor, "freshness helper")
worker_old = '''if (evidence.sourcePack.sourcePackId !== expectedSourcePackId) {
          throw new Error("voxy_local_composition_freshness_stale:evidence_snapshot_race");
        }

        const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft, evidence.sourcePack.sourcePackId);'''
worker_new = '''if (evidence.sourcePack.sourcePackId !== expectedSourcePackId) {
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

        const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft, evidence.sourcePack.sourcePackId);'''
text = replace_once(text, worker_old, worker_new, "worker freshness")
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
get_old = '''const validation = validateRenderReadiness(draft, evidence);
  const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    draft,
    evidence.sourcePack.sourcePackId,
  );
  const approvalEvidenceCurrent =
    draft.status === "approved_for_render" &&
    Boolean(draft.renderApproval) &&
    draft.renderApproval?.decisionGateId === currentDecisionGateId &&
    validation.renderEligible;'''
get_new = '''const validation = validateRenderReadiness(draft, evidence);
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
    languageVariantFreshness.current;'''
text = replace_once(text, get_old, get_new, "route GET freshness")
text = replace_once(
    text,
    "    approvalEvidenceCurrent,\n    evidenceValidation: validation,",
    "    approvalEvidenceCurrent,\n    languageVariantFreshness,\n    evidenceValidation: validation,",
    "route GET response",
)
post_old = '''if (evidence.sourcePack.sourcePackId !== expectedEvidenceSourcePackId) {
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
    const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId('''
post_new = '''if (evidence.sourcePack.sourcePackId !== expectedEvidenceSourcePackId) {
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
    const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId('''
text = replace_once(text, post_old, post_new, "route POST freshness")
route.write_text(text)

# Reuse the already-staged canonical test body rather than maintaining a second copy.
v1 = Path("scripts/tmp-voxy-f1-apply.py").read_text()
match = re.search(
    r'''test\.write_text\(dedent\('''\\\n(?P<body>.*?)\n'''\)\)\n\nworkflow =''',
    v1,
    flags=re.DOTALL,
)
if not match:
    raise SystemExit("staged F1 test body not found")
Path("apps/web/tests/voxy-language-variant-master-freshness.contract.test.ts").write_text(
    match.group("body") + "\n"
)

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
