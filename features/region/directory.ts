import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  normalizeAdministrativeUnitType,
  parseRegion,
  parseOfficialDirectoryEntry,
  type AdministrativeUnitType,
  type OfficialDirectoryEntry,
  type Region,
  type RegionOfficialBody,
  type RegionType,
  type RegionalActor,
} from "./contracts";

export const OFFICIAL_DIRECTORY_SOURCE_FILE =
  "Anschriften_der_Gemeinde_und_Stadtverwaltungen_Stand_31012023_final.xlsx";
export const OFFICIAL_DIRECTORY_SHEET = "Anschriften_31_01_2023";
export const OFFICIAL_DIRECTORY_SOURCE_AS_OF = "2023-01-31";
export const REGION_REGISTRY_SOURCE_FILE = "RegionRegistry.snapshot.json";

export type DirectorySourceState = "ready" | "missing" | "error";

export type DirectorySourceStatus = {
  sourceKey: "region_registry" | "official_directory";
  label: string;
  sourceFile: string;
  sourcePath: string | null;
  sourceAsOf: string | null;
  status: DirectorySourceState;
  isConnected: boolean;
  recordCount: number;
  message: string;
  errorCode: string | null;
};

export type OfficialDirectoryImport = {
  status: DirectorySourceStatus;
  entries: OfficialDirectoryEntry[];
  summary: Array<{ administrativeUnitType: AdministrativeUnitType; count: number }>;
  derivedRegions: Region[];
  derivedActors: RegionalActor[];
};

export type RegionRegistryImport = {
  status: DirectorySourceStatus;
  regions: Region[];
};

type RegionRegistrySnapshotDocument = {
  sourceFile?: string | null;
  sourceAsOf?: string | null;
  items?: unknown[];
  regions?: unknown[];
};

type DirectoryWorkbookRow = {
  landCode: string;
  landName: string;
  rawAdministrativeUnitLabel: string;
  ars: string | null;
  ags: string | null;
  municipalityName: string;
  administrativeSeat: string | null;
  street: string | null;
  postalCode: string | null;
  locality: string | null;
  areaKm2: number | null;
  population: number | null;
  administrativeUnitType: AdministrativeUnitType;
};

const DIRECTORY_FAILURE_RETRY_AFTER_MS = 5_000;

type RecoverableImportCacheEntry<T> = {
  value: T;
  cachedAt: number;
};

const officialDirectoryImportCache = new Map<
  string,
  RecoverableImportCacheEntry<OfficialDirectoryImport>
>();
const regionRegistryImportCache = new Map<
  string,
  RecoverableImportCacheEntry<RegionRegistryImport>
>();

function readRecoverableImportCache<T extends { status: DirectorySourceStatus }>(
  cache: Map<string, RecoverableImportCacheEntry<T>>,
  key: string | null,
  now: number,
  failureRetryAfterMs: number,
): T | null {
  if (!key) return null;
  const cached = cache.get(key);
  if (!cached) return null;
  if (
    cached.value.status.status === "ready" ||
    now - cached.cachedAt < failureRetryAfterMs
  ) {
    return cached.value;
  }
  return null;
}

function writeRecoverableImportCache<T>(
  cache: Map<string, RecoverableImportCacheEntry<T>>,
  key: string | null,
  value: T,
  cachedAt: number,
): T {
  if (key) cache.set(key, { value, cachedAt });
  return value;
}

function trimOrNull(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function buildSourceCandidates(fileName: string): string[] {
  return [
    path.join(process.cwd(), "public", "Listen", fileName),
    path.join(process.cwd(), "apps", "web", "public", "Listen", fileName),
    path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "../../apps/web/public/Listen",
      fileName,
    ),
  ];
}

function resolveExistingSourcePath(fileName: string): string | null {
  const candidates = buildSourceCandidates(fileName);
  for (const candidate of candidates) {
    const normalized = decodeURIComponent(candidate);
    if (fs.existsSync(normalized)) return normalized;
  }
  return null;
}

