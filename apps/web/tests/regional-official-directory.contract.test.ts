import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  OFFICIAL_DIRECTORY_SOURCE_FILE,
  buildOperationalRegionCatalog,
  buildOfficialRegionalActorsFromDirectory,
  buildOfficialRegionsFromDirectory,
  getDirectorySourceStatus,
  getOperationalRegionCatalog,
  importOfficialDirectoryFromXlsx,
  listOfficialMunicipalDirectoryEntries,
  resolveOperationalRegion,
  searchOperationalRegions,
  summarizeOfficialAdministrativeDirectory,
  type Region,
} from "@features/region";

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [Array.from(values)];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidateIndex) => candidateIndex !== index)).map(
      (remaining) => [value, ...remaining],
    ),
  );
}

describe("regional official directory contract", () => {
  it("covers the essential municipal and administrative layers from the official directory", () => {
    const entries = listOfficialMunicipalDirectoryEntries();
    const summary = summarizeOfficialAdministrativeDirectory();
    const summaryTypes = new Set(summary.map((entry) => entry.administrativeUnitType));

    expect(entries.length).toBeGreaterThan(13000);
    expect(summaryTypes.has("kreisfreie_stadt")).toBe(true);
    expect(summaryTypes.has("landkreis")).toBe(true);
    expect(summaryTypes.has("amt")).toBe(true);
    expect(summaryTypes.has("kreisangehoerige_gemeinde")).toBe(true);
    expect(summaryTypes.has("verbandsgemeinde")).toBe(true);
  });

  it("maps official rows into verortbare regions and administrative actors", () => {
    const regions = buildOfficialRegionsFromDirectory();
    const actors = buildOfficialRegionalActorsFromDirectory();

    const flensburgRegion = regions.find((region) => region.officialDirectoryEntry?.ags === "01001000");
    const amtRegion = regions.find((region) => region.officialDirectoryEntry?.ars === "010515163");
    const flensburgActor = actors.find((actor) => actor.officialDirectoryEntry?.ags === "01001000");

    expect(flensburgRegion).toMatchObject({
      type: "kommune",
      administrativeUnitType: "kreisfreie_stadt",
      publicVisibility: "public",
    });
    expect(amtRegion).toMatchObject({
      type: "region",
      administrativeUnitType: "amt",
    });
    expect(flensburgActor).toMatchObject({
      actorType: "verwaltung",
      sourceKind: "official_directory",
      verificationStatus: "verified",
    });
  });

  it("builds the complete operational catalog with deterministic unique slugs", () => {
    const officialRegions = buildOfficialRegionsFromDirectory();
    const catalog = getOperationalRegionCatalog();

    expect(officialRegions).toHaveLength(12401);
    expect(new Set(officialRegions.map((region) => region.slug)).size).toBe(
      officialRegions.length,
    );
    expect(catalog.regions).toHaveLength(12408);
    expect(catalog.aliases).toHaveLength(12408);
    expect(catalog.regions).not.toHaveLength(7);
    expect(new Set(catalog.regions.map((region) => region.slug)).size).toBe(
      catalog.regions.length,
    );
    expect(catalog.sources.officialDirectory).toMatchObject({
      status: "ready",
      recordCount: 13339,
      errorCode: null,
    });
  });

  it("resolves Hamburg through every supported stable identifier", () => {
    const catalog = getOperationalRegionCatalog();
    const officialHamburgId = "region-official-02000000";

    expect(resolveOperationalRegion(catalog, "Hamburg")).toMatchObject({
      id: "region-land-02",
      name: "Hamburg",
      type: "land",
    });
    for (const query of [
      "02000000",
      "020000000000",
      officialHamburgId,
      "hamburg-freie-und-hansestadt-02000000",
      "Senat der Freien und Hansestadt Hamburg",
    ]) {
      expect(resolveOperationalRegion(catalog, query)).toMatchObject({
        id: officialHamburgId,
        officialDirectoryEntry: {
          ags: "02000000",
          ars: "020000000000",
        },
      });
    }
  });

  it("keeps ambiguous names separate instead of resolving them heuristically", () => {
    const sourceStatus = getDirectorySourceStatus();
    const fixtureTemplate = getOperationalRegionCatalog().regions.find(
      (region) => region.id === "kommune-beispielstadt",
    );
    expect(fixtureTemplate).toBeTruthy();

    const sameNameRegions = [
      {
        ...fixtureTemplate!,
        id: "same-name-a",
        slug: "neustadt",
        name: "Neustadt",
      },
      {
        ...fixtureTemplate!,
        id: "same-name-b",
        slug: "neustadt",
        name: "Neustadt",
      },
    ] satisfies Region[];
    const catalog = buildOperationalRegionCatalog({
      registryRegions: [],
      directoryRegions: [],
      fixtureRegions: sameNameRegions,
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: sourceStatus.officialDirectory,
    });

    expect(catalog.regions).toHaveLength(2);
    expect(new Set(catalog.regions.map((region) => region.slug)).size).toBe(2);
    expect(resolveOperationalRegion(catalog, "Neustadt")).toBeNull();
    expect(resolveOperationalRegion(catalog, "same-name-a")?.id).toBe(
      "same-name-a",
    );
  });

  it("forms one transitive identity component for every bridge permutation", () => {
    const sourceStatus = getDirectorySourceStatus();
    const template = getOperationalRegionCatalog().regions.find(
      (region) => region.id === "region-official-02000000",
    );
    expect(template?.officialDirectoryEntry).toBeTruthy();

    const candidates = [
      {
        ...template!,
        id: "component-a",
        slug: "component-a",
        name: "Komponente A",
        officialDirectoryEntry: {
          ...template!.officialDirectoryEntry!,
          ags: "1",
          ars: null,
        },
      },
      {
        ...template!,
        id: "component-b",
        slug: "component-b",
        name: "Komponente B",
        officialDirectoryEntry: {
          ...template!.officialDirectoryEntry!,
          ags: null,
          ars: "2",
        },
      },
      {
        ...template!,
        id: "component-c",
        slug: "component-c",
        name: "Komponente C",
        officialDirectoryEntry: {
          ...template!.officialDirectoryEntry!,
          ags: "1",
          ars: "2",
        },
      },
    ] satisfies Region[];

    const projections = permutations(candidates).map((fixtureRegions) => {
      const catalog = buildOperationalRegionCatalog({
        registryRegions: [],
        directoryRegions: [],
        fixtureRegions,
        regionRegistryStatus: sourceStatus.regionRegistry,
        officialDirectoryStatus: sourceStatus.officialDirectory,
      });
      expect(catalog.regions).toHaveLength(1);
      expect(catalog.regions[0].id).toBe("component-a");
      expect(catalog.aliases[0]).toMatchObject({
        regionId: "component-a",
        ids: ["component-a", "component-b", "component-c"],
        ags: ["1"],
        ars: ["2"],
      });
      for (const query of ["component-b", "component-c", "1", "2"]) {
        expect(resolveOperationalRegion(catalog, query)?.id).toBe("component-a");
      }
      return {
        regions: catalog.regions.map(({ id, slug, name }) => ({ id, slug, name })),
        aliases: catalog.aliases,
      };
    });

    expect(projections).toHaveLength(6);
    projections.forEach((projection) => expect(projection).toEqual(projections[0]));

    const bridgeArrivesLast = buildOperationalRegionCatalog({
      registryRegions: [],
      directoryRegions: [],
      fixtureRegions: [candidates[0], candidates[1], candidates[2]],
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: sourceStatus.officialDirectory,
    });
    expect(bridgeArrivesLast.regions).toHaveLength(1);
  });

  it("applies Registry before Directory before Fixture for stable identities", () => {
    const sourceStatus = getDirectorySourceStatus();
    const directoryHamburg = getOperationalRegionCatalog().regions.find(
      (region) => region.id === "region-official-02000000",
    );
    expect(directoryHamburg).toBeTruthy();

    const registryRegion = {
      ...directoryHamburg!,
      id: "registry-hamburg",
      slug: "registry-hamburg",
      name: "Hamburg aus Registry",
    } satisfies Region;
    const directoryRegion = {
      ...directoryHamburg!,
      id: "directory-hamburg",
      slug: "directory-hamburg",
      name: "Hamburg aus Directory",
    } satisfies Region;
    const fixtureRegion = {
      ...directoryHamburg!,
      id: "fixture-hamburg",
      slug: "fixture-hamburg",
      name: "Hamburg aus Fixture",
    } satisfies Region;
    const catalog = buildOperationalRegionCatalog({
      registryRegions: [registryRegion],
      directoryRegions: [directoryRegion],
      fixtureRegions: [fixtureRegion],
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: sourceStatus.officialDirectory,
    });

    expect(catalog.regions).toHaveLength(1);
    expect(catalog.regions[0]).toMatchObject({
      id: "registry-hamburg",
      name: "Hamburg aus Registry",
    });
    expect(resolveOperationalRegion(catalog, "directory-hamburg")?.id).toBe(
      "registry-hamburg",
    );
    expect(resolveOperationalRegion(catalog, "fixture-hamburg")?.id).toBe(
      "registry-hamburg",
    );

    const sourceOrderCandidates = {
      registry: [
        registryRegion,
        { ...registryRegion, id: "registry-z", slug: "registry-z" },
      ],
      directory: [
        directoryRegion,
        { ...directoryRegion, id: "directory-z", slug: "directory-z" },
      ],
      fixture: [
        fixtureRegion,
        { ...fixtureRegion, id: "fixture-z", slug: "fixture-z" },
      ],
    };
    const buildWithOrder = (reverse: boolean) =>
      buildOperationalRegionCatalog({
        registryRegions: reverse
          ? [...sourceOrderCandidates.registry].reverse()
          : sourceOrderCandidates.registry,
        directoryRegions: reverse
          ? [...sourceOrderCandidates.directory].reverse()
          : sourceOrderCandidates.directory,
        fixtureRegions: reverse
          ? [...sourceOrderCandidates.fixture].reverse()
          : sourceOrderCandidates.fixture,
        regionRegistryStatus: sourceStatus.regionRegistry,
        officialDirectoryStatus: sourceStatus.officialDirectory,
      });
    expect(buildWithOrder(true)).toEqual(buildWithOrder(false));
    expect(buildWithOrder(true).regions[0].id).toBe("registry-hamburg");

    const transitiveIdentityCatalog = buildOperationalRegionCatalog({
      registryRegions: [
        {
          ...registryRegion,
          id: "shared-hamburg-id",
          officialDirectoryEntry: null,
        },
      ],
      directoryRegions: [
        {
          ...directoryRegion,
          id: "shared-hamburg-id",
        },
      ],
      fixtureRegions: [fixtureRegion],
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: sourceStatus.officialDirectory,
    });
    expect(transitiveIdentityCatalog.regions).toHaveLength(1);
    expect(transitiveIdentityCatalog.regions[0]?.id).toBe("shared-hamburg-id");

    const withoutRegistry = buildOperationalRegionCatalog({
      registryRegions: [],
      directoryRegions: [directoryRegion],
      fixtureRegions: [fixtureRegion],
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: sourceStatus.officialDirectory,
    });
    expect(withoutRegistry.regions).toHaveLength(1);
    expect(withoutRegistry.regions[0]?.id).toBe("directory-hamburg");

    const fixtureOnly = buildOperationalRegionCatalog({
      registryRegions: [],
      directoryRegions: [],
      fixtureRegions: [fixtureRegion],
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: sourceStatus.officialDirectory,
    });
    expect(fixtureOnly.regions).toHaveLength(1);
    expect(fixtureOnly.regions[0]?.id).toBe("fixture-hamburg");
  });

  it("returns deterministic bounded server-side search results", () => {
    const catalog = getOperationalRegionCatalog();
    const empty = searchOperationalRegions(catalog, "");
    const broad = searchOperationalRegions(catalog, "a");
    const byAgs = searchOperationalRegions(catalog, "02000000");
    const byArs = searchOperationalRegions(catalog, "020000000000");
    const byName = searchOperationalRegions(catalog, "Hamburg");

    expect(empty).toMatchObject({ totalMatches: 0, results: [] });
    expect(broad.results.length).toBeLessThanOrEqual(40);
    expect(broad.truncated).toBe(true);
    expect(new Set(broad.results.map(({ region }) => region.id)).size).toBe(
      broad.results.length,
    );
    for (const result of [byAgs, byArs]) {
      expect(result.results[0]).toMatchObject({
        matchKind: "exact_identity",
        region: {
          id: "region-official-02000000",
        },
      });
    }
    expect(
      byName.results.some(({ region }) => region.name.includes("Hamburg")),
    ).toBe(true);
    expect(searchOperationalRegions(catalog, "Hamburg")).toEqual(byName);
  });

  it("retries missing and failed directory imports, then keeps success stable", () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "edebatte-region-directory-"),
    );
    const sourcePath = path.resolve(
      process.cwd(),
      "public",
      "Listen",
      OFFICIAL_DIRECTORY_SOURCE_FILE,
    );
    const missingThenReadyPath = path.join(tempDirectory, "missing-then-ready.xlsx");
    const errorThenReadyPath = path.join(tempDirectory, "error-then-ready.xlsx");

    try {
      const missing = importOfficialDirectoryFromXlsx({
        filePath: missingThenReadyPath,
        cacheKey: "test-missing-then-ready",
        now: 1_000,
        failureRetryAfterMs: 1_000,
      });
      fs.copyFileSync(sourcePath, missingThenReadyPath);
      const stillMissingDuringCooldown = importOfficialDirectoryFromXlsx({
        filePath: missingThenReadyPath,
        cacheKey: "test-missing-then-ready",
        now: 1_500,
        failureRetryAfterMs: 1_000,
      });
      const recoveredMissing = importOfficialDirectoryFromXlsx({
        filePath: missingThenReadyPath,
        cacheKey: "test-missing-then-ready",
        now: 2_000,
        failureRetryAfterMs: 1_000,
      });
      const reusedRecoveredImport = importOfficialDirectoryFromXlsx({
        filePath: missingThenReadyPath,
        cacheKey: "test-missing-then-ready",
        now: 50_000,
        failureRetryAfterMs: 1_000,
      });

      expect(missing.status.status).toBe("missing");
      expect(stillMissingDuringCooldown).toBe(missing);
      expect(recoveredMissing.status.status).toBe("ready");
      expect(recoveredMissing.status.recordCount).toBeGreaterThan(13_000);
      expect(reusedRecoveredImport).toBe(recoveredMissing);

      fs.copyFileSync(path.resolve(process.cwd(), "package.json"), errorThenReadyPath);
      const failed = importOfficialDirectoryFromXlsx({
        filePath: errorThenReadyPath,
        cacheKey: "test-error-then-ready",
        now: 10_000,
        failureRetryAfterMs: 1_000,
      });
      fs.copyFileSync(sourcePath, errorThenReadyPath);
      const stillFailedDuringCooldown = importOfficialDirectoryFromXlsx({
        filePath: errorThenReadyPath,
        cacheKey: "test-error-then-ready",
        now: 10_500,
        failureRetryAfterMs: 1_000,
      });
      const recoveredError = importOfficialDirectoryFromXlsx({
        filePath: errorThenReadyPath,
        cacheKey: "test-error-then-ready",
        now: 11_000,
        failureRetryAfterMs: 1_000,
      });

      expect(failed.status.status).toBe("error");
      expect(stillFailedDuringCooldown).toBe(failed);
      expect(recoveredError.status.status).toBe("ready");
      expect(recoveredError.status.errorCode).toBeNull();
    } finally {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it("keeps Registry and fixtures available while reporting missing or failed XLSX sources", () => {
    const sourceStatus = getDirectorySourceStatus();
    const fallbackRegion = getOperationalRegionCatalog().regions.find(
      (region) => region.id === "kommune-beispielstadt",
    );
    expect(fallbackRegion).toBeTruthy();

    const missing = importOfficialDirectoryFromXlsx({
      filePath: path.resolve(process.cwd(), "does-not-exist.xlsx"),
    });
    const failed = importOfficialDirectoryFromXlsx({
      filePath: path.resolve(process.cwd(), "package.json"),
    });
    const fallbackCatalog = buildOperationalRegionCatalog({
      registryRegions: [fallbackRegion!],
      directoryRegions: missing.derivedRegions,
      fixtureRegions: [
        {
          ...fallbackRegion!,
          id: "fixture-fallback",
          slug: "fixture-fallback",
        },
      ],
      regionRegistryStatus: sourceStatus.regionRegistry,
      officialDirectoryStatus: missing.status,
    });

    expect(missing.status).toMatchObject({
      status: "missing",
      recordCount: 0,
      errorCode: "official_directory_not_found",
    });
    expect(failed.status.status).toBe("error");
    expect(failed.status.errorCode).toContain("official_directory_sheet_missing");
    expect(fallbackCatalog.regions).toHaveLength(2);
    expect(fallbackCatalog.sources.officialDirectory.status).toBe("missing");
  });
});
