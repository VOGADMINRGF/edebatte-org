import type { CreateCitizenIntakeContext } from "@/features/create/createContributionPackageContract";
import type { CreateRegionDirectoryEntry } from "@/features/create/createCitizenIntakeContext";
import officialMunicipalityIndex from "@/features/create/generatedOfficialMunicipalityIndex.json";
import {
  applyCreateJurisdictionConfirmation,
  applyCreateRegionPriority,
  buildCreateMunicipalJurisdictionCandidate,
  buildCreateJurisdictionCandidateKey,
  normalizeCreateMunicipalityLabel,
  resolveCreateCitizenIntakeContext,
} from "@/features/create/createCitizenIntakeContext";

let cachedOfficialDirectoryEntries: CreateRegionDirectoryEntry[] | null = null;
let cachedOfficialCandidateIndex: Map<
  string,
  CreateRegionDirectoryEntry[]
> | null = null;
let cachedOfficialPlaceIndex: {
  entriesByLabel: Map<string, CreateRegionDirectoryEntry[]>;
  entriesByShortLabel: Map<string, CreateRegionDirectoryEntry[]>;
  maxWords: number;
} | null = null;

function officialDirectoryEntries(): CreateRegionDirectoryEntry[] {
  if (cachedOfficialDirectoryEntries) return cachedOfficialDirectoryEntries;
  cachedOfficialDirectoryEntries = officialMunicipalityIndex.entries.map(
    (entry) => ({ ...entry }),
  );
  return cachedOfficialDirectoryEntries;
}

function officialCandidateIndex(): Map<string, CreateRegionDirectoryEntry[]> {
  if (cachedOfficialCandidateIndex) return cachedOfficialCandidateIndex;
  const index = new Map<string, CreateRegionDirectoryEntry[]>();
  for (const entry of officialDirectoryEntries()) {
    const city = normalizeCreateMunicipalityLabel(entry.municipalityName);
    const cityKey = city.toLocaleLowerCase("de");
    const selectedRegion = {
      id: entry.id,
      city,
      municipality: city,
      state: entry.state ?? null,
      country: entry.country ?? "DE",
      registryId: entry.registryId ?? null,
      matchType: "exact" as const,
      confidence: 0.96,
      reason: "Amtlicher Verzeichniseintrag.",
    };
    for (const traffic of [false, true]) {
      const key = buildCreateJurisdictionCandidateKey(
        buildCreateMunicipalJurisdictionCandidate({
          selectedRegion,
          traffic,
        }),
      );
      const current = index.get(key) ?? [];
      const samePlaceIndex = current.findIndex(
        (candidate) =>
          normalizeCreateMunicipalityLabel(
            candidate.municipalityName,
          ).toLocaleLowerCase("de") === cityKey &&
          String(candidate.state ?? "").toLocaleLowerCase("de") ===
            String(entry.state ?? "").toLocaleLowerCase("de") &&
          String(candidate.country ?? "DE").toUpperCase() ===
            String(entry.country ?? "DE").toUpperCase(),
      );
      if (samePlaceIndex < 0) {
        index.set(key, [...current, entry]);
      } else if (
        String(entry.registryId ?? "").length >
        String(current[samePlaceIndex]?.registryId ?? "").length
      ) {
        const next = [...current];
        next[samePlaceIndex] = entry;
        index.set(key, next);
      }
    }
  }
  cachedOfficialCandidateIndex = index;
  return index;
}

