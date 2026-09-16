import "server-only";

import { createHash, randomBytes } from "crypto";
import { ObjectId, getCol } from "@core/db/triMongo";
import type { StripeB2cPlanId } from "@/lib/server/billing/stripeB2c";

const COLLECTION = "vog_edebatte_handoffs";
const HANDOFF_TTL_MS = 30 * 60_000;

export type VogBridgePlanId = StripeB2cPlanId;
export type VogBridgeStatus = "pending" | "claimed" | "active" | "past_due" | "canceled" | "failed";

export type VogBridgeHandoffDoc = {
  _id: string;
  userId: ObjectId;
  requestedPlanId: VogBridgePlanId;
  actualPlanId?: VogBridgePlanId;
  status: VogBridgeStatus;
  createdAt: Date;
  expiresAt: Date;
  claimedAt?: Date;
  activatedAt?: Date;
  updatedAt: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
};

export function vogBridgeMinimum(planId: VogBridgePlanId) {
  return planId === "pro"
    ? { monthlyCents: 1_500, annualCents: 18_000 }
    : { monthlyCents: 499, annualCents: 5_988 };
}

export function hashVogHandoffToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

function publicShape(doc: VogBridgeHandoffDoc) {
  const minimum = vogBridgeMinimum(doc.requestedPlanId);
  return {
    handoffHash: doc._id,
    planId: doc.requestedPlanId,
    monthlyCents: minimum.monthlyCents,
    annualCents: minimum.annualCents,
    expiresAt: doc.expiresAt.toISOString(),
  };
}

export async function createVogHandoff(userId: ObjectId, requestedPlanId: VogBridgePlanId) {
  const collection = await getCol<VogBridgeHandoffDoc>(COLLECTION);
  const now = new Date();
  const token = randomBytes(32).toString("base64url");
  const handoffHash = hashVogHandoffToken(token);
  if (!handoffHash) throw new Error("handoff_token_generation_failed");

  const doc: VogBridgeHandoffDoc = {
    _id: handoffHash,
    userId,
    requestedPlanId,
    status: "pending",
    createdAt: now,
    expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS),
    updatedAt: now,
  };
  await collection.insertOne(doc);

  // Opportunistic cleanup keeps the capability collection small without making TTL-index setup a runtime dependency.
  void collection.deleteMany({ expiresAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60_000) } } as any).catch(() => {});

  return { token, ...publicShape(doc) };
}

export async function resolveVogHandoff(token: string) {
  const handoffHash = hashVogHandoffToken(token);
  if (!handoffHash) return null;
  const collection = await getCol<VogBridgeHandoffDoc>(COLLECTION);
  const doc = await collection.findOne({ _id: handoffHash, status: "pending", expiresAt: { $gt: new Date() } } as any);
  return doc ? publicShape(doc) : null;
}

export async function claimVogHandoff(token: string) {
  const handoffHash = hashVogHandoffToken(token);
  if (!handoffHash) return null;
  const collection = await getCol<VogBridgeHandoffDoc>(COLLECTION);
  const now = new Date();
  const doc = await collection.findOneAndUpdate(
    { _id: handoffHash, status: "pending", expiresAt: { $gt: now } } as any,
    { $set: { status: "claimed", claimedAt: now, updatedAt: now } },
    { returnDocument: "after" },
  );
  return doc ? publicShape(doc) : null;
}

export async function getVogHandoffByHash(handoffHash: string) {
  if (!/^[a-f0-9]{64}$/.test(handoffHash)) return null;
  const collection = await getCol<VogBridgeHandoffDoc>(COLLECTION);
  return collection.findOne({ _id: handoffHash });
}

export async function markVogHandoff(input: {
  handoffHash: string;
  status: VogBridgeStatus;
  actualPlanId?: VogBridgePlanId;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}) {
  if (!/^[a-f0-9]{64}$/.test(input.handoffHash)) return;
  const collection = await getCol<VogBridgeHandoffDoc>(COLLECTION);
  const now = new Date();
  await collection.updateOne(
    { _id: input.handoffHash },
    {
      $set: {
        status: input.status,
        updatedAt: now,
        ...(input.status === "active" ? { activatedAt: now } : {}),
        ...(input.actualPlanId ? { actualPlanId: input.actualPlanId } : {}),
        ...(input.stripeSubscriptionId ? { stripeSubscriptionId: input.stripeSubscriptionId } : {}),
        ...(input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : {}),
      },
    },
  );
}
