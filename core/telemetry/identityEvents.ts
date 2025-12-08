import { coreCol } from "@core/db/triMongo";

export type IdentityEventName =
  | "identity_register"
  | "identity_email_verify_start"
  | "identity_email_verify_confirm"
  | "identity_totp_confirmed"
  | "identity_otb_start"
  | "identity_otb_confirm"
  | "identity_strong_completed"
  | "membership_apply_submitted"
  | "household_invite_sent";

export type IdentityFunnelSnapshot = {
  fromDate: string;
  toDate: string;
  totalsByEvent: Record<IdentityEventName, number>;
};

export interface IdentityEventDoc {
  _id?: string;
  createdAt: Date;
  event: IdentityEventName;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
}

const COLLECTION = "identity_events";

const EMPTY_TOTALS: Record<IdentityEventName, number> = {
  identity_register: 0,
  identity_email_verify_start: 0,
  identity_email_verify_confirm: 0,
  identity_totp_confirmed: 0,
  identity_otb_start: 0,
  identity_otb_confirm: 0,
  identity_strong_completed: 0,
  membership_apply_submitted: 0,
  household_invite_sent: 0,
};

export async function logIdentityEvent(event: IdentityEventName, payload?: { userId?: string | null; meta?: Record<string, unknown> }) {
  const col = await coreCol<IdentityEventDoc>(COLLECTION);
  await col.insertOne({
    event,
    userId: payload?.userId ?? null,
    meta: payload?.meta ?? null,
    createdAt: new Date(),
  });
}

export async function logMembershipApplySubmitted(meta: {
  userId: string;
  membershipId: string;
  amountPerPeriod: number;
  rhythm: string;
  householdSize: number;
}) {
  await logIdentityEvent("membership_apply_submitted", { userId: meta.userId, meta });
}

export async function logHouseholdInviteSent(meta: {
  userId: string;
  membershipId: string;
  inviteCount: number;
}) {
  await logIdentityEvent("household_invite_sent", { userId: meta.userId, meta });
}

export async function getIdentityFunnelSnapshot(fromDate: Date, toDate: Date): Promise<IdentityFunnelSnapshot> {
  const col = await coreCol<IdentityEventDoc>(COLLECTION);
  const results = await col
    .aggregate<{ _id: IdentityEventName; total: number }>([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: "$event", total: { $sum: 1 } } },
    ])
    .toArray();

  const totals = { ...EMPTY_TOTALS };
  for (const row of results) {
    totals[row._id] = row.total;
  }

  return {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    totalsByEvent: totals,
  };
}
