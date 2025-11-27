import { ObjectId, coreCol } from "@core/db/triMongo";
import type { Collection, WithId } from "mongodb";
import type { ResponsibilityActor } from "./types";

type ResponsibilityActorDoc = ResponsibilityActor & { _id: ObjectId };

type SaveActorInput = Omit<ResponsibilityActor, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

async function responsibilityActorsCol(): Promise<Collection<ResponsibilityActorDoc>> {
  return coreCol<ResponsibilityActorDoc>("responsibilityActors");
}

function sanitizeDoc(doc: WithId<ResponsibilityActorDoc>): ResponsibilityActor {
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: typeof _id === "string" ? _id : _id.toHexString?.() ?? String(_id),
  };
}

export async function getActors(includeInactive = false): Promise<ResponsibilityActor[]> {
  const col = await responsibilityActorsCol();
  const query = includeInactive
    ? {}
    : {
        $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }],
      };
  const docs = await col.find(query).sort({ name: 1, actorKey: 1 }).toArray();
  return docs.map(sanitizeDoc);
}

export async function getActorById(id: string): Promise<ResponsibilityActor | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await responsibilityActorsCol();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? sanitizeDoc(doc) : null;
}

export async function getActorByKey(actorKey: string): Promise<ResponsibilityActor | null> {
  const key = actorKey?.trim();
  if (!key) return null;
  const col = await responsibilityActorsCol();
  const doc = await col.findOne({ actorKey: key });
  return doc ? sanitizeDoc(doc) : null;
}

export async function saveActor(input: SaveActorInput): Promise<ResponsibilityActor> {
  const col = await responsibilityActorsCol();
  const now = new Date();
  const actorKey = input.actorKey?.trim() || undefined;
  const payload: Partial<ResponsibilityActorDoc> = {
    actorKey,
    name: input.name?.trim() ?? "Unbenannter Akteur",
    level: input.level ?? null,
    role: input.role ?? null,
    regionId: input.regionId?.trim() || null,
    description: input.description?.trim() || null,
    isActive: input.isActive ?? true,
    meta: input.meta,
    updatedAt: now,
  };

  const id = input.id && ObjectId.isValid(input.id) ? new ObjectId(input.id) : null;

  if (id) {
    const result = await col.findOneAndUpdate(
      { _id: id },
      { $set: payload, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    const doc = result.value ?? ({ _id: id, ...payload, createdAt: now } as ResponsibilityActorDoc);
    return sanitizeDoc(doc);
  }

  const insertResult = await col.insertOne({
    ...payload,
    createdAt: now,
  } as ResponsibilityActorDoc);
  return sanitizeDoc({ _id: insertResult.insertedId, ...payload, createdAt: now } as ResponsibilityActorDoc);
}

export async function deactivateActor(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await responsibilityActorsCol();
  const res = await col.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false, updatedAt: new Date() } });
  return res.modifiedCount > 0;
}
