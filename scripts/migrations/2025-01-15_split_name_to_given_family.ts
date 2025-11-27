/**
 * Best-effort Migration:
 * - Splits legacy name fields into personal.givenName + personal.familyName on `pii.users`.
 * - Does NOT push changes to any UI; only normalizes the PII schema.
 */

import { closeAll, getCol, ObjectId } from "@core/db/triMongo";

type LegacyUser = {
  _id: ObjectId;
  name?: string;
  personal?: { name?: string; givenName?: string; familyName?: string };
};

function splitName(raw?: string | null): { givenName?: string; familyName?: string } {
  if (!raw || typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { givenName: parts[0], familyName: "" };
  }
  const familyName = parts.pop()!;
  const givenName = parts.join(" ");
  return { givenName, familyName };
}

export async function run(): Promise<void> {
  const Users = await getCol<LegacyUser>("pii", "users");
  const cursor = Users.find(
    {
      $or: [{ name: { $type: "string" } }, { "personal.name": { $type: "string" } }],
    },
    { projection: { name: 1, personal: 1 } },
  ).batchSize(200);

  let processed = 0;
  // eslint-disable-next-line no-console
  console.log("[migration] split_name_to_given_family: starting");

  for await (const doc of cursor) {
    const rawName = doc.personal?.name ?? doc.name;
    const next = splitName(rawName);

    const setOps: Record<string, any> = {};
    const unsetOps: Record<string, any> = {};

    if (next.givenName !== undefined) setOps["personal.givenName"] = next.givenName;
    if (next.familyName !== undefined) setOps["personal.familyName"] = next.familyName;
    if (doc.personal?.name) unsetOps["personal.name"] = "";
    if (doc.name) unsetOps.name = "";

    if (Object.keys(setOps).length === 0 && Object.keys(unsetOps).length === 0) continue;

    await Users.updateOne({ _id: doc._id }, { $set: setOps, ...(Object.keys(unsetOps).length ? { $unset: unsetOps } : {}) });
    processed += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`[migration] split_name_to_given_family: finished (${processed} docs updated)`);
  await closeAll();
}

if (require.main === module) {
  run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[migration] split_name_to_given_family failed", err);
    closeAll().catch(() => {});
    process.exit(1);
  });
}
