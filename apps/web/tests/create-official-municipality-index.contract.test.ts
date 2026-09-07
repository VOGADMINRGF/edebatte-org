import { describe, expect, it } from "vitest";

import {
  buildOfficialRegionsFromDirectory,
  OFFICIAL_DIRECTORY_SOURCE_AS_OF,
  OFFICIAL_DIRECTORY_SOURCE_FILE,
} from "@features/region/directory";
import officialMunicipalityIndex from "@/features/create/generatedOfficialMunicipalityIndex.json";

describe("create official municipality index", () => {
  it("stays synchronized with the canonical official directory source", () => {
    const expectedEntries = buildOfficialRegionsFromDirectory()
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

    expect(officialMunicipalityIndex.sourceFile).toBe(
      OFFICIAL_DIRECTORY_SOURCE_FILE,
    );
    expect(officialMunicipalityIndex.sourceAsOf).toBe(
      OFFICIAL_DIRECTORY_SOURCE_AS_OF,
    );
    expect(officialMunicipalityIndex.entries).toEqual(expectedEntries);
  });
});