function createDirectorySourceStatus(input: {
  sourceKey: DirectorySourceStatus["sourceKey"];
  label: string;
  sourceFile: string;
  sourcePath?: string | null;
  sourceAsOf?: string | null;
  status: DirectorySourceState;
  recordCount?: number;
  message: string;
  errorCode?: string | null;
}): DirectorySourceStatus {
  return {
    sourceKey: input.sourceKey,
    label: input.label,
    sourceFile: input.sourceFile,
    sourcePath: input.sourcePath ?? null,
    sourceAsOf: input.sourceAsOf ?? null,
    status: input.status,
    isConnected: input.status === "ready",
    recordCount: input.recordCount ?? 0,
    message: input.message,
    errorCode: input.errorCode ?? null,
  };
}

function parseWorkbookRows(rows: Array<Array<string | number>>): DirectoryWorkbookRow[] {
  const parsed: DirectoryWorkbookRow[] = [];
  for (const row of rows.slice(5)) {
    const landCode = String(row[0] ?? "").trim();
    const landName = String(row[1] ?? "").trim();
    const rawAdministrativeUnitLabel = String(row[4] ?? "").trim();
    const municipalityName = String(row[7] ?? "").trim();

    if (!landCode || !landName || !rawAdministrativeUnitLabel || !municipalityName) continue;

    parsed.push({
      landCode,
      landName,
      rawAdministrativeUnitLabel,
      ars: trimOrNull(row[5]),
      ags: trimOrNull(row[6]),
      municipalityName,
      administrativeSeat: trimOrNull(row[8]),
      street: trimOrNull(row[9]),
      postalCode: trimOrNull(row[10]),
      locality: trimOrNull(row[11]),
      areaKm2: toNumberOrNull(row[12]),
      population: toNumberOrNull(row[13]),
      administrativeUnitType: normalizeAdministrativeUnitType(rawAdministrativeUnitLabel),
    });
  }
  return parsed;
}

