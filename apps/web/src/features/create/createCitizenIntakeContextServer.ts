import {
  buildOfficialRegionsFromDirectory,
} from "@features/region";
import {
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
      authorityName: region.officialBody?.label ?? official.administrativeSeat ?? null,
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
