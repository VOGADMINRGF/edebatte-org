import { coreCol, ObjectId, type ObjectId as ObjectIdType } from "@core/db/triMongo";
import type { StreamSessionDoc, StreamAgendaItemDoc } from "./types";

const SESSION_COLLECTION = "stream_sessions";
const AGENDA_COLLECTION = "stream_agenda_items";

const ensured = {
  sessions: false,
  agenda: false,
};

async function ensureSessionIndexes() {
  if (ensured.sessions) return;
  const col = await coreCol<StreamSessionDoc>(SESSION_COLLECTION);
  await col.createIndex({ creatorId: 1, createdAt: -1 });
  await col.createIndex({ isLive: 1 });
  ensured.sessions = true;
}

async function ensureAgendaIndexes() {
  if (ensured.agenda) return;
  const col = await coreCol<StreamAgendaItemDoc>(AGENDA_COLLECTION);
  await col.createIndex({ sessionId: 1, createdAt: 1 });
  await col.createIndex({ sessionId: 1, status: 1 });
  ensured.agenda = true;
}

export async function streamSessionsCol() {
  await ensureSessionIndexes();
  return coreCol<StreamSessionDoc>(SESSION_COLLECTION);
}

export async function streamAgendaCol() {
  await ensureAgendaIndexes();
  return coreCol<StreamAgendaItemDoc>(AGENDA_COLLECTION);
}

export function toObjectId(id: string | ObjectIdType): ObjectId {
  return typeof id === "string" ? new ObjectId(id) : id;
}
