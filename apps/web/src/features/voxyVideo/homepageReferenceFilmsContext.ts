import type { VoxyHomepageReferenceFilmPlan } from "./homepageReferenceFilms";

const VOG_ELECTION_EVIDENCE_ID = "vog-election-calendar";
const VOG_EVERGREEN_EVIDENCE_ID = "vog-evergreen-impact-loop";
const VOG_ELECTION_SOURCE_IDS = new Set([
  "federal-election-calendar-2026",
  "berlin-election-2026-faq",
]);

export const VOXY_VOG_EVERGREEN_PRIMARY_EVIDENCE = {
  id: VOG_EVERGREEN_EVIDENCE_ID,
  type: "DEMOKRATISCHE WIRKUNG",
  title: "Stimme → Folge → Wirkung",
  shortSummary:
    "Zwischen Beteiligung und politischer Wirkung müssen Reaktion, Entscheidung, Umsetzung und Rückkopplung sichtbar bleiben.",
  sourceLabel: "VoiceOpenGov · demokratische Gestaltungsfrage",
  provenance: "REDAKTIONELLES ZIELBILD · KEINE PRODUKTFUNKTION",
  visualIdentity: "democracy-journey-cyan-impact-loop",
  visualPayload: { kind: "trend_line" as const },
  memoryPriority: 100,
} as const;

const replaceEvidenceId = (id: string | null): string | null =>
  id === VOG_ELECTION_EVIDENCE_ID ? VOG_EVERGREEN_EVIDENCE_ID : id;

export function contextualizeVoxyHomepageReferenceFilmPlan(
  plan: VoxyHomepageReferenceFilmPlan,
): VoxyHomepageReferenceFilmPlan {
  if (plan.filmId !== "voiceopengov" || plan.contextMode !== "evergreen") return plan;

  const evidence = plan.evidence.map((entry) =>
    entry.id === VOG_ELECTION_EVIDENCE_ID ? VOXY_VOG_EVERGREEN_PRIMARY_EVIDENCE : entry,
  );
  const visualStateTimeline = plan.visualStateTimeline.map((entry) => ({
    ...entry,
    activeEvidenceId: replaceEvidenceId(entry.activeEvidenceId),
    dockedEvidenceIds: entry.dockedEvidenceIds.map((id) => replaceEvidenceId(id)!),
  }));
  const evidenceTimeline = plan.evidenceTimeline.map((entry) => ({
    ...entry,
    evidenceId: replaceEvidenceId(entry.evidenceId)!,
    visualIdentity:
      entry.evidenceId === VOG_ELECTION_EVIDENCE_ID
        ? VOXY_VOG_EVERGREEN_PRIMARY_EVIDENCE.visualIdentity
        : entry.visualIdentity,
    ...("relatedEvidenceIds" in entry && entry.relatedEvidenceIds
      ? { relatedEvidenceIds: entry.relatedEvidenceIds.map((id) => replaceEvidenceId(id)!) }
      : {}),
  }));
  const motionTimeline = plan.motionTimeline.map((entry) => ({
    ...entry,
    activeEvidenceId: replaceEvidenceId(entry.activeEvidenceId),
    semanticPurpose: entry.semanticPurpose.replaceAll(
      VOG_ELECTION_EVIDENCE_ID,
      VOG_EVERGREEN_EVIDENCE_ID,
    ),
  }));
  const sources = plan.sources.filter((source) => !VOG_ELECTION_SOURCE_IDS.has(source.id));

  return {
    ...plan,
    broadcastMeta: {
      ...plan.broadcastMeta,
      displayDate: "ZWISCHEN DEN WAHLEN",
    },
    evidence,
    visualStateTimeline,
    evidenceTimeline,
    motionTimeline,
    sources,
  } as unknown as VoxyHomepageReferenceFilmPlan;
}

export function validateVoxyHomepageContextIsolation(
  plan: VoxyHomepageReferenceFilmPlan,
): string[] {
  if (plan.filmId !== "voiceopengov" || plan.contextMode !== "evergreen") return [];

  const errors: string[] = [];
  const serialized = JSON.stringify({
    broadcastMeta: plan.broadcastMeta,
    evidence: plan.evidence,
    visualStateTimeline: plan.visualStateTimeline,
    evidenceTimeline: plan.evidenceTimeline,
    motionTimeline: plan.motionTimeline,
    sources: plan.sources,
  });

  if (
    serialized.includes(VOG_ELECTION_EVIDENCE_ID) ||
    serialized.includes("WAHLTERMINE 2026") ||
    serialized.includes("Vier Termine im September") ||
    serialized.includes("SEPTEMBER 2026") ||
    serialized.includes("Bundeswahlleiterin") ||
    serialized.includes("Landeswahlleiterin")
  ) {
    errors.push("evergreen_election_evidence_leak");
  }
  if (!plan.evidence.some((entry) => entry.id === VOG_EVERGREEN_EVIDENCE_ID)) {
    errors.push("evergreen_primary_evidence_missing");
  }
  if (
    plan.sources.some((source) => VOG_ELECTION_SOURCE_IDS.has(source.id))
  ) {
    errors.push("evergreen_election_source_leak");
  }

  return errors;
}
