export type NavItem = {
  href: string;
  label: string;
  description?: string;
  keywords?: string[];
  match?: "exact" | "prefix";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Übersicht",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "KPIs, User, Zugriffe",
        keywords: ["overview", "kpi", "summary"],
        match: "exact",
      },
      {
        href: "/admin/people",
        label: "People Hub",
        description: "User, Rollen, Newsletter, Regeln",
        keywords: ["roles", "users", "newsletter", "access"],
        match: "exact",
      },
      {
        href: "/admin/content",
        label: "Content Hub",
        description: "Evidence, Graph, Feeds, Reports",
        keywords: ["evidence", "graph", "reports", "feeds"],
        match: "exact",
      },
      {
        href: "/admin/telemetry",
        label: "Telemetry Hub",
        description: "AI Usage, Health, Logs",
        keywords: ["ai", "telemetry", "usage", "health"],
        match: "exact",
      },
      {
        href: "/admin/system",
        label: "System Hub",
        description: "Settings, Analytics",
        keywords: ["settings", "analytics", "config"],
        match: "exact",
      },
    ],
  },
  {
    title: "People & Access",
    items: [
      {
        href: "/admin/orgs",
        label: "Organisationen",
        description: "Orgs, Teams, Seats",
        keywords: ["orgs", "teams", "seats", "invite"],
      },
      {
        href: "/admin/users",
        label: "Nutzer & Rollen",
        description: "User suchen, Rollen setzen",
        keywords: ["users", "roles", "access tier"],
      },
      {
        href: "/admin/access",
        label: "Access Center",
        description: "Seitenzugriffe verwalten",
        keywords: ["routes", "policies", "access"],
      },
      {
        href: "/admin/access/users",
        label: "Access Overrides",
        description: "User-spezifische Freigaben",
        keywords: ["overrides", "users", "access"],
      },
      {
        href: "/admin/features",
        label: "Feature Control",
        description: "Feature-Matrix & Limits je Access Tier",
        keywords: ["features", "limits", "tiers", "engagement", "credits"],
      },
      {
        href: "/admin/pricing/orders",
        label: "Pricing Orders",
        description: "Bestellungen, Prüfung, Freigabe",
        keywords: ["pricing", "orders", "review", "approval", "billing"],
      },
      {
        href: "/admin/newsletter",
        label: "Newsletter",
        description: "Abonnenten verwalten",
        keywords: ["email", "subscribers"],
      },
      {
        href: "/admin/identity",
        label: "Identity Funnel",
        description: "Registrierung, 2FA, Onboarding",
        keywords: ["identity", "funnel", "2fa"],
      },
    ],
  },
  {
    title: "Content & Reports",
    items: [
      {
        href: "/admin/editorial/queue",
        label: "Editorial Queue",
        description: "Triage, Review, Freigaben",
        keywords: ["editorial", "queue", "review"],
      },
      {
        href: "/admin/editorial/published",
        label: "Editorial Published",
        description: "Veröffentlichte Items",
        keywords: ["editorial", "published"],
      },
      {
        href: "/admin/graph/impact",
        label: "Graph Impact",
        description: "Impact-Summary & Knoten",
        keywords: ["graph", "impact"],
      },
      {
        href: "/admin/graph/health",
        label: "Graph Health",
        description: "Health-Checks & KPIs",
        keywords: ["graph", "health", "repairs"],
      },
      {
        href: "/admin/graph/repairs",
        label: "Graph Repairs",
        description: "Repair-Tickets",
        keywords: ["graph", "repairs"],
      },
      {
        href: "/admin/evidence/claims",
        label: "Evidence Claims",
        description: "Claims sichten und mappen",
        keywords: ["evidence", "claims"],
      },
      {
        href: "/admin/evidence/items",
        label: "Evidence Items",
        description: "Quellen und Evidence-Items",
        keywords: ["evidence", "sources"],
      },
      {
        href: "/admin/responsibility",
        label: "Responsibility Directory",
        description: "Zuständigkeiten pflegen",
        keywords: ["responsibility", "paths"],
      },
      {
        href: "/admin/eventualities",
        label: "Eventualitäten",
        description: "Snapshots & Status",
        keywords: ["eventualities", "scenarios"],
      },
      {
        href: "/admin/feeds",
        label: "Feed Control",
        description: "Pull, Analyze, Batch, Config",
        keywords: ["feeds", "pipeline", "batch", "pull", "analyze"],
      },
      {
        href: "/admin/feeds/drafts",
        label: "Feed Drafts",
        description: "Entwürfe aus Feeds",
        keywords: ["feeds", "drafts"],
      },
      {
        href: "/admin/feeds/anlassraum",
        label: "Anlassräume",
        description: "Feed -> Anlassraum -> Outputs",
        keywords: ["feeds", "anlassraum", "outputs", "cluster"],
      },
      {
        href: "/admin/themenradar",
        label: "VOG Themenradar",
        description: "Themen qualifizieren und review-ready vorbereiten",
        keywords: ["themenradar", "operator", "review-first", "campaign"],
      },
      {
        href: "/admin/marketing",
        label: "Marketing-Zentrale",
        description: "Kampagnen steuern, Ergebnisse prüfen, Arbeit delegieren",
        keywords: ["marketing", "campaign", "results", "delegation", "growth"],
      },
      {
        href: "/admin/anlassraeume",
        label: "Anlassraum Operations",
        description: "Read-only Operations-Surface für Anlassräume",
        keywords: ["anlassraum", "operations", "read-only", "admin"],
      },
      {
        href: "/admin/pilot",
        label: "Pilot Control",
        description: "Settings + Run Buttons",
        keywords: ["pilot", "settings", "budget", "feeds", "factcheck"],
      },
      {
        href: "/admin/acquisition",
        label: "Akquise Dashboard",
        description: "Regionen, Feeds, Status",
        keywords: ["acquisition", "feeds", "regions", "outreach"],
      },
      {
        href: "/admin/regions",
        label: "Regionen Übersicht",
        description: "Betreiber-/Admin-Index zu Verwaltung, Akteuren und Signalen",
        keywords: ["region", "verwaltung", "actors", "signals", "cockpit"],
      },
      {
        href: "/admin/research/tasks",
        label: "Research Tasks",
        description: "Recherche-Aufgaben",
        keywords: ["research", "tasks"],
      },
      {
        href: "/admin/campaigns",
        label: "Campaigns",
        description: "Kampagnen & Sessions",
        keywords: ["campaigns", "sessions", "qr"],
      },
      {
        href: "/admin/media",
        label: "Media & TV",
        description: "QR-Sets, Live-Trends, NPS",
        keywords: ["media", "tv", "qr", "nps", "live"],
      },
      {
        href: "/admin/projects",
        label: "Projekte",
        description: "Themenpakete & Optionen",
        keywords: ["projects", "topics", "options"],
      },
      {
        href: "/admin/support",
        label: "Support",
        description: "Pledges & mark-paid",
        keywords: ["support", "pledges", "crowdfunding"],
      },
      {
        href: "/admin/contributions",
        label: "Community Contributions",
        description: "Vorschläge moderieren",
        keywords: ["contributions", "community", "moderation"],
      },
      {
        href: "/admin/create/attach-drafts",
        label: "Create Attach Queue",
        description: "Prepare-Attach Drafts manuell reviewen",
        keywords: ["create", "attach", "drafts", "review", "queue"],
      },
      {
        href: "/admin/create/attach-drafts/history-maintenance",
        label: "Create History Maintenance",
        description: "Dry-run Diagnose für Legacy-History-Events",
        keywords: ["create", "history", "maintenance", "backfill", "dry-run"],
      },
      {
        href: "/admin/reports",
        label: "Reports",
        description: "Topic- und Region-Reports",
        keywords: ["reports", "topics", "regions"],
      },
      {
        href: "/admin/reports/assets",
        label: "Report Assets",
        description: "Revisionen & Freigaben",
        keywords: ["reports", "assets", "publish"],
      },
      {
        href: "/admin/factcheck",
        label: "Factcheck Review",
        description: "Manuelle Factchecks freigeben",
        keywords: ["factcheck", "editorial", "review"],
      },
      {
        href: "/admin/pitch",
        label: "Pitch Studio",
        description: "Region Pitch & Landing",
        keywords: ["pitch", "region", "landing", "feeds"],
      },
    ],
  },
  {
    title: "Telemetry & AI",
    items: [
      {
        href: "/admin/telemetry/ai",
        label: "AI Overview",
        description: "Kosten, Tokens, Errors",
        keywords: ["ai", "usage", "cost"],
        match: "exact",
      },
      {
        href: "/admin/telemetry/ai/usage",
        label: "AI Usage",
        description: "Provider- und Pipeline-Usage",
        keywords: ["usage", "providers"],
      },
      {
        href: "/admin/telemetry/ai/dashboard",
        label: "AI Live Log",
        description: "Letzte Aufrufe & Fehler",
        keywords: ["live", "events", "errors"],
      },
      {
        href: "/admin/telemetry/ai/orchestrator",
        label: "AI Orchestrator",
        description: "Smoke-Test je Provider",
        keywords: ["smoke", "orchestrator", "probe"],
      },
      {
        href: "/admin/telemetry/ai/models",
        label: "AI Models",
        description: "Lifecycle, Drift & Routing-Tiers",
        keywords: ["models", "lifecycle", "routing", "drift", "retired"],
      },
      {
        href: "/admin/telemetry/ai/flow",
        label: "AI Flow Health",
        description: "Feeds -> Analyze -> Drafts",
        keywords: ["flow", "pipeline"],
      },
      {
        href: "/admin/telemetry/identity",
        label: "Identity Telemetry",
        description: "Legitimation & Status",
        keywords: ["identity", "telemetry"],
      },
    ],
  },
  {
    title: "System & Config",
    items: [
      {
        href: "/admin/errors",
        label: "Error Logs",
        description: "Systemfehler & Trace IDs",
        keywords: ["errors", "logs", "trace"],
      },
      {
        href: "/admin/audit",
        label: "Audit Logs",
        description: "Mutationen & Nachvollziehbarkeit",
        keywords: ["audit", "trail", "events"],
      },
      {
        href: "/admin/settings",
        label: "Admin Settings",
        description: "Pricing & Konfiguration",
        keywords: ["settings", "pricing"],
      },
      {
        href: "/admin/analytics",
        label: "Analytics (Legacy)",
        description: "Legacy KPI-Sicht",
        keywords: ["analytics", "legacy"],
      },
    ],
  },
];

export const TOTAL_NAV_ITEMS = NAV_SECTIONS.reduce(
  (sum, section) => sum + section.items.length,
  0,
);

export function flattenNavItems(sections: NavSection[] = NAV_SECTIONS): NavItem[] {
  return sections.flatMap((section) => section.items);
}
