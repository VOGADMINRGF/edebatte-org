import { ObjectId, piiCol } from "../db/triMongo";
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
  household?: {
    size?: number | null;
  };
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
  const setOnInsert: Record<string, any> = {
    createdAt: now,
    username: `uid-${userId.toHexString()}`,
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

  if (patch.household) {
    assignIfDefined(
      setOps,
      "household.size",
      patch.household.size ?? null,
      patch.household.size !== undefined,
    );
  }

  await col.updateOne(
    { userId },
    {
      $set: setOps,
      $setOnInsert: setOnInsert,
    },
    { upsert: true },
  );
}

export async function ensureBasicPiiProfile(
  userId: ObjectId,
  opts: {
    email?: string | null;
    displayName?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    birthDate?: string | null;
    householdSize?: number | null;
  },
) {
  if (!opts.email && !opts.displayName && !opts.givenName && !opts.familyName) return;
  const parsed = splitName(opts.displayName);
  const givenName = opts.givenName ?? parsed.givenName ?? null;
  const familyName = opts.familyName ?? parsed.familyName ?? null;
  const fullName =
    opts.displayName?.trim() ||
    [givenName ?? "", familyName ?? ""].map((part) => part?.trim()).filter(Boolean).join(" ") ||
    parsed.fullName ||
    null;

  await upsertPiiProfile(userId, {
    email: opts.email ?? null,
    givenName,
    familyName,
    fullName,
    birthDate: opts.birthDate ?? null,
    household:
      typeof opts.householdSize === "number"
        ? { size: opts.householdSize }
        : undefined,
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
