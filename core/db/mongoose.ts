// core/db/mongoose.ts
import mongoose from "mongoose";

const isProd = process.env.NODE_ENV === "production";
const URI =
  process.env.CORE_MONGODB_URI ||
  (!isProd ? process.env.MONGODB_URI : undefined);
const DB =
  process.env.CORE_DB_NAME ||
  (!isProd ? process.env.MONGODB_DB : undefined) ||
  (!isProd ? "vog" : undefined);

if (!URI || !DB) {
  throw new Error(
    isProd
      ? "CORE_MONGODB_URI and CORE_DB_NAME are required in production; legacy MONGODB_URI/MONGODB_DB fallback is disabled"
      : "CORE_MONGODB_URI|MONGODB_URI and CORE_DB_NAME|MONGODB_DB missing",
  );
}

// Empfohlene Defaults (harmlos in DEV, stabil in PROD)
const appName = process.env.MONGODB_APPNAME || "edebatte-core";

declare global {
  // eslint-disable-next-line no-var
  var __MONGOOSE__: Promise<typeof mongoose> | undefined;
}

/** einmal verbinden; in Dev über global gecached */
export async function mongo() {
  return (global.__MONGOOSE__ ??= mongoose.connect(URI, {
    dbName: DB,
    // V2: Index-Handling – in Prod aus, in Dev an
    autoIndex: !isProd,
    appName,
    // Stabilitäts-Optionen
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL || 10),
    minPoolSize: Number(process.env.MONGODB_MIN_POOL || 0),
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SSM || 10000),
    retryWrites: true,
    // Falls du TLS/SRV verwendest, nutzt der Driver automatisch die URI-Parameter
  }));
}

// nützlich für Tests: mongoose.connection.close()
export { mongoose };
