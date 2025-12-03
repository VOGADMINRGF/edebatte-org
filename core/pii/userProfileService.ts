import { ObjectId, piiCol } from "@core/db/triMongo";
import type { PiiUser } from "./userTypes";

const COLLECTION = "user_profiles";

type PiiUserDoc = PiiUser & {
  _id?: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PiiProfilePatch = {
  email?: string | null;
  phone?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  username?: string | null;
  address?: {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  };
};

export async function getPiiProfile(userId: ObjectId) {
  const col = await piiCol<PiiUserDoc>(COLLECTION);
  return col.findOne({ userId });
}

export async function upsertPiiProfile(userId: ObjectId, patch: PiiProfilePatch) {
  const col = await piiCol<PiiUserDoc>(COLLECTION);
  const now = new Date();
  const setOps: Record<string, any> = {
    updatedAt: now,
    userId,
  };

  const trimmedUsername = typeof patch.username === "string" ? patch.username.trim() : "";
  if (trimmedUsername.length > 0) {
    setOps.username = trimmedUsername;
  }

  assignIfDefined(setOps, "contacts.emailPrimary", patch.email?.toLowerCase() ?? patch.email);
  assignIfDefined(setOps, "contacts.phone", patch.phone ?? null, patch.phone !== undefined);
  assignIfDefined(setOps, "personal.givenName", patch.givenName ?? null, patch.givenName !== undefined);
  assignIfDefined(setOps, "personal.familyName", patch.familyName ?? null, patch.familyName !== undefined);
  assignIfDefined(setOps, "personal.fullName", patch.fullName ?? null, patch.fullName !== undefined);
  assignIfDefined(setOps, "personal.birthDate", patch.birthDate ?? null, patch.birthDate !== undefined);

  if (patch.address) {
    assignIfDefined(setOps, "address.street", patch.address.street ?? null, patch.address.street !== undefined);
    assignIfDefined(
      setOps,
      "address.postalCode",
      patch.address.postalCode ?? null,
      patch.address.postalCode !== undefined,
    );
    assignIfDefined(setOps, "address.city", patch.address.city ?? null, patch.address.city !== undefined);
    assignIfDefined(
      setOps,
      "address.country",
      patch.address.country ?? null,
      patch.address.country !== undefined,
    );
  }

  await col.updateOne(
    { userId },
    {
      $set: setOps,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function ensureBasicPiiProfile(
  userId: ObjectId,
  opts: { email?: string | null; displayName?: string | null },
) {
  if (!opts.email && !opts.displayName) return;
  const parsed = splitName(opts.displayName);
  await upsertPiiProfile(userId, {
    email: opts.email ?? null,
    givenName: parsed.givenName ?? null,
    familyName: parsed.familyName ?? null,
    fullName: parsed.fullName ?? null,
  });
}

export function splitName(displayName?: string | null): {
  givenName?: string;
  familyName?: string;
  fullName?: string;
} {
  if (!displayName) return {};
  const normalized = displayName.trim().replace(/\s+/g, " ");
  if (!normalized) return {};
  const [first, ...rest] = normalized.split(" ");
  return {
    givenName: first || undefined,
    familyName: rest.join(" ").trim() || undefined,
    fullName: normalized,
  };
}

function assignIfDefined(target: Record<string, any>, key: string, value: any, condition = true) {
  if (!condition) return;
  if (value === undefined) return;
  target[key] = value;
}
