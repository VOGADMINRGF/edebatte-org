type EnvSource = Record<string, string | undefined>;

function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function allowLegacyMongoFallback(source: EnvSource): boolean {
  return source.NODE_ENV !== "production";
}

function legacyMongoUri(source: EnvSource): string | null {
  return allowLegacyMongoFallback(source) ? readEnv(source.MONGODB_URI) : null;
}

function legacyMongoDbName(source: EnvSource): string | null {
  return allowLegacyMongoFallback(source) ? readEnv(source.MONGODB_DB) : null;
}

export function resolveCoreMongoRuntimeConfig(source: EnvSource = process.env) {
  const coreUri = readEnv(source.CORE_MONGODB_URI);
  const coreDbName = readEnv(source.CORE_DB_NAME);
  const legacyUri = legacyMongoUri(source);
  const legacyDbName = legacyMongoDbName(source);

  return {
    uri: coreUri ?? legacyUri,
    dbName: coreDbName ?? legacyDbName,
    usedLegacyUri: !coreUri && Boolean(legacyUri),
    usedLegacyDbName: !coreDbName && Boolean(legacyDbName),
  };
}

export function hasCoreMongoRuntimeConfig(source: EnvSource = process.env): boolean {
  const resolved = resolveCoreMongoRuntimeConfig(source);
  return Boolean(resolved.uri && resolved.dbName);
}

export function resolveMongoUriForZone(
  zone: "core" | "votes" | "pii",
  source: EnvSource = process.env,
): string | null {
  const legacyUri = legacyMongoUri(source);
  if (zone === "core") {
    return readEnv(source.CORE_MONGODB_URI) ?? legacyUri;
  }
  if (zone === "votes") {
    return readEnv(source.VOTES_MONGODB_URI) ?? legacyUri;
  }
  return readEnv(source.PII_MONGODB_URI) ?? legacyUri;
}
