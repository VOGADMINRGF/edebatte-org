// apps/web/scripts/r2.smoke.ts
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT_SUFFIX } =
  process.env as Record<string,string>;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing env R2_*"); process.exit(1);
}

const suffix = R2_ENDPOINT_SUFFIX || "r2.cloudflarestorage.com";
const endpoint = `https://${R2_ACCOUNT_ID}.${suffix}`;

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true as any,
});

(async () => {
  const key = `smoke/${Date.now()}.txt`;
  try {
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: "ok", ContentType: "text/plain" }));
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    console.log(JSON.stringify({ ok: true, bucket: R2_BUCKET, endpoint, key }));
  } catch (e:any) {
    console.error(JSON.stringify({ ok:false, error:e?.name, message:e?.message }));
    process.exit(2);
  }
})();
