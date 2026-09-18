// @repository-integrity-classification: adapter

import {
  buildOfficialRegionsFromDirectory,
} from "@features/region";
import type { CreateCitizenIntakeContext } from "@/features/create/createContributionPackageContract";
import {
  applyCreateJurisdictionConfirmation,
  applyCreateRegionPriority,
  buildCreateJurisdictionCandidate,
  buildCreateJurisdictionCandidateKey,
  hasCreateExplicitPlaceMention,
  normalizeCreateMunicipalityLabel,
  resolveCreateCitizenIntakeContext,
  type CreateRegionDirectoryEntry,
} from "@/features/create/createCitizenIntakeContext";

type OfficialPlaceIndex = {
  entriesByLabel: Map<string, CreateRegionDirectoryEntry[]>;
  entriesByShortLabel: Map<string, CreateRegionDirectoryEntry[]>;
  maxWords: number;
};

let cachedOfficialPlaceIndex: OfficialPlaceIndex | null = null;

function normalizeOfficialPlaceSearchText(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function addIndexEntry(
  index: Map<string, CreateRegionDirectoryEntry[]>,
  label: string,
  entry: CreateRegionDirectoryEntry,
) {
  const current = index.get(label) ?? [];
  if (!current.some((candidate) => candidate.id === entry.id)) {
    index.set(label, [...current, entry]);
  }
}

function officialPlaceIndex(): OfficialPlaceIndex {
  if (cachedOfficialPlaceIndex) return cachedOfficialPlaceIndex;

  const entriesByLabel = new Map<string, CreateRegionDirectoryEntry[]>();
  const entriesByShortLabel = new Map<string, CreateRegionDirectoryEntry[]>();
  let maxWords = 1;

  for (const region of buildOfficialRegionsFromDirectory()) {
    const official = region.officialDirectoryEntry;
    if (!official) continue;

    const municipalityName = official.municipalityName;
    const label = normalizeOfficialPlaceSearchText(
      normalizeCreateMunicipalityLabel(municipalityName),
    );
    if (!label) continue;

    const entry: CreateRegionDirectoryEntry = {
      id: region.id,
      municipalityName,
      state: region.federalState ?? null,
      country: region.country ?? "DE",
      registryId: official.ags ?? official.ars ?? null,
      authorityName:
        region.officialBody?.label ?? official.administrativeSeat ?? null,
      administrativeUnitType:
        region.administrativeUnitType ?? official.administrativeUnitType ?? null,
      rawAdministrativeUnitLabel: official.rawAdministrativeUnitLabel ?? null,
      administrativeSeat: official.administrativeSeat ?? null,
    };

    addIndexEntry(entriesByLabel, label, entry);
    const words = label.split(" ");
    maxWords = Math.max(maxWords, words.length);
    if (words.length > 1) {
      addIndexEntry(entriesByShortLabel, words[0]!, entry);
    }
  }

  cachedOfficialPlaceIndex = { entriesByLabel, entriesByShortLabel, maxWords };
  return cachedOfficialPlaceIndex;
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

  return Array.from(matches.values()).filter((entry) => {
    const label = normalizeCreateMunicipalityLabel(entry.municipalityName);
    return (
      hasCreateExplicitPlaceMention(text, label) ||
      (explicitShortMention !== undefined &&
        label.toLocaleLowerCase("de").startsWith(
          `${explicitShortMention.toLocaleLowerCase("de")} `,
        ))
    );
  });
}

function findUniqueOfficialEntryByLabel(
  label: string | null | undefined,
): CreateRegionDirectoryEntry | null {
  const normalized = normalizeOfficialPlaceSearchText(String(label ?? ""));
  if (!normalized) return null;
  const entries = officialPlaceIndex().entriesByLabel.get(normalized) ?? [];
  return entries.length === 1 ? entries[0]! : null;
}

function attachOfficialProfileIdentity(
  context: CreateCitizenIntakeContext,
  entry: CreateRegionDirectoryEntry,
): CreateCitizenIntakeContext {
  const selected = context.placeResolution.selectedCandidate;
  if (!selected) return context;
  const enriched = {
    ...selected,
    id: entry.id,
    registryId: entry.registryId ?? null,
    state: entry.state ?? null,
    country: entry.country ?? "DE",
    administrativeUnitType: entry.administrativeUnitType ?? null,
    rawAdministrativeUnitLabel: entry.rawAdministrativeUnitLabel ?? null,
    administrativeSeat: entry.administrativeSeat ?? null,
    authorityName: entry.authorityName ?? null,
  };
  const traffic =
    /\b(tempo|verkehr|straße|strasse|radweg|gehweg|parken)\b/iu.test(
      context.placeResolution.normalizedInput,
    );
  const jurisdictionCandidates = [
    buildCreateJurisdictionCandidate({ selectedRegion: enriched, traffic }),
  ];
  const jurisdictionConfirmation = {
    status: "unconfirmed" as const,
    candidateKey: null,
  };
  return {
    ...context,
    regionHierarchy: [
      enriched.city,
      enriched.state ?? "",
      enriched.country ?? "",
    ].filter(Boolean),
    jurisdictionCandidates,
    jurisdictionConfirmation,
    placeResolution: {
      ...context.placeResolution,
      selectedCandidate: enriched,
      candidates: context.placeResolution.candidates.map((candidate) =>
        candidate === selected ? enriched : candidate,
      ),
      jurisdictionCandidates,
      jurisdictionConfirmation,
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

export function resolveCreateCitizenIntakeContextForServer(input: {
  text: string;
  locale?: string | null;
  profileRegion?: string | null;
}): CreateCitizenIntakeContext {
  const contributionContext =
    resolveCreateCitizenIntakeContextFromOfficialDirectory(input);
  if (
    contributionContext.regionSource === "contribution_text" ||
    contributionContext.regionStatus === "not_location_bound" ||
    !String(input.profileRegion ?? "").trim()
  ) {
    return contributionContext;
  }

  const withProfile = applyCreateRegionPriority(contributionContext, {
    profileRegion: input.profileRegion,
  });
  const officialProfile = findUniqueOfficialEntryByLabel(input.profileRegion);
  return officialProfile
    ? attachOfficialProfileIdentity(withProfile, officialProfile)
    : withProfile;
}

export function validateCreateJurisdictionConfirmation(input: {
  sourceText: string;
  candidateKey: string;
  locale?: string | null;
  profileRegion?: string | null;
}): CreateCitizenIntakeContext | null {
  const candidateKey = String(input.candidateKey ?? "").trim();
  if (!candidateKey || candidateKey.length > 240) return null;

  const context = resolveCreateCitizenIntakeContextForServer({
    text: input.sourceText,
    locale: input.locale,
    profileRegion: input.profileRegion,
  });
  const candidate = context.jurisdictionCandidates.find(
    (entry) =>
      entry.level !== "unknown" &&
      buildCreateJurisdictionCandidateKey(entry) === candidateKey,
  );
  if (!candidate) return null;

  const confirmed = applyCreateJurisdictionConfirmation(context, candidateKey);
  return confirmed.jurisdictionConfirmation.status === "confirmed"
    ? confirmed
    : null;
}
