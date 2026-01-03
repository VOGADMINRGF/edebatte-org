import { coreCol, ObjectId } from "@core/db/triMongo";
import { streamAgendaCol, streamSessionsCol } from "@features/stream/db";
import type { StreamAgendaItemDoc, StreamSessionDoc } from "@features/stream/types";
import { randomUUID } from "node:crypto";

export type BuildAgendaOptions = {
  sessionId: string;
  locale?: string;
};

async function loadSession(sessionId: string): Promise<StreamSessionDoc | null> {
  if (!ObjectId.isValid(sessionId)) return null;
  const col = await streamSessionsCol();
  return col.findOne({ _id: new ObjectId(sessionId) });
}

async function fetchTopicStatements(
  topicKey?: string | null,
  regionCode?: string | null,
): Promise<Array<{ id: string; title?: string | null; text?: string | null }>> {
  if (!topicKey) return [];
  const col = await coreCol("statements");
  const match: Record<string, any> = { $or: [{ category: topicKey }, { topic: topicKey }] };
  if (regionCode) {
    match.regionCode = regionCode;
  }
  const docs = await col.find(match).project({ id: 1, title: 1, text: 1 }).limit(5).toArray();
  return docs.map((doc: any) => ({
    id: doc.id ?? doc._id?.toString?.() ?? randomUUID(),
    title: doc.title ?? null,
    text: doc.text ?? null,
  }));
}

export async function buildAgendaForSession(options: BuildAgendaOptions): Promise<StreamAgendaItemDoc[]> {
  const session = await loadSession(options.sessionId);
  if (!session) throw new Error("SESSION_NOT_FOUND");

  const hasTopic = !!session.topicKey;
  const topicItems = hasTopic ? await fetchTopicStatements(session.topicKey ?? null, session.regionCode ?? null) : [];
  const now = new Date();

  if (!hasTopic) return [];
  if (topicItems.length === 0) {
    return [];
  }

  const agenda: StreamAgendaItemDoc[] = [];

  agenda.push({
    sessionId: new ObjectId(options.sessionId),
    creatorId: session.creatorId,
    kind: "info",
    status: "queued",
    description: "Einführung & Kontext zum Thema",
    allowAnonymousVoting: true,
    publicAttribution: "hidden",
    order: 0,
    createdAt: now,
    updatedAt: now,
  });

  topicItems.slice(0, 3).forEach((stmt, idx) => {
    agenda.push({
      sessionId: new ObjectId(options.sessionId),
      creatorId: session.creatorId,
      kind: "statement",
      status: "queued",
      statementId: stmt.id,
      description: stmt.title || stmt.text || "Statement aus dem Thema",
      allowAnonymousVoting: true,
      publicAttribution: "hidden",
      order: agenda.length,
      createdAt: now,
      updatedAt: now,
    });
  });

  agenda.push({
    sessionId: new ObjectId(options.sessionId),
    creatorId: session.creatorId,
    kind: "question",
    status: "queued",
    customQuestion: "Welche offenen Fragen/Unsicherheiten siehst du?",
    allowAnonymousVoting: true,
    publicAttribution: "hidden",
    order: agenda.length,
    createdAt: now,
    updatedAt: now,
  });

  agenda.push({
    sessionId: new ObjectId(options.sessionId),
    creatorId: session.creatorId,
    kind: "info",
    status: "queued",
    description: "Abschluss & nächste Schritte",
    allowAnonymousVoting: true,
    publicAttribution: "hidden",
    order: agenda.length,
    createdAt: now,
    updatedAt: now,
  });

  return agenda;
}

export async function applyAutofilledAgendaToSession(sessionId: string, locale?: string) {
  const session = await loadSession(sessionId);
  if (!session) throw new Error("SESSION_NOT_FOUND");

  if (!session.topicKey) throw new Error("TOPIC_REQUIRED");

  const agendaItems = await buildAgendaForSession({ sessionId, locale });
  if (agendaItems.length === 0) {
    throw new Error("TOPIC_EMPTY");
  }
  const col = await streamAgendaCol();
  await col.deleteMany({ sessionId: new ObjectId(sessionId) });
  if (agendaItems.length) {
    await col.insertMany(agendaItems, { ordered: true });
  }
  return { session, agenda: agendaItems };
}
