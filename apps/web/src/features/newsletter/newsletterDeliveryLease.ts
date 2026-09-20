import crypto from "node:crypto";

import { coreCol } from "@core/db/triMongo";

const LEASE_COLLECTION = "newsletter_delivery_leases";
const DEFAULT_LEASE_MS = 30 * 60 * 1000;

export type NewsletterDeliveryLease = {
  _id: string;
  token: string;
  acquiredAt: Date;
  expiresAt: Date;
};

export type NewsletterDeliveryLeaseStore = {
  removeExpired(id: string, now: Date): Promise<void>;
  insert(lease: NewsletterDeliveryLease): Promise<"inserted" | "duplicate">;
  release(id: string, token: string): Promise<void>;
};

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code?: unknown }).code) === 11000,
  );
}

function clampLeaseMs(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_LEASE_MS;
  return Math.max(5 * 60 * 1000, Math.min(2 * 60 * 60 * 1000, Math.floor(value)));
}

function mongoStore(): NewsletterDeliveryLeaseStore {
  return {
    async removeExpired(id, now) {
      const col = await coreCol<NewsletterDeliveryLease>(LEASE_COLLECTION);
      await col.deleteOne({ _id: id, expiresAt: { $lte: now } } as never);
    },
    async insert(lease) {
      const col = await coreCol<NewsletterDeliveryLease>(LEASE_COLLECTION);
      try {
        await col.insertOne(lease);
        return "inserted";
      } catch (error) {
        if (isDuplicateKeyError(error)) return "duplicate";
        throw error;
      }
    },
    async release(id, token) {
      const col = await coreCol<NewsletterDeliveryLease>(LEASE_COLLECTION);
      await col.deleteOne({ _id: id, token } as never);
    },
  };
}

export async function acquireNewsletterDeliveryLease(input: {
  id: string;
  now?: Date;
  leaseMs?: number;
  store?: NewsletterDeliveryLeaseStore;
}) {
  const id = input.id.trim();
  if (!id) return { acquired: false as const, reason: "invalid_lease_id" as const };
  const now = input.now ?? new Date();
  const leaseMs = clampLeaseMs(input.leaseMs ?? Number(process.env.NEWSLETTER_DELIVERY_LEASE_MS || DEFAULT_LEASE_MS));
  const store = input.store ?? mongoStore();
  await store.removeExpired(id, now);
  const token = crypto.randomUUID();
  const lease: NewsletterDeliveryLease = {
    _id: id,
    token,
    acquiredAt: now,
    expiresAt: new Date(now.getTime() + leaseMs),
  };
  const inserted = await store.insert(lease);
  if (inserted !== "inserted") {
    return { acquired: false as const, reason: "delivery_in_progress" as const };
  }
  return {
    acquired: true as const,
    token,
    expiresAt: lease.expiresAt,
    release: () => store.release(id, token),
  };
}

export function createInMemoryNewsletterDeliveryLeaseStore(): NewsletterDeliveryLeaseStore {
  const leases = new Map<string, NewsletterDeliveryLease>();
  return {
    async removeExpired(id, now) {
      const existing = leases.get(id);
      if (existing && existing.expiresAt.getTime() <= now.getTime()) leases.delete(id);
    },
    async insert(lease) {
      await Promise.resolve();
      if (leases.has(lease._id)) return "duplicate";
      leases.set(lease._id, {
        ...lease,
        acquiredAt: new Date(lease.acquiredAt),
        expiresAt: new Date(lease.expiresAt),
      });
      return "inserted";
    },
    async release(id, token) {
      const existing = leases.get(id);
      if (existing?.token === token) leases.delete(id);
    },
  };
}