function normalizeOfficialPlaceSearchText(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function addOfficialPlaceIndexEntry(
  index: Map<string, CreateRegionDirectoryEntry[]>,
  label: string,
  entry: CreateRegionDirectoryEntry,
) {
  const entries = index.get(label) ?? [];
  if (!entries.some((candidate) => candidate.id === entry.id)) {
    index.set(label, [...entries, entry]);
  }
}

function officialPlaceIndex() {
  if (cachedOfficialPlaceIndex) return cachedOfficialPlaceIndex;
  const entriesByLabel = new Map<string, CreateRegionDirectoryEntry[]>();
  const entriesByShortLabel = new Map<string, CreateRegionDirectoryEntry[]>();
  let maxWords = 1;
  for (const entry of officialDirectoryEntries()) {
    const label = normalizeOfficialPlaceSearchText(
      normalizeCreateMunicipalityLabel(entry.municipalityName),
    );
    if (!label) continue;
    addOfficialPlaceIndexEntry(entriesByLabel, label, entry);
    const words = label.split(" ");
    maxWords = Math.max(maxWords, words.length);
    if (words.length > 1) {
      addOfficialPlaceIndexEntry(entriesByShortLabel, words[0]!, entry);
    }
  }
  cachedOfficialPlaceIndex = { entriesByLabel, entriesByShortLabel, maxWords };
  return cachedOfficialPlaceIndex;
}

export function prepareCreateOfficialDirectoryIndex(): void {
  officialPlaceIndex();
  officialCandidateIndex();
}

function findOfficialDirectoryEntries(text: string): CreateRegionDirectoryEntry[] {
  const index = officialPlaceIndex();
  const words = normalizeOfficialPlaceSearchText(text).split(" ").filter(Boolean);
  const matches = new Map<string, CreateRegionDirectoryEntry>();
  for (let start = 0; start < words.length; start += 1) {
    for (
      let length = 1;
      length <= index.maxWords && start + length <= words.length;
      length += 1
    ) {
      const label = words.slice(start, start + length).join(" ");
      for (const entry of index.entriesByLabel.get(label) ?? []) {
        matches.set(entry.id, entry);
      }
    }
  }

  const explicitShortMention = text.match(
    /(?:^|[.!?]\s+|\s)(?:In|in|Für|für|Aus|aus|Bei|bei)\s+([A-ZÄÖÜ][\p{L}().-]{2,})/u,
  )?.[1];
  if (explicitShortMention) {
    const shortLabel = normalizeOfficialPlaceSearchText(explicitShortMention);
    for (const entry of index.entriesByShortLabel.get(shortLabel) ?? []) {
      matches.set(entry.id, entry);
    }
  }

  return Array.from(matches.values());
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
    directoryEntries: findOfficialDirectoryEntries(input.text),
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

  const base = resolveCreateCitizenIntakeContext({
    text: input.sourceText,
    locale: input.locale,
    directoryEntries: [],
  });
  const directMatch = confirmFromContext(base, candidateKey);
  if (directMatch) return directMatch;

  const indexedEntries = officialCandidateIndex().get(candidateKey) ?? [];
  if (indexedEntries.length !== 1) return null;
  const officialEntry = indexedEntries[0]!;
  const contributionContext = resolveCreateCitizenIntakeContext({
    text: input.sourceText,
    locale: input.locale,
    directoryEntries: findOfficialDirectoryEntries(input.sourceText),
  });
  const contributionMatch = confirmFromContext(
    contributionContext,
    candidateKey,
  );
  if (contributionMatch) return contributionMatch;

  // An explicit place, federal scope, EU scope or ambiguous place in the
  // contribution always outranks any later profile-derived suggestion.
  if (
    contributionContext.regionSource === "contribution_text" ||
    base.regionStatus === "not_location_bound" ||
    contributionContext.detectedRegionLabels.length > 0
  ) {
    return null;
  }

  const confirmed = confirmFromContext(
    applyCreateRegionPriority(base, {
      confirmedRegion: normalizeCreateMunicipalityLabel(
        officialEntry.municipalityName,
      ),
    }),
    candidateKey,
  );
  return confirmed
    ? attachOfficialRegionIdentity(confirmed, officialEntry)
    : null;
}

// This module is imported while the Node route bundle initializes. The index
// is therefore ready before either Create request handler starts its deadline.
prepareCreateOfficialDirectoryIndex();
