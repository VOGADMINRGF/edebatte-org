import { coreCol } from "@core/db/triMongo";

export type AuthEventName = "auth.login.success" | "auth.login.failed" | "auth.2fa.failed";

export interface AuthEventDoc {
  _id?: string;
  createdAt: Date;
  event: AuthEventName;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
}

const COLLECTION = "auth_events";

export async function logAuthEvent(event: AuthEventName, payload?: { userId?: string | null; meta?: Record<string, unknown> }) {
  const col = await coreCol<AuthEventDoc>(COLLECTION);
  await col.insertOne({
    event,
    userId: payload?.userId ?? null,
    meta: payload?.meta ?? null,
    createdAt: new Date(),
  });
}
