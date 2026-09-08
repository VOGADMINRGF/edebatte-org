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
const regions = buildOfficialRegionsFromDirectory();
const entries = regions
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

const administrativeUnitTargetPath = path.resolve(
  process.cwd(),
  "apps/web/src/features/create/generatedOfficialAdministrativeUnitIndex.json",
);
const administrativeUnitById = Object.fromEntries(
  regions
    .filter(
      (region) =>
        Boolean(region.officialDirectoryEntry) &&
        ![
          "kreisfreie_stadt",
          "stadtkreis",
          "stadtstaat",
          "kreisangehoerige_gemeinde",
          "stadt",
          "markt",
          "grosse_kreisstadt",
          "grosse_kreisangehoerige_stadt",
          "gemeindefreies_gebiet_bewohnt",
          "gemeindefreies_gebiet_unbewohnt",
        ].includes(
          region.officialDirectoryEntry?.administrativeUnitType ?? "",
        ),
    )
    .map((region) => [
      region.id,
      {
        administrativeUnitType:
          region.officialDirectoryEntry?.administrativeUnitType ?? null,
        rawAdministrativeUnitLabel:
          region.officialDirectoryEntry?.rawAdministrativeUnitLabel ?? null,
        administrativeSeat:
          region.officialDirectoryEntry?.administrativeSeat ?? null,
      },
    ]),
);

fs.writeFileSync(
  targetPath,
  `${JSON.stringify({
    sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
    sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
    entries,
  })}\n`,
  "utf8",
);

fs.writeFileSync(
  administrativeUnitTargetPath,
  `${JSON.stringify({
    sourceFile: OFFICIAL_DIRECTORY_SOURCE_FILE,
    sourceAsOf: OFFICIAL_DIRECTORY_SOURCE_AS_OF,
    administrativeUnitById,
  })}\n`,
  "utf8",
);

process.stdout.write(
  `Generated ${entries.length} official municipality entries and ${Object.keys(administrativeUnitById).length} non-municipal administrative units.\n`,
);
