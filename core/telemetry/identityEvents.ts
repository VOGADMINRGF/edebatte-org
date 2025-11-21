import { coreCol } from "@core/db/triMongo";

export type IdentityEventName =
  | "identity_register"
  | "identity_email_verify_start"
  | "identity_email_verify_confirm"
  | "identity_otb_start"
  | "identity_otb_confirm"
  | "identity_strong_completed";

export interface IdentityEventDoc {
  _id?: string;
  createdAt: Date;
  event: IdentityEventName;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
}

const COLLECTION = "identity_events";

export async function logIdentityEvent(event: IdentityEventName, payload?: { userId?: string | null; meta?: Record<string, unknown> }) {
  const col = await coreCol<IdentityEventDoc>(COLLECTION);
  await col.insertOne({
    event,
    userId: payload?.userId ?? null,
    meta: payload?.meta ?? null,
    createdAt: new Date(),
  });
}
