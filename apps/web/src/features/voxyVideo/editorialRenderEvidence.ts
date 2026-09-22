import type { VoxyEditorialStoryPlan } from "./editorialStoryPlan";
import type { VoxyStudioEvidenceSnapshot } from "./studioEvidenceReview";

export const VOXY_EDITORIAL_RENDER_EVIDENCE_VERSION =
  "voxy-editorial-render-evidence-v1" as const;

export type VoxyEditorialRenderEvidenceSource = {
  sourceId: string;
  title: string;
  url: string;
  publisher: string | null;
  sourceType: string;
  language: string | null;
};

export type VoxyEditorialRenderEvidenceProjection = {
  version: typeof VOXY_EDITORIAL_RENDER_EVIDENCE_VERSION;
  sourcePackId: string;
  sources: VoxyEditorialRenderEvidenceSource[];
};

export type VoxyEditorialRenderableStoryPlan = VoxyEditorialStoryPlan & {
  renderEvidenceProjection: VoxyEditorialRenderEvidenceProjection;
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function validHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function referencedSourceIds(plan: VoxyEditorialStoryPlan): string[] {
  return Array.from(
    new Set(
      plan.chapters.flatMap((chapter) => [
        ...chapter.sourceIds,
        ...chapter.evidenceWindow.sourceIds,
        ...chapter.consequences.flatMap((consequence) => consequence.sourceIds),
      ]),
    ),
  )
    .map(normalized)
    .filter(Boolean)
    .sort();
}

export function buildVoxyEditorialRenderableStoryPlan(input: {
  plan: VoxyEditorialStoryPlan;
  sourcePackId: string;
  sources: VoxyStudioEvidenceSnapshot["sources"];
}): VoxyEditorialRenderableStoryPlan {
  const sourcePackId = normalized(input.sourcePackId);
  if (!sourcePackId) {
    throw new Error("voxy_editorial_render_evidence_source_pack_missing");
  }
  if (!Array.isArray(input.sources)) {
    throw new Error("voxy_editorial_render_evidence_sources_missing");
  }

  const byId = new Map<string, VoxyStudioEvidenceSnapshot["sources"][number]>();
  for (const source of input.sources) {
    const sourceId = normalized(source.sourceId);
    if (!sourceId || byId.has(sourceId)) {
      throw new Error(
        `voxy_editorial_render_evidence_source_invalid_or_duplicate:${sourceId || "missing"}`,
      );
    }
    byId.set(sourceId, source);
  }

  const sources = referencedSourceIds(input.plan).map((sourceId) => {
    const source = byId.get(sourceId);
    if (!source) {
      throw new Error(`voxy_editorial_render_evidence_source_missing:${sourceId}`);
    }
    const title = normalized(source.title);
    const url = normalized(source.url);
    const publisher = normalized(source.publisher) || null;
    const sourceType = normalized(source.type);
    const language = normalized(source.language) || null;
    if (!title) {
      throw new Error(`voxy_editorial_render_evidence_title_missing:${sourceId}`);
    }
    if (!url || !validHttpUrl(url)) {
      throw new Error(`voxy_editorial_render_evidence_url_invalid:${sourceId}`);
    }
    if (!sourceType) {
      throw new Error(`voxy_editorial_render_evidence_type_missing:${sourceId}`);
    }
    return {
      sourceId,
      title,
      url,
      publisher,
      sourceType,
      language,
    };
  });

  return {
    ...input.plan,
    renderEvidenceProjection: {
      version: VOXY_EDITORIAL_RENDER_EVIDENCE_VERSION,
      sourcePackId,
      sources,
    },
  };
}

export function readVoxyEditorialRenderEvidenceProjection(
  plan: VoxyEditorialStoryPlan,
): VoxyEditorialRenderEvidenceProjection | null {
  const candidate = (plan as Partial<VoxyEditorialRenderableStoryPlan>)
    .renderEvidenceProjection;
  if (!candidate) return null;
  if (
    candidate.version !== VOXY_EDITORIAL_RENDER_EVIDENCE_VERSION ||
    !normalized(candidate.sourcePackId) ||
    !Array.isArray(candidate.sources)
  ) {
    return null;
  }
  return candidate;
}
