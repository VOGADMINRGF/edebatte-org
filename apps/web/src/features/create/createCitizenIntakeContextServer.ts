import { buildOfficialRegionsFromDirectory } from "@features/region/directory";
import type { CreateCitizenIntakeContext } from "@/features/create/createContributionPackageContract";
import type { CreateRegionDirectoryEntry } from "@/features/create/createCitizenIntakeContext";
import {
  applyCreateJurisdictionConfirmation,
  applyCreateRegionPriority,
  buildCreateJurisdictionCandidateKey,
  resolveCreateCitizenIntakeContext,
} from "@/features/create/createCitizenIntakeContext";

let cachedOfficialDirectoryEntries: CreateRegionDirectoryEntry[] | null = null;

function officialDirectoryEntries(): CreateRegionDirectoryEntry[] {
  if (cachedOfficialDirectoryEntries) return cachedOfficialDirectoryEntries;
  cachedOfficialDirectoryEntries = buildOfficialRegionsFromDirectory()
    .filter((region) => Boolean(region.officialDirectoryEntry))
    .map((region) => ({
      id: region.id,
      municipalityName: region.name,
      state: region.federalState,
      country: region.country,
      registryId:
        region.officialDirectoryEntry?.ags ??
        region.officialDirectoryEntry?.ars ??
        null,
      authorityName: region.officialBody?.label ?? null,
    }));
  return cachedOfficialDirectoryEntries;
}

function attachOfficialRegionIdentity(
  context: CreateCitizenIntakeContext,
  entry: CreateRegionDirectoryEntry,
): CreateCitizenIntakeContext {
  const selectedCandidate = context.placeResolution.selectedCandidate;
  if (!selectedCandidate) return context;
  return {
    ...context,
    regionHierarchy: [
      selectedCandidate.city,
      entry.state ?? "",
      entry.country ?? "DE",
    ].filter(Boolean),
    placeResolution: {
      ...context.placeResolution,
      selectedCandidate: {
        ...selectedCandidate,
        id: entry.id,
        registryId: entry.registryId ?? null,
        state: entry.state ?? null,
        country: entry.country ?? "DE",
      },
      candidates: context.placeResolution.candidates.map((candidate) =>
        candidate === selectedCandidate
          ? {
              ...candidate,
              id: entry.id,
              registryId: entry.registryId ?? null,
              state: entry.state ?? null,
              country: entry.country ?? "DE",
            }
          : candidate,
      ),
    },
  };
}

export function resolveCreateCitizenIntakeContextFromOfficialDirectory(input: {
  text: string;
  locale?: string | null;
}) {
  return resolveCreateCitizenIntakeContext({
    text: input.text,
    locale: input.locale,
    directoryEntries: officialDirectoryEntries(),
  });
}

function confirmFromContext(
  context: CreateCitizenIntakeContext,
  candidateKey: string,
) {
  const candidate = context.jurisdictionCandidates.find(
    (entry) => buildCreateJurisdictionCandidateKey(entry) === candidateKey,
  );
  if (!candidate || candidate.level === "unknown") return null;
  const confirmed = applyCreateJurisdictionConfirmation(context, candidateKey);
  return confirmed.jurisdictionConfirmation.status === "confirmed"
    ? confirmed
    : null;
}

/**
 * Resolves a client-provided key exclusively against server-owned candidate
 * sources. A trusted orchestration result may be supplied for guest adoption;
 * otherwise the canonical official directory is used. Free-form authority
 * labels are never accepted as confirmation evidence.
 */
export function validateCreateJurisdictionConfirmation(input: {
  sourceText: string;
  candidateKey: string;
  locale?: string | null;
  trustedContext?: CreateCitizenIntakeContext | null;
}): CreateCitizenIntakeContext | null {
  const candidateKey = String(input.candidateKey ?? "").trim();
  if (!candidateKey || candidateKey.length > 240) return null;

  if (input.trustedContext) {
    return confirmFromContext(input.trustedContext, candidateKey);
  }

  const base = resolveCreateCitizenIntakeContextFromOfficialDirectory({
    text: input.sourceText,
    locale: input.locale,
  });
  const directMatch = confirmFromContext(base, candidateKey);
  if (directMatch) return directMatch;

  // An explicit place, federal scope, EU scope or ambiguous place in the
  // contribution always outranks any later profile-derived suggestion.
  if (
    base.regionSource === "contribution_text" ||
    base.regionStatus === "not_location_bound" ||
    base.detectedRegionLabels.length > 0
  ) {
    return null;
  }

  const matches = officialDirectoryEntries()
    .map((entry) => {
      const confirmed = confirmFromContext(
        applyCreateRegionPriority(base, {
          confirmedRegion: entry.municipalityName,
        }),
        candidateKey,
      );
      return confirmed ? attachOfficialRegionIdentity(confirmed, entry) : null;
    })
    .filter((context): context is CreateCitizenIntakeContext => Boolean(context));

  // Duplicate official place names remain ambiguous and must be clarified.
  return matches.length === 1 ? matches[0] : null;
}
