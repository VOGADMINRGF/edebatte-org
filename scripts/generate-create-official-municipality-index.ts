import fs from "node:fs";
import path from "node:path";

import {
  buildOfficialRegionsFromDirectory,
  OFFICIAL_DIRECTORY_SOURCE_AS_OF,
  OFFICIAL_DIRECTORY_SOURCE_FILE,
} from "../features/region/directory";

const targetPath = path.resolve(
  process.cwd(),
  "apps/web/src/features/create/generatedOfficialMunicipalityIndex.json",
);
const entries = buildOfficialRegionsFromDirectory()
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

fs.writeFileSync(
  targetPath,
  `${JSON.stringify({
    sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
    sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
    entries,
  })}\n`,
  "utf8",
);

process.stdout.write(`Generated ${entries.length} official municipality entries.\n`);
