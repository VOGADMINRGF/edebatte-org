import type { AccessTier } from "@features/pricing/types";

export type RouteId =
  | "home"
  | "howtoworks_movement"
  | "howtoworks_edebatte"
  | "contributions_new"
  | "statements_new"
  | "reports"
  | "map"
  | "evidence_region"
  | "dashboard_usage"
  | "dashboard_streams"
  | "admin_evidence"
  | "admin_feeds"
  | "admin_access"
  | "admin_ai_orchestrator"
  | "account";

export type AccessGroup = AccessTier | "admin" | "creator";

export type RouteMatchMode = "prefix" | "exact";

export type RoutePolicy = {
  routeId: RouteId;
  pathPattern: string;
  label: string;
  defaultGroups: AccessGroup[];
  allowAnonymous: boolean;
  locked?: boolean;
  matchMode?: RouteMatchMode;
};

export type UserRouteOverrideMode = "allow" | "deny";

export type UserRouteOverride = {
  userId: string;
  routeId: RouteId;
  mode: UserRouteOverrideMode;
  reason?: string;
  expiresAt?: Date | null;
};

export const DEFAULT_ROUTE_POLICIES: RoutePolicy[] = [
  {
    routeId: "home",
    pathPattern: "/",
    label: "Landing / Home",
    defaultGroups: ["public"],
    allowAnonymous: true,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "howtoworks_movement",
    pathPattern: "/howtoworks/bewegung",
    label: "HowToWorks – Bewegung",
    defaultGroups: ["public"],
    allowAnonymous: true,
    locked: true,
  },
  {
    routeId: "howtoworks_edebatte",
    pathPattern: "/howtoworks/edebatte",
    label: "HowToWorks – eDebatte",
    defaultGroups: ["public"],
    allowAnonymous: true,
    locked: true,
  },
  {
    routeId: "contributions_new",
    pathPattern: "/contributions/new",
    label: "Contribution Wizard",
    defaultGroups: ["citizenBasic", "citizenPremium", "institutionBasic", "institutionPremium", "staff"],
    allowAnonymous: false,
    locked: false,
  },
  {
    routeId: "statements_new",
    pathPattern: "/statements/new",
    label: "Statement Wizard",
    defaultGroups: ["citizenBasic", "citizenPremium", "institutionBasic", "institutionPremium", "staff"],
    allowAnonymous: false,
    locked: false,
  },
  {
    routeId: "reports",
    pathPattern: "/reports",
    label: "Reports Overview",
    defaultGroups: ["public"],
    allowAnonymous: true,
    locked: false,
  },
  {
    routeId: "map",
    pathPattern: "/map",
    label: "Map Overview",
    defaultGroups: ["public"],
    allowAnonymous: true,
    locked: false,
  },
  {
    routeId: "evidence_region",
    pathPattern: "/evidence/:regionCode",
    label: "Evidence Region View",
    defaultGroups: ["public"],
    allowAnonymous: true,
    locked: false,
  },
  {
    routeId: "account",
    pathPattern: "/account",
    label: "Mein Konto",
    defaultGroups: [
      "citizenBasic",
      "citizenPremium",
      "institutionBasic",
      "institutionPremium",
      "staff",
      "admin",
    ],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "dashboard_usage",
    pathPattern: "/dashboard/usage",
    label: "Usage Dashboard",
    defaultGroups: ["staff"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "dashboard_streams",
    pathPattern: "/dashboard/streams",
    label: "Streams Dashboard",
    defaultGroups: ["creator", "staff"],
    allowAnonymous: false,
    locked: false,
  },
  {
    routeId: "admin_evidence",
    pathPattern: "/admin/evidence",
    label: "Admin · Evidence",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_feeds",
    pathPattern: "/admin/feeds",
    label: "Admin · Feeds Pipeline",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_access",
    pathPattern: "/admin/access",
    label: "Admin · Access Center",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_ai_orchestrator",
    pathPattern: "/admin/telemetry/ai/orchestrator",
    label: "Admin · AI Orchestrator Health",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
];

export type AccessUser = {
  id?: string | null;
  accessTier?: AccessTier | null;
  roles?: string[];
  groups?: AccessGroup[];
};
