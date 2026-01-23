// apps/web/src/lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Baut einen sauberen R2-Endpoint.
 * - akzeptiert versehentlich als ACCOUNT_ID eingefügte komplette URLs und "säubert" sie
 * - nutzt optional R2_ENDPOINT_SUFFIX (für EU: eu.r2.cloudflarestorage.com)
 */
function r2EndpointFromEnv(): string {
  const raw = process.env.R2_ACCOUNT_ID || "";
  // falls jemand die komplette URL einkopiert hat -> auf reine ID reduzieren
  const id = raw
    .replace(/^https?:\/\//i, "")
    .replace(/\.?r2\.cloudflarestorage\.com.*$/i, "");

  const suffix = process.env.R2_ENDPOINT_SUFFIX || "r2.cloudflarestorage.com";
  if (!id) throw new Error("R2_ACCOUNT_ID fehlt oder ist ungültig");
  return `https://${id}.${suffix}`;
}

// minimale Env-Validierung
["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].forEach((k) => {
  if (!process.env[k]) throw new Error(`${k} ist nicht gesetzt`);
});

export const s3 = new S3Client({
  region: "auto",
  endpoint: r2EndpointFromEnv(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
  // R2 & viele S3-kompatible Provider mögen Path-Style
  forcePathStyle: true as any,
});

export const BUCKET = process.env.R2_BUCKET as string;
