import { type NextRequest } from "next/server";
import type { EventualitySnapshotDoc } from "@core/eventualities";
import { maskUserId } from "@core/pii/redact";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export type StaffContext = {
  role: string;
  userId: string | null;
};

export async function getStaffContext(
  req: NextRequest,
): Promise<{ context?: StaffContext; response?: Response }> {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return { response: gate };
  const user = gate as any;
  const primaryRole =
    Array.isArray(user?.roles) && user.roles.length ? user.roles[0] : user?.role ?? "guest";
  return {
    context: {
      role: primaryRole ?? "guest",
      userId: user?._id ? String(user._id) : null,
    },
  };
}

export function serializeSnapshot(doc: EventualitySnapshotDoc) {
  const toIso = (value?: Date | null) =>
    value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null;

  return {
    contributionId: doc.contributionId,
    locale: doc.locale,
    userIdMasked: doc.userIdMasked ?? null,
    nodesCount: doc.nodesCount,
    treesCount: doc.treesCount,
    reviewed: doc.reviewed,
    reviewedAt: toIso(doc.reviewedAt ?? null),
    reviewedBy: doc.reviewedBy ?? null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}
