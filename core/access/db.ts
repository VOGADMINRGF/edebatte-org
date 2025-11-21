import { coreCol } from "../db/triMongo";
import type {
  AccessGroup,
  RouteId,
  RoutePolicy,
  UserRouteOverride,
} from "../../features/access/types";
import { DEFAULT_ROUTE_POLICIES } from "../../features/access/types";

const POLICIES_COLLECTION = "route_policies";
const OVERRIDES_COLLECTION = "route_overrides";

type RoutePolicyOverrideDoc = {
  _id?: any;
  routeId: RouteId;
  defaultGroups?: AccessGroup[];
  allowAnonymous?: boolean;
  updatedAt: Date;
  createdAt: Date;
};

type RouteOverrideDoc = UserRouteOverride & {
  _id?: any;
  createdAt: Date;
  updatedAt: Date;
};

async function policiesCol() {
  const col = await coreCol<RoutePolicyOverrideDoc>(POLICIES_COLLECTION);
  await col.createIndex({ routeId: 1 }, { unique: true });
  return col;
}

async function overridesCol() {
  const col = await coreCol<RouteOverrideDoc>(OVERRIDES_COLLECTION);
  await col.createIndex({ userId: 1, routeId: 1 }, { unique: true });
  await col.createIndex({ expiresAt: 1 });
  return col;
}

function mergePolicy(route: RoutePolicy, override?: RoutePolicyOverrideDoc | null): RoutePolicy {
  if (!override) return route;
  return {
    ...route,
    defaultGroups: override.defaultGroups ?? route.defaultGroups,
    allowAnonymous: override.allowAnonymous ?? route.allowAnonymous,
  };
}

export async function getEffectiveRoutePolicies(): Promise<RoutePolicy[]> {
  const overrides = await (await policiesCol()).find({}).toArray();
  const map = new Map<RouteId, RoutePolicyOverrideDoc>();
  overrides.forEach((doc) => map.set(doc.routeId, doc));

  return DEFAULT_ROUTE_POLICIES.map((route) => mergePolicy(route, map.get(route.routeId)));
}

export async function getEffectiveRoutePolicy(routeId: RouteId): Promise<RoutePolicy | null> {
  const base = DEFAULT_ROUTE_POLICIES.find((r) => r.routeId === routeId);
  if (!base) return null;
  const override = await (await policiesCol()).findOne({ routeId });
  return mergePolicy(base, override ?? undefined);
}

export async function upsertRoutePolicy(
  routeId: RouteId,
  patch: Pick<RoutePolicy, "defaultGroups" | "allowAnonymous">,
) {
  const col = await policiesCol();
  await col.updateOne(
    { routeId },
    {
      $set: {
        defaultGroups: patch.defaultGroups,
        allowAnonymous: patch.allowAnonymous,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function getUserOverrides(userId: string): Promise<UserRouteOverride[]> {
  const now = new Date();
  const rows = await queryActiveOverrides(userId, now);
  return rows.map(({ _id, createdAt, updatedAt, ...rest }) => rest);
}

export async function upsertUserOverride(override: UserRouteOverride) {
  const col = await overridesCol();
  await col.updateOne(
    { userId: override.userId, routeId: override.routeId },
    {
      $set: {
        mode: override.mode,
        reason: override.reason ?? null,
        expiresAt: override.expiresAt ?? null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function deleteUserOverride(userId: string, routeId: RouteId) {
  await (await overridesCol()).deleteOne({ userId, routeId });
}

async function queryActiveOverrides(userId: string, now = new Date()) {
  return (await overridesCol())
    .find({
      userId,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
    })
    .toArray();
}

export async function getUserOverridesWithMeta(userId: string) {
  return queryActiveOverrides(userId);
}

export async function countRouteOverrides(): Promise<Record<string, number>> {
  const col = await overridesCol();
  const rows = await col
    .aggregate([{ $group: { _id: "$routeId", total: { $sum: 1 } } }])
    .toArray();
  const map: Record<string, number> = {};
  rows.forEach((row) => {
    map[row._id as string] = row.total;
  });
  return map;
}
