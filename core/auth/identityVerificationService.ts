import { ObjectId, getCol } from "@core/db/triMongo";
import type { IdentityMethod } from "./verificationTypes";
import {
  ensureVerificationDefaults,
  upgradeVerificationLevel,
} from "./verificationTypes";
import type { IdentityVerificationSessionDoc } from "./identityVerificationTypes";

const COLLECTION = "identity_verification_sessions";

function allowedMethod(method: IdentityMethod) {
  return method === "otb_app" || method === "eid_scan";
}

export async function startIdentityVerification(userId: ObjectId, method: IdentityMethod) {
  if (!allowedMethod(method)) throw new Error("method_not_supported");
  const col = await getCol<IdentityVerificationSessionDoc>(COLLECTION);
  const now = new Date();
  const provider = process.env.OTB_API_URL ? "otb" : "mock";
  const doc: IdentityVerificationSessionDoc = {
    _id: new ObjectId(),
    userId,
    method,
    provider,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

export async function completeIdentityVerification(sessionId: string, providerPayload?: unknown) {
  const col = await getCol<IdentityVerificationSessionDoc>(COLLECTION);
  const _id = new ObjectId(sessionId);
  const session = await col.findOne({ _id });
  if (!session) throw new Error("session_not_found");
  if (session.status !== "pending") throw new Error("session_not_pending");

  const now = new Date();
  await col.updateOne(
    { _id },
    { $set: { status: "succeeded", providerPayload: providerPayload ?? null, updatedAt: now } },
  );

  const Users = await getCol("users");
  const user = await Users.findOne(
    { _id: session.userId },
    { projection: { verification: 1 } },
  );
  if (!user) throw new Error("user_not_found");

  const verification = ensureVerificationDefaults(user.verification);
  const methods = new Set(verification.methods);
  methods.add(session.method);

  const nextVerification = {
    ...verification,
    level: upgradeVerificationLevel(verification.level, "soft"),
    methods: Array.from(methods),
    lastVerifiedAt: now,
  };

  await Users.updateOne(
    { _id: session.userId },
    { $set: { verification: nextVerification, updatedAt: now } },
  );

  return { session: { ...session, status: "succeeded" }, verification: nextVerification };
}
