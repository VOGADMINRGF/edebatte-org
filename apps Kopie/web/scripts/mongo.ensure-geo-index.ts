// apps/web/scripts/mongo.ensure-geo-index.ts
import { mongo } from "@/lib/db";

async function main() {
  if (!mongo) throw new Error("mongo_missing");
  const db = mongo.db();

  const ensure = async (colName: string) => {
    const col = db.collection(colName);
    await col.createIndex({ location: "2dsphere" }, { name: "location_2dsphere", background: true });
    await col.createIndex({ "region.nuts": 1 }, { name: "region_nuts_1", background: true });
    await col.createIndex({ "region.ags": 1 }, { name: "region_ags_1", background: true });
    await col.createIndex({ status: 1 }, { name: "status_1", background: true });
    await col.createIndex({ lang: 1 }, { name: "lang_1", background: true });
    await col.createIndex({ tags: 1 }, { name: "tags_1", background: true });
  };

  await ensure("statements");
  await ensure("reports");

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, ensured: ["statements", "reports"] }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