function readWorkbookRowsFromFile(filePath: string): DirectoryWorkbookRow[] {
  const workbook = XLSX.read(fs.readFileSync(filePath), {
    type: "buffer",
    cellDates: false,
  });
  const sheet = workbook.Sheets[OFFICIAL_DIRECTORY_SHEET];
  if (!sheet) {
    throw new Error(`official_directory_sheet_missing:${OFFICIAL_DIRECTORY_SHEET}`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as Array<Array<string | number>>;

  return parseWorkbookRows(rows);
}

function deriveBroadRegionType(administrativeUnitType: AdministrativeUnitType): RegionType {
  if (administrativeUnitType === "land") return "land";
  if (administrativeUnitType === "landkreis" || administrativeUnitType === "kreis") return "landkreis";
  if (
    administrativeUnitType === "amt" ||
    administrativeUnitType === "verbandsgemeinde" ||
    administrativeUnitType === "samtgemeinde" ||
    administrativeUnitType === "verwaltungsgemeinschaft" ||
    administrativeUnitType === "verwaltungsverband" ||
    administrativeUnitType === "kirchspielslandgemeinde" ||
    administrativeUnitType === "erfuellende_gemeinde" ||
    administrativeUnitType === "regionalverband"
  ) {
    return "region";
  }
  return "kommune";
}

function deriveOfficialBodyType(administrativeUnitType: AdministrativeUnitType): RegionOfficialBody["bodyType"] {
  if (administrativeUnitType === "land") return "landesverwaltung";
  if (administrativeUnitType === "landkreis" || administrativeUnitType === "kreis") return "kreisverwaltung";
  if (administrativeUnitType === "amt") return "amtverwaltung";
  if (administrativeUnitType === "verbandsgemeinde") return "verbandsgemeindeverwaltung";
  if (administrativeUnitType === "samtgemeinde") return "samtgemeindeverwaltung";
  if (administrativeUnitType === "verwaltungsverband") return "verwaltungsverband";
  if (administrativeUnitType === "verwaltungsgemeinschaft") return "verwaltungsgemeinschaft";
  if (administrativeUnitType === "regionalverband") return "regionalverband";
  if (administrativeUnitType === "kreisangehoerige_gemeinde") return "gemeindeverwaltung";
  return "stadtverwaltung";
}

function buildOfficialDirectoryEntry(row: DirectoryWorkbookRow): OfficialDirectoryEntry {
  return parseOfficialDirectoryEntry({
    ars: row.ars,
    ags: row.ags,
    municipalityName: row.municipalityName,
    administrativeSeat: row.administrativeSeat,
    street: row.street,
    postalCode: row.postalCode,
    locality: row.locality,
    areaKm2: row.areaKm2,
    population: row.population === null ? null : Math.round(row.population),
    administrativeUnitType: row.administrativeUnitType,
    rawAdministrativeUnitLabel: row.rawAdministrativeUnitLabel,
    sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
    sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
  });
}

function deriveLandRegionId(landCode: string): string {
  return `region-land-${landCode}`;
}

function deriveOfficialRegionId(entry: OfficialDirectoryEntry): string {
  return `region-official-${entry.ags ?? entry.ars ?? slugify(entry.municipalityName)}`;
}

function deriveParentRegionId(entry: OfficialDirectoryEntry): string | null {
  if (entry.administrativeUnitType === "land") return null;
  if (
    entry.administrativeUnitType === "landkreis" ||
    entry.administrativeUnitType === "kreis" ||
    entry.administrativeUnitType === "kreisfreie_stadt" ||
    entry.administrativeUnitType === "stadtkreis" ||
    entry.administrativeUnitType === "stadtstaat" ||
    entry.administrativeUnitType === "regionalverband"
  ) {
    return deriveLandRegionId((entry.ars ?? "").slice(0, 2));
  }
  if (entry.ars && entry.ars.length >= 5) {
    return `region-official-${entry.ars.slice(0, 5)}`;
  }
  return deriveLandRegionId((entry.ars ?? "").slice(0, 2));
}

function buildDirectorySummary(rows: DirectoryWorkbookRow[]): Array<{
  administrativeUnitType: AdministrativeUnitType;
  count: number;
}> {
  const counters = new Map<AdministrativeUnitType, number>();
  for (const row of rows) {
    counters.set(row.administrativeUnitType, (counters.get(row.administrativeUnitType) ?? 0) + 1);
  }
  return Array.from(counters.entries())
    .map(([administrativeUnitType, count]) => ({ administrativeUnitType, count }))
    .sort((left, right) => right.count - left.count);
}

function officialRegionSlugSuffix(region: Region): string {
  return (
    region.officialDirectoryEntry?.ags ??
    region.officialDirectoryEntry?.ars ??
    region.id.replace(/^region-(?:official|land)-/, "")
  );
}

function ensureUniqueOfficialRegionSlugs(regions: Region[]): Region[] {
  const slugCounts = new Map<string, number>();
  for (const region of regions) {
    slugCounts.set(region.slug, (slugCounts.get(region.slug) ?? 0) + 1);
  }

  const usedSlugs = new Set<string>();
  return regions.map((region) => {
    const baseSlug = region.slug;
    let slug =
      (slugCounts.get(baseSlug) ?? 0) > 1
        ? `${baseSlug}-${slugify(officialRegionSlugSuffix(region))}`
        : baseSlug;
    if (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${slugify(region.id)}`;
    }
    usedSlugs.add(slug);
    return slug === region.slug ? region : { ...region, slug };
  });
}

function buildOfficialRegionsFromEntries(
  entries: OfficialDirectoryEntry[],
  rows: DirectoryWorkbookRow[],
): Region[] {
  const landCodeToName = new Map<string, string>();
  for (const row of rows) {
    if (!landCodeToName.has(row.landCode) && row.landName) {
      landCodeToName.set(row.landCode, row.landName);
    }
  }
  const regions = new Map<string, Region>();

  for (const entry of entries) {
    const landCode = (entry.ars ?? "").slice(0, 2);
    const landName = landCodeToName.get(landCode) ?? entry.locality ?? "Bundesland";
    const landRegionId = deriveLandRegionId(landCode);
    if (!regions.has(landRegionId)) {
      regions.set(landRegionId, {
        id: landRegionId,
        slug: `${slugify(landName)}-${landCode}`,
        name: landName,
        type: "land",
        administrativeUnitType: "land",
        parentRegionId: null,
        officialBody: {
          id: `body-${landRegionId}`,
          label: landName,
          bodyType: "landesverwaltung",
        },
        officialDirectoryEntry: null,
        federalState: landName,
        country: "DE",
        publicVisibility: "public",
      });
    }

    const regionId = deriveOfficialRegionId(entry);
    if (regions.has(regionId)) continue;

    regions.set(regionId, {
      id: regionId,
      slug: slugify(entry.municipalityName),
      name: entry.municipalityName,
      type: deriveBroadRegionType(entry.administrativeUnitType ?? "sonstige"),
      administrativeUnitType: entry.administrativeUnitType,
      parentRegionId: deriveParentRegionId(entry),
      officialBody: {
        id: `body-${regionId}`,
        label: entry.administrativeSeat ?? entry.municipalityName,
        bodyType: deriveOfficialBodyType(entry.administrativeUnitType ?? "sonstige"),
      },
      officialDirectoryEntry: entry,
      federalState: landName,
      country: "DE",
      publicVisibility: "public",
    });
  }

  return ensureUniqueOfficialRegionSlugs(Array.from(regions.values()));
}

function buildOfficialActorsFromEntries(entries: OfficialDirectoryEntry[]): RegionalActor[] {
  return entries.map((entry) => {
    const regionId = deriveOfficialRegionId(entry);
    return {
      id: `actor-official-${entry.ags ?? entry.ars ?? slugify(entry.municipalityName)}`,
      regionId,
      slug: slugify(entry.administrativeSeat ?? entry.municipalityName),
      name: entry.administrativeSeat ?? entry.municipalityName,
      actorType: "verwaltung",
      verificationStatus: "verified",
      description: `${entry.rawAdministrativeUnitLabel ?? "Verwaltung"} in ${entry.municipalityName}`,
      sourceKind: "official_directory",
      publicVisibility: "public",
      administrativeUnitType: entry.administrativeUnitType,
      address: {
        street: entry.street,
        postalCode: entry.postalCode,
        locality: entry.locality,
      },
      officialDirectoryEntry: entry,
      tags: [
        "verwaltung",
        entry.administrativeUnitType ?? "sonstige",
        slugify(entry.municipalityName),
      ],
      guardrails: {
        noAutomaticPoliticalAssignment: true,
        noAutomaticVoiceOpenGovMembership: true,
        verificationStatusRequired: true,
      },
      createdAt: `${OFFICIAL_DIRECTORY_SOURCE_AS_OF}T00:00:00.000Z`,
      updatedAt: `${OFFICIAL_DIRECTORY_SOURCE_AS_OF}T00:00:00.000Z`,
    } satisfies RegionalActor;
  });
}

function parseRegionRegistryDocument(raw: unknown): RegionRegistrySnapshotDocument {
  if (Array.isArray(raw)) return { items: raw };
  if (!raw || typeof raw !== "object") {
    throw new Error("region_registry_snapshot_invalid");
  }
  const candidate = raw as RegionRegistrySnapshotDocument;
  return candidate;
}

function parseRegionRegistryItems(items: unknown[]): Region[] {
  const regionMap = new Map<string, Region>();
  for (const item of items) {
    const parsed = parseRegion(item);
    regionMap.set(parsed.id, parsed);
  }
  return Array.from(regionMap.values());
}

export function importOfficialDirectoryFromXlsx(options: {
  filePath?: string | null;
  rawRows?: Array<Array<string | number>>;
  cacheKey?: string;
  now?: number;
  failureRetryAfterMs?: number;
} = {}): OfficialDirectoryImport {
  const useDefaultSource = !options.filePath && !options.rawRows;
  const cacheKey = options.rawRows
    ? null
    : options.cacheKey?.trim() || (useDefaultSource ? "default" : null);
  const now = options.now ?? Date.now();
  const failureRetryAfterMs = Math.max(
    0,
    options.failureRetryAfterMs ?? DIRECTORY_FAILURE_RETRY_AFTER_MS,
  );
  const cached = readRecoverableImportCache(
    officialDirectoryImportCache,
    cacheKey,
    now,
    failureRetryAfterMs,
  );
  if (cached) return cached;

  const requestedPath = options.filePath ? decodeURIComponent(options.filePath) : null;
  const sourcePath = options.rawRows
    ? null
    : requestedPath
      ? fs.existsSync(requestedPath)
        ? requestedPath
        : null
      : resolveExistingSourcePath(OFFICIAL_DIRECTORY_SOURCE_FILE);

  if (!options.rawRows && !sourcePath) {
    const missing = {
      status: createDirectorySourceStatus({
        sourceKey: "official_directory",
        label: "OfficialDirectory",
        sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
        sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
        status: "missing",
        message: "Amtliche Verwaltungsanschriften sind nicht verbunden.",
        errorCode: "official_directory_not_found",
      }),
      entries: [],
      summary: [],
      derivedRegions: [],
      derivedActors: [],
    } satisfies OfficialDirectoryImport;
    return writeRecoverableImportCache(
      officialDirectoryImportCache,
      cacheKey,
      missing,
      now,
    );
  }

  try {
    const rows = options.rawRows ? parseWorkbookRows(options.rawRows) : readWorkbookRowsFromFile(sourcePath!);
    const entries = rows.map(buildOfficialDirectoryEntry);
    const summary = buildDirectorySummary(rows);
    const derivedRegions = buildOfficialRegionsFromEntries(entries, rows);
    const derivedActors = buildOfficialActorsFromEntries(entries);
    const result = {
      status: createDirectorySourceStatus({
        sourceKey: "official_directory",
        label: "OfficialDirectory",
        sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
        sourcePath,
        sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
        status: "ready",
        recordCount: entries.length,
        message: "Amtliche Verwaltungsanschriften sind verbunden.",
      }),
      entries,
      summary,
      derivedRegions,
      derivedActors,
    } satisfies OfficialDirectoryImport;
    return writeRecoverableImportCache(
      officialDirectoryImportCache,
      cacheKey,
      result,
      now,
    );
  } catch (error) {
    const failed = {
      status: createDirectorySourceStatus({
        sourceKey: "official_directory",
        label: "OfficialDirectory",
        sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
        sourcePath,
        sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
        status: "error",
        message: "Amtliche Verwaltungsanschriften konnten nicht gelesen werden.",
        errorCode: error instanceof Error ? error.message : "official_directory_import_failed",
      }),
      entries: [],
      summary: [],
      derivedRegions: [],
      derivedActors: [],
    } satisfies OfficialDirectoryImport;
    return writeRecoverableImportCache(
      officialDirectoryImportCache,
      cacheKey,
      failed,
      now,
    );
  }
}

export function importRegionRegistrySnapshot(options: {
  filePath?: string | null;
  snapshot?: unknown;
  cacheKey?: string;
  now?: number;
  failureRetryAfterMs?: number;
} = {}): RegionRegistryImport {
  const useDefaultSource = !options.filePath && options.snapshot === undefined;
  const cacheKey = options.snapshot === undefined
    ? options.cacheKey?.trim() || (useDefaultSource ? "default" : null)
    : null;
  const now = options.now ?? Date.now();
  const failureRetryAfterMs = Math.max(
    0,
    options.failureRetryAfterMs ?? DIRECTORY_FAILURE_RETRY_AFTER_MS,
  );
  const cached = readRecoverableImportCache(
    regionRegistryImportCache,
    cacheKey,
    now,
    failureRetryAfterMs,
  );
  if (cached) return cached;

  const requestedPath = options.filePath ? decodeURIComponent(options.filePath) : null;
  const sourcePath = options.snapshot !== undefined
    ? null
    : requestedPath
      ? fs.existsSync(requestedPath)
        ? requestedPath
        : null
      : resolveExistingSourcePath(REGION_REGISTRY_SOURCE_FILE);

  if (options.snapshot === undefined && !sourcePath) {
    const missing = {
      status: createDirectorySourceStatus({
        sourceKey: "region_registry",
        label: "RegionRegistry",
        sourceFile: REGION_REGISTRY_SOURCE_FILE,
        status: "missing",
        message: "Amtliches Gemeindeverzeichnis ist nicht verbunden.",
        errorCode: "region_registry_not_found",
      }),
      regions: [],
    } satisfies RegionRegistryImport;
    return writeRecoverableImportCache(
      regionRegistryImportCache,
      cacheKey,
      missing,
      now,
    );
  }

  try {
    const raw = options.snapshot !== undefined
      ? options.snapshot
      : JSON.parse(fs.readFileSync(sourcePath!, "utf8"));
    const document = parseRegionRegistryDocument(raw);
    const items = Array.isArray(document.items)
      ? document.items
      : Array.isArray(document.regions)
        ? document.regions
        : [];
    const regions = parseRegionRegistryItems(items);
    const result = {
      status: createDirectorySourceStatus({
        sourceKey: "region_registry",
        label: "RegionRegistry",
        sourceFile: document.sourceFile?.trim() || REGION_REGISTRY_SOURCE_FILE,
        sourcePath,
        sourceAsOf: document.sourceAsOf?.trim() || null,
        status: "ready",
        recordCount: regions.length,
        message: "Amtliches Gemeindeverzeichnis ist verbunden.",
      }),
      regions,
    } satisfies RegionRegistryImport;
    return writeRecoverableImportCache(
      regionRegistryImportCache,
      cacheKey,
      result,
      now,
    );
  } catch (error) {
    const failed = {
      status: createDirectorySourceStatus({
        sourceKey: "region_registry",
        label: "RegionRegistry",
        sourceFile: REGION_REGISTRY_SOURCE_FILE,
        sourcePath,
        status: "error",
        message: "Amtliches Gemeindeverzeichnis konnte nicht gelesen werden.",
        errorCode: error instanceof Error ? error.message : "region_registry_import_failed",
      }),
      regions: [],
    } satisfies RegionRegistryImport;
    return writeRecoverableImportCache(
      regionRegistryImportCache,
      cacheKey,
      failed,
      now,
    );
  }
}

export function getDirectorySourceStatus(): {
  regionRegistry: DirectorySourceStatus;
  officialDirectory: DirectorySourceStatus;
} {
  const regionRegistry = importRegionRegistrySnapshot().status;
  const officialDirectory = importOfficialDirectoryFromXlsx().status;
  return { regionRegistry, officialDirectory };
}

export function listOfficialMunicipalDirectoryEntries(): OfficialDirectoryEntry[] {
  return importOfficialDirectoryFromXlsx().entries;
}

export function summarizeOfficialAdministrativeDirectory(): Array<{
  administrativeUnitType: AdministrativeUnitType;
  count: number;
}> {
  return importOfficialDirectoryFromXlsx().summary;
}

export function buildOfficialRegionsFromDirectory(): Region[] {
  return importOfficialDirectoryFromXlsx().derivedRegions;
}

export function buildOfficialRegionalActorsFromDirectory(): RegionalActor[] {
  return importOfficialDirectoryFromXlsx().derivedActors;
}

export function listRegionsFromRegistry(): Region[] {
  return importRegionRegistrySnapshot().regions;
}

export function listOfficialBodiesForRegion(regionId: string): RegionOfficialBody[] {
  const normalized = String(regionId || "").trim();
  if (!normalized) return [];
  const bodyMap = new Map<string, RegionOfficialBody>();
  for (const actor of buildOfficialRegionalActorsFromDirectory()) {
    if (actor.regionId !== normalized) continue;
    const bodyType = actor.officialDirectoryEntry?.administrativeUnitType
      ? deriveOfficialBodyType(actor.officialDirectoryEntry.administrativeUnitType)
      : "sonstige";
    bodyMap.set(actor.id, {
      id: actor.id,
      label: actor.name,
      bodyType,
    });
  }
  return Array.from(bodyMap.values());
}
