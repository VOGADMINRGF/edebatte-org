import type { AccessTier } from "@features/pricing/types";

export type KnownRouteId =
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
  | "admin_ai_root"
  | "admin_dashboard"
  | "admin_people"
  | "admin_content"
  | "admin_telemetry"
  | "admin_system"
  | "admin_users"
  | "admin_analytics"
  | "admin_newsletter"
  | "admin_identity"
  | "admin_access"
  | "admin_access_users"
  | "admin_ai_dashboard"
  | "admin_ai_usage"
  | "admin_ai_flow"
  | "admin_ai_orchestrator"
  | "admin_telemetry_identity"
  | "admin_eventualities"
  | "admin_graph"
  | "admin_impact"
  | "admin_reports"
  | "admin_research"
  | "admin_responsibility"
  | "admin_settings"
  | "admin_feeds"
  | "admin_evidence"
  | "account";

export type RouteId = KnownRouteId | `custom:${string}`;

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
  /** Wenn gesetzt, reicht ein beliebiger eingeloggter User – Gruppen werden ignoriert. */
  loginOnly?: boolean;
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
    loginOnly: true,
  },
  {
    routeId: "statements_new",
    pathPattern: "/statements/new",
    label: "Statement Wizard",
    defaultGroups: ["citizenBasic", "citizenPremium", "institutionBasic", "institutionPremium", "staff"],
    allowAnonymous: true,
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
    routeId: "admin_dashboard",
    pathPattern: "/admin",
    label: "Admin · Dashboard",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_people",
    pathPattern: "/admin/people",
    label: "Admin · People Hub",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_content",
    pathPattern: "/admin/content",
    label: "Admin · Content Hub",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_telemetry",
    pathPattern: "/admin/telemetry",
    label: "Admin · Telemetry Hub",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_system",
    pathPattern: "/admin/system",
    label: "Admin · System Hub",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_ai_root",
    pathPattern: "/admin/telemetry/ai",
    label: "Admin · AI Telemetry",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_users",
    pathPattern: "/admin/users",
    label: "Admin · Nutzer & Rollen",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_analytics",
    pathPattern: "/admin/analytics",
    label: "Admin · Analytics",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_newsletter",
    pathPattern: "/admin/newsletter",
    label: "Admin · Newsletter",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_identity",
    pathPattern: "/admin/identity",
    label: "Admin · Legitimation",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
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
    routeId: "admin_access_users",
    pathPattern: "/admin/access/users",
    label: "Admin · Access Overrides",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_ai_dashboard",
    pathPattern: "/admin/telemetry/ai/dashboard",
    label: "Admin · AI Telemetry",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_ai_usage",
    pathPattern: "/admin/telemetry/ai/usage",
    label: "Admin · AI Usage",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_ai_flow",
    pathPattern: "/admin/telemetry/ai/flow",
    label: "Admin · AI Flow Health",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_ai_orchestrator",
    pathPattern: "/admin/telemetry/ai/orchestrator",
    label: "Admin · AI Orchestrator Health",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_telemetry_identity",
    pathPattern: "/admin/telemetry/identity",
    label: "Admin · Identity Telemetry",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
    matchMode: "exact",
  },
  {
    routeId: "admin_eventualities",
    pathPattern: "/admin/eventualities",
    label: "Admin · Eventualities",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_graph",
    pathPattern: "/admin/graph",
    label: "Admin · Graph",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_impact",
    pathPattern: "/admin/impact",
    label: "Admin · Impact",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_reports",
    pathPattern: "/admin/reports",
    label: "Admin · Reports",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_research",
    pathPattern: "/admin/research",
    label: "Admin · Research",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_responsibility",
    pathPattern: "/admin/responsibility",
    label: "Admin · Responsibility",
    defaultGroups: ["staff", "admin"],
    allowAnonymous: false,
    locked: true,
  },
  {
    routeId: "admin_settings",
    pathPattern: "/admin/settings",
    label: "Admin · Settings",
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
