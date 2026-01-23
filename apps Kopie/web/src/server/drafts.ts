// apps/web/src/server/drafts.ts
import { ObjectId } from "@core/db/triMongo";
import "server-only";
/* @ts-nocheck */
import { coreCol } from "@core/db/db/triMongo";


export async function createDraft(data: any) {
  const col = await coreCol("drafts");
  const now = new Date();
  const doc = { ...data, createdAt: data?.createdAt ?? now, updatedAt: now };
  const res = await col.insertOne(doc as any);
  return { id: res.insertedId.toString(), ...doc };
}

export async function patchDraft(id: string, patch: any) {
  const col = await coreCol("drafts");
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...patch, updatedAt: now } });
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("not_found");
  return { id, ...doc };
}

export async function getDraft(id: string) {
  const col = await coreCol("drafts");
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? { id: doc._id.toString(), ...doc } : null;
}
