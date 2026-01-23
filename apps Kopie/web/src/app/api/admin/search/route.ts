import { NextRequest, NextResponse } from "next/server";
import { ObjectId, coreCol, getCol } from "@core/db/triMongo";
import { evidenceItemsCol } from "@core/evidence/db";
import { findEvidenceClaims, type EvidenceClaimWithMeta } from "@core/evidence/query";
import type { EvidenceItemDoc } from "@core/evidence/types";
import { voteDraftsCol } from "@features/feeds/db";
import type { VoteDraftDoc } from "@features/feeds/types";
import { eventualitySnapshotsCol } from "@core/eventualities/db";
import type { EventualitySnapshotDoc } from "@core/eventualities/types";
import { orgMembershipsCol, orgsCol } from "@features/org/db";
import type { OrgMembershipDoc } from "@features/org/types";
import { editorialItemsCol } from "@features/editorial/db";
import type { EditorialItemDoc } from "@features/editorial/types";
import { reportAssetsCol } from "@features/reportsAssets/db";
import type { ReportAssetDoc } from "@features/reportsAssets/types";
import { graphRepairsCol } from "@features/graphAdmin/db";
import type { GraphRepairDoc } from "@features/graphAdmin/types";
import { recentEvents } from "@features/ai/telemetry";
import type { AiTelemetryEvent } from "@features/ai/telemetry";
import { getEffectiveRoutePolicies } from "@core/access/db";
import type { RoutePolicy, UserRouteOverride } from "@features/access/types";
import type { AiUsageDailyRow } from "@core/telemetry/aiUsageTypes";
import { ErrorLogModel } from "@/models/ErrorLog";
import type { UserRole } from "@/types/user";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import type { AuditEventDoc } from "@features/audit/types";

type UserDoc = {
  _id: any;
  email: string;
  email_lc?: string | null;
  name?: string | null;
  roles?: UserRole[];
  role?: UserRole | null;
  settings?: { newsletterOptIn?: boolean | null };
  newsletterOptIn?: boolean | null;
  createdAt?: Date;
};

type SearchGroup =
  | "Nutzer"
  | "Newsletter"
  | "Orgs"
  | "Org Members"
  | "Editorial Items"
  | "Report Assets"
  | "Audit Events"
  | "Graph Repairs"
  | "Research Tasks"
  | "Research Contributions"
  | "Access Policies"
  | "Access Overrides"
  | "Feed Drafts"
  | "Eventualitaeten"
  | "Responsibility Actors"
  | "Evidence Claims"
  | "Evidence Items"
  | "AI Telemetry"
  | "AI Usage Daily"
  | "System Errors"
  | "Reports";

type SearchItem = {
  id: string;
  group: SearchGroup;
  label: string;
  description?: string | null;
  href: string;
  badge?: string | null;
};

const LIMIT_USERS = 6;
const LIMIT_NEWSLETTER = 5;
const LIMIT_ORGS = 6;
const LIMIT_ORG_MEMBERS = 6;
const LIMIT_EDITORIAL_ITEMS = 6;
const LIMIT_REPORT_ASSETS = 6;
const LIMIT_AUDIT_EVENTS = 6;
const LIMIT_GRAPH_REPAIRS = 6;
const LIMIT_TASKS = 5;
const LIMIT_CONTRIBUTIONS = 5;
const LIMIT_POLICIES = 6;
const LIMIT_OVERRIDES = 6;
const LIMIT_DRAFTS = 5;
const LIMIT_EVENTUALITIES = 5;
const LIMIT_ACTORS = 5;
const LIMIT_CLAIMS = 5;
const LIMIT_ITEMS = 5;
const LIMIT_AI_EVENTS = 6;
const LIMIT_USAGE_DAILY = 6;
const LIMIT_ERRORS = 6;

// Guardrails (avoid expensive regex / huge payload)
const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 80;

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const raw = req.nextUrl.searchParams.get("q") ?? "";
  const query = raw.trim();

  if (!query) return NextResponse.json({ ok: true, items: [] as SearchItem[] });

  // Hard limit to avoid pathological regex strings
  const safeQuery = query.slice(0, MAX_QUERY_LEN);

  // If you want to allow single-char searches for users only, you can tweak this.
  if (safeQuery.length < 1) return NextResponse.json({ ok: true, items: [] as SearchItem[] });

  const regex = buildSafeRegex(safeQuery);

  // Run in parallel but fail-safe (one loader error shouldn't 500 the whole endpoint)
  const [
    users,
    newsletter,
    orgs,
    orgMembers,
    editorialItems,
    reportAssets,
    tasks,
    contributions,
    policies,
    drafts,
    eventualities,
    actors,
    auditEvents,
    graphRepairs,
    aiEvents,
    aiDaily,
    errors,
    claims,
    items,
  ] = await Promise.all([
    safeCall(() => loadUsers(regex), [] as UserDoc[]),
    safeCall(() => loadNewsletter(regex), [] as UserDoc[]),
    safeCall(() => loadOrgs(regex), [] as OrgHit[]),
    safeCall(() => loadOrgMembers(regex), [] as OrgMemberHit[]),
    safeCall(() => loadEditorialItems(regex), [] as EditorialItemHit[]),
    safeCall(() => loadReportAssets(regex), [] as ReportAssetHit[]),
    safeCall(() => loadResearchTasks(regex), [] as ResearchTaskHit[]),
    safeCall(() => loadResearchContributions(regex), [] as ResearchContributionHit[]),
    safeCall(() => loadAccessPolicies(regex), [] as AccessPolicyHit[]),
    safeCall(() => loadFeedDrafts(regex), [] as FeedDraftHit[]),
    safeCall(() => loadEventualitySnapshots(regex), [] as EventualitySnapshotDoc[]),
    safeCall(() => loadResponsibilityActors(regex), [] as ResponsibilityActorHit[]),
    safeCall(() => loadAuditEvents(regex), [] as AuditEventHit[]),
    safeCall(() => loadGraphRepairs(regex), [] as GraphRepairHit[]),
    safeCall(() => loadAiTelemetry(safeQuery), [] as AiTelemetryEvent[]),
    safeCall(() => loadAiUsageDaily(safeQuery, regex), [] as AiUsageDailyRow[]),
    safeCall(() => loadErrorLogs(regex), [] as ErrorLogHit[]),
    safeCall(() => loadEvidenceClaims(safeQuery), [] as EvidenceClaimWithMeta[]),
    safeCall(() => loadEvidenceItems(safeQuery, regex), [] as EvidenceItemDoc[]),
  ]);

  const results: SearchItem[] = [];

  // Users
  for (const doc of users) {
    const roles = Array.isArray(doc.roles) ? doc.roles : doc.role ? [doc.role] : [];
    const name = doc.name?.trim() || null;
    const label = name || doc.email || "Unbekannter Nutzer";
    const descriptionParts: string[] = [];
    if (name) descriptionParts.push(doc.email);
    if (roles.length) descriptionParts.push(roles.join(", "));
    if (doc.settings?.newsletterOptIn || doc.newsletterOptIn) descriptionParts.push("Newsletter");
    const description = descriptionParts.filter(Boolean).join(" · ");
    const hrefQuery = doc.email || name || safeQuery;

    results.push({
      id: `user:${String(doc._id)}`,
      group: "Nutzer",
      label,
      description,
      href: `/admin/users?q=${encodeURIComponent(hrefQuery)}`,
      badge: roles[0] ?? null,
    });
  }

  const userMap = new Map<string, UserDoc>();
  users.forEach((doc) => userMap.set(toId(doc._id), doc));

  // Newsletter (subset of users)
  for (const doc of newsletter) {
    const name = doc.name?.trim() || null;
    results.push({
      id: `newsletter:${String(doc._id)}`,
      group: "Newsletter",
      label: doc.email || "Newsletter Abo",
      description: name ? name : null,
      href: `/admin/newsletter?q=${encodeURIComponent(doc.email)}`,
    });
  }

  // Orgs
  for (const org of orgs) {
    const descParts = [org.slug ?? null, org.archivedAt ? "archiviert" : null].filter(Boolean);
    results.push({
      id: `org:${org.id}`,
      group: "Orgs",
      label: org.name || org.slug || "Organisation",
      description: descParts.join(" · "),
      href: `/admin/orgs/${encodeURIComponent(org.id)}`,
      badge: org.archivedAt ? "archived" : null,
    });
  }

  // Org Members
  for (const member of orgMembers) {
    const label = member.email || member.invitedEmail || member.name || "Org Mitglied";
    const orgLabel = member.orgName || member.orgSlug || member.orgId;
    const descParts = [orgLabel, member.role, member.status].filter(Boolean);
    results.push({
      id: `org-member:${member.id}`,
      group: "Org Members",
      label,
      description: descParts.join(" · "),
      href: `/admin/orgs/${encodeURIComponent(member.orgId)}`,
      badge: member.status ?? null,
    });
  }

  // Editorial Items
  for (const item of editorialItems) {
    const rawLabel = item.title || item.summary || "Editorial Item";
    const label = rawLabel.length > 140 ? `${rawLabel.slice(0, 140)}…` : rawLabel;
    const descParts = [
      item.status ?? null,
      item.topicKey ?? null,
      item.regionCode ?? null,
      item.orgId ? `Org ${shortId(item.orgId)}` : null,
    ].filter(Boolean);

    results.push({
      id: `editorial:${item.id}`,
      group: "Editorial Items",
      label,
      description: descParts.join(" · "),
      href: `/admin/editorial/items/${encodeURIComponent(item.id)}`,
      badge: item.status ?? null,
    });
  }

  // Report Assets
  for (const asset of reportAssets) {
    const keyLabel = asset.key?.topicKey || asset.key?.regionCode || asset.key?.slug || asset.kind;
    const label = `${asset.kind}: ${keyLabel}`;
    const descParts = [asset.status ?? null, asset.orgId ? `Org ${shortId(asset.orgId)}` : null].filter(Boolean);

    results.push({
      id: `report-asset:${asset.id}`,
      group: "Report Assets",
      label,
      description: descParts.join(" · "),
      href: `/admin/reports/assets/${encodeURIComponent(asset.id)}`,
      badge: asset.status ?? null,
    });
  }

  // Research Tasks
  for (const task of tasks) {
    const label = task.title?.trim() || "Research Task";
    const meta = [task.kind, task.level, task.status].filter(Boolean).join(" · ");
    const tags = task.tags?.length ? `Tags: ${task.tags.slice(0, 3).join(", ")}` : null;
    const description = [meta, tags].filter(Boolean).join(" · ");

    results.push({
      id: `task:${task.id}`,
      group: "Research Tasks",
      label,
      description,
      href: `/admin/research/tasks?taskId=${encodeURIComponent(task.id)}`,
      badge: task.status ?? null,
    });
  }

  // Access Policies
  for (const policy of policies) {
    const groupLabel = policy.defaultGroups?.length ? policy.defaultGroups.join(", ") : "—";
    const descParts = [
      policy.routeId,
      policy.pathPattern,
      policy.allowAnonymous ? "öffentlich" : "privat",
      policy.loginOnly ? "login-only" : null,
      `Gruppen: ${groupLabel}`,
    ].filter(Boolean);

    results.push({
      id: `policy:${policy.routeId}`,
      group: "Access Policies",
      label: policy.label ?? policy.routeId,
      description: descParts.join(" · "),
      href: `/admin/access?q=${encodeURIComponent(policy.routeId)}`,
    });
  }

  const accessOverrides = await safeCall(
    () => loadAccessOverrides(regex, Array.from(userMap.keys())),
    [] as AccessOverrideHit[],
  );

  // Access Overrides
  for (const override of accessOverrides) {
    const user = userMap.get(override.userId);
    const userLabel = user?.email || user?.name || override.userId;
    const descParts = [
      override.routeId,
      override.mode,
      override.expiresAt ? `bis ${formatDate(override.expiresAt)}` : null,
      override.reason ?? null,
    ].filter(Boolean);

    results.push({
      id: `override:${override.userId}:${override.routeId}`,
      group: "Access Overrides",
      label: `${userLabel} · ${override.routeId}`,
      description: descParts.join(" · "),
      href: `/admin/access/users/${encodeURIComponent(override.userId)}`,
      badge: override.mode,
    });
  }

  // Research Contributions
  for (const contribution of contributions) {
    const rawLabel = contribution.summary?.trim() || "Research Beitrag";
    const label = rawLabel.length > 140 ? `${rawLabel.slice(0, 140)}…` : rawLabel;
    const descParts = [
      contribution.taskTitle ?? null,
      contribution.status ? `Status: ${contribution.status}` : null,
    ].filter(Boolean);

    results.push({
      id: `research-contrib:${contribution.id}`,
      group: "Research Contributions",
      label,
      description: descParts.join(" · "),
      href: `/admin/research/tasks?taskId=${encodeURIComponent(contribution.taskId)}`,
      badge: contribution.status ?? null,
    });
  }

  // Feed Drafts
  for (const draft of drafts) {
    const label = draft.title?.trim() || "Feed Draft";
    const descParts = [
      draft.status ? `Status: ${draft.status}` : null,
      draft.regionCode ?? null,
      draft.pipeline ?? null,
    ].filter(Boolean);

    results.push({
      id: `draft:${draft.id}`,
      group: "Feed Drafts",
      label,
      description: descParts.join(" · "),
      href: `/admin/feeds/drafts/${encodeURIComponent(draft.id)}`,
      badge: draft.status ?? null,
    });
  }

  // Eventualities
  for (const snapshot of eventualities) {
    const descParts = [
      snapshot.locale ?? null,
      snapshot.reviewed ? "Review ok" : "Offen",
      `${snapshot.nodesCount ?? 0} Nodes`,
      `${snapshot.treesCount ?? 0} Trees`,
    ].filter(Boolean);

    results.push({
      id: `eventuality:${snapshot.contributionId}`,
      group: "Eventualitaeten",
      label: snapshot.contributionId,
      description: descParts.join(" · "),
      href: `/admin/eventualities/${encodeURIComponent(snapshot.contributionId)}`,
      badge: snapshot.reviewed ? "reviewed" : "open",
    });
  }

  // Responsibility Actors
  for (const actor of actors) {
    const label = actor.name || actor.actorKey || "Akteur";
    const descParts = [
      actor.actorKey && actor.name && actor.actorKey !== actor.name ? actor.actorKey : null,
      actor.level ?? null,
      actor.role ?? null,
      actor.regionId ?? null,
      actor.isActive === false ? "inaktiv" : null,
    ].filter(Boolean);

    results.push({
      id: `actor:${actor.id}`,
      group: "Responsibility Actors",
      label,
      description: descParts.join(" · "),
      href: `/admin/responsibility/directory?q=${encodeURIComponent(actor.actorKey || actor.name || safeQuery)}`,
    });
  }

  // Evidence Claims
  for (const entry of claims) {
    const claim = entry.claim;
    const rawLabel = claim.text?.trim() || "Claim";
    const descParts = [claim.locale ?? null, claim.regionCode ?? "global", claim.meta?.pipeline ?? null].filter(Boolean);

    results.push({
      id: `claim:${claim._id.toString()}`,
      group: "Evidence Claims",
      label: rawLabel.length > 140 ? `${rawLabel.slice(0, 140)}…` : rawLabel,
      description: descParts.join(" · "),
      href: `/admin/evidence/claims/${claim._id.toString()}`,
    });
  }

  // Evidence Items
  for (const doc of items) {
    const label = doc.shortTitle?.trim() || doc.publisher || doc.url;
    const descParts = [doc.publisher, doc.sourceKind].filter(Boolean);

    results.push({
      id: `evidence:${doc._id.toString()}`,
      group: "Evidence Items",
      label,
      description: descParts.join(" · "),
      href: `/admin/evidence/items/${doc._id.toString()}`,
    });
  }

  // AI Telemetry (recent)
  for (const event of aiEvents) {
    const status = event.success ? "ok" : "error";
    const label = `${event.provider} · ${event.pipeline}`;
    const descParts = [
      event.task ? `task: ${event.task}` : null,
      event.model ? `model: ${event.model}` : null,
      event.errorKind ? `error: ${event.errorKind}` : null,
    ].filter(Boolean);

    results.push({
      id: `ai:${event.ts}:${event.provider}:${event.pipeline}`,
      group: "AI Telemetry",
      label,
      description: descParts.join(" · "),
      href: "/admin/telemetry/ai/dashboard",
      badge: status,
    });
  }

  // AI Usage Daily (aggregates)
  for (const row of aiDaily) {
    const label = `${row.date} · ${row.provider} · ${row.pipeline}`;
    const descParts = [
      row.region ? `Region: ${row.region}` : null,
      `Calls: ${row.callsTotal}`,
      `Tokens: ${row.tokensTotal}`,
      `Kosten: €${row.costTotalEur.toFixed(2)}`,
      row.callsError ? `Fehler: ${row.callsError}` : null,
    ].filter(Boolean);

    results.push({
      id: `ai-daily:${row.date}:${row.provider}:${row.pipeline}:${row.region ?? "all"}`,
      group: "AI Usage Daily",
      label,
      description: descParts.join(" · "),
      href: "/admin/telemetry/ai/usage?range=30",
      badge: row.provider,
    });
  }

  // System Errors
  for (const log of errors) {
    const rawLabel = log.message?.trim() || "System Error";
    const label = rawLabel.length > 140 ? `${rawLabel.slice(0, 140)}…` : rawLabel;
    const descParts = [log.level ?? null, log.path ?? null, log.traceId ? `trace ${log.traceId}` : null]
      .filter(Boolean);
    results.push({
      id: `error:${log.id}`,
      group: "System Errors",
      label,
      description: descParts.join(" · "),
      href: `/admin/errors/${encodeURIComponent(log.id)}`,
      badge: log.level ?? null,
    });
  }

  // Audit Events
  for (const event of auditEvents) {
    const targetLabel = event.targetType
      ? event.targetId
        ? `${event.targetType} · ${event.targetId}`
        : event.targetType
      : null;
    const descParts = [event.scope, targetLabel, event.reason].filter(Boolean);
    const q = event.targetId || event.action;

    results.push({
      id: `audit:${event.id}`,
      group: "Audit Events",
      label: event.action,
      description: descParts.join(" · "),
      href: `/admin/audit?scope=${encodeURIComponent(event.scope)}&q=${encodeURIComponent(q)}`,
      badge: event.scope ?? null,
    });
  }

  // Graph Repairs
  for (const repair of graphRepairs) {
    const desc = formatRepairPayload(repair.payload);
    results.push({
      id: `graph-repair:${repair.id}`,
      group: "Graph Repairs",
      label: `${repair.type} · ${repair.status}`,
      description: desc ?? null,
      href: `/admin/graph/repairs?type=${encodeURIComponent(repair.type)}&status=${encodeURIComponent(
        repair.status,
      )}`,
      badge: repair.status ?? null,
    });
  }

  // Reports (synthetic)
  if (safeQuery.length >= MIN_QUERY_LEN) {
    results.push(
      {
        id: `report-topic:${safeQuery}`,
        group: "Reports",
        label: `Topic Report: ${safeQuery}`,
        description: "Oeffnet den Topic-Report",
        href: `/admin/reports/topic/${encodeURIComponent(safeQuery)}`,
      },
      {
        id: `report-region:${safeQuery}`,
        group: "Reports",
        label: `Region Report: ${safeQuery}`,
        description: "Oeffnet den Region-Report",
        href: `/admin/reports/region/${encodeURIComponent(safeQuery)}`,
      },
    );
  }

  // Dedupe (by id) + stable sort (group then label)
  const deduped = dedupeById(results).sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group, "de");
    return a.label.localeCompare(b.label, "de");
  });

  return NextResponse.json({ ok: true, items: deduped });
}

/* --------------------------------- loaders -------------------------------- */

async function loadUsers(regex: RegExp): Promise<UserDoc[]> {
  const users = await getCol<UserDoc>("users");
  return users
    .find({
      $or: [{ email: { $regex: regex } }, { email_lc: { $regex: regex } }, { name: { $regex: regex } }],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_USERS)
    .toArray();
}

async function loadNewsletter(regex: RegExp): Promise<UserDoc[]> {
  const users = await getCol<UserDoc>("users");
  return users
    .find({
      $and: [
        {
          $or: [{ email: { $regex: regex } }, { email_lc: { $regex: regex } }, { name: { $regex: regex } }],
        },
        { $or: [{ "settings.newsletterOptIn": true }, { newsletterOptIn: true }] },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_NEWSLETTER)
    .toArray();
}

type OrgHit = {
  id: string;
  name: string;
  slug?: string | null;
  archivedAt?: Date | null;
};

async function loadOrgs(regex: RegExp): Promise<OrgHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await orgsCol();
  const docs = await col
    .find({ $or: [{ name: { $regex: regex } }, { slug: { $regex: regex } }] })
    .sort({ updatedAt: -1 })
    .limit(LIMIT_ORGS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    name: doc.name ?? doc.slug ?? "Organisation",
    slug: doc.slug ?? null,
    archivedAt: doc.archivedAt ?? null,
  }));
}

type OrgMemberHit = {
  id: string;
  orgId: string;
  orgName?: string | null;
  orgSlug?: string | null;
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  invitedEmail?: string | null;
  role?: OrgMembershipDoc["role"];
  status?: OrgMembershipDoc["status"];
};

async function loadOrgMembers(regex: RegExp): Promise<OrgMemberHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await orgMembershipsCol();
  const pipeline: Array<Record<string, unknown>> = [
    {
      $lookup: {
        from: "orgs",
        localField: "orgId",
        foreignField: "_id",
        as: "org",
      },
    },
    { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        $or: [
          { "org.name": { $regex: regex } },
          { "org.slug": { $regex: regex } },
          { "user.email": { $regex: regex } },
          { "user.name": { $regex: regex } },
          { invitedEmail: { $regex: regex } },
        ],
      },
    },
    { $sort: { updatedAt: -1 } },
    { $limit: LIMIT_ORG_MEMBERS },
  ];

  const docs = await col.aggregate(pipeline).toArray();
  return docs.map((doc: any) => ({
    id: toId(doc._id),
    orgId: doc.orgId ? String(doc.orgId) : "",
    orgName: doc.org?.name ?? null,
    orgSlug: doc.org?.slug ?? null,
    userId: doc.userId ? String(doc.userId) : null,
    email: doc.user?.email ?? null,
    name: doc.user?.name ?? null,
    invitedEmail: doc.invitedEmail ?? null,
    role: doc.role,
    status: doc.status,
  }));
}

type EditorialItemHit = {
  id: string;
  orgId?: string | null;
  status?: EditorialItemDoc["status"];
  title?: string | null;
  summary?: string | null;
  topicKey?: string | null;
  regionCode?: string | null;
  updatedAt?: Date | null;
};

async function loadEditorialItems(regex: RegExp): Promise<EditorialItemHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await editorialItemsCol();
  const docs = await col
    .find({
      $or: [
        { "intake.title": { $regex: regex } },
        { "intake.summary": { $regex: regex } },
        { "intake.sourceUrl": { $regex: regex } },
        { "intake.sourceId": { $regex: regex } },
        { "intake.topicKey": { $regex: regex } },
        { "intake.regionCode": { $regex: regex } },
      ],
    })
    .sort({ updatedAt: -1 })
    .limit(LIMIT_EDITORIAL_ITEMS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    orgId: doc.orgId ? String(doc.orgId) : null,
    status: doc.status,
    title: doc.intake?.title ?? null,
    summary: doc.intake?.summary ?? null,
    topicKey: doc.intake?.topicKey ?? null,
    regionCode: doc.intake?.regionCode ?? null,
    updatedAt: doc.updatedAt ?? null,
  }));
}

type ReportAssetHit = {
  id: string;
  orgId?: string | null;
  kind: ReportAssetDoc["kind"];
  status: ReportAssetDoc["status"];
  key: ReportAssetDoc["key"];
  updatedAt?: Date | null;
};

async function loadReportAssets(regex: RegExp): Promise<ReportAssetHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await reportAssetsCol();
  const docs = await col
    .find({
      $or: [
        { kind: { $regex: regex } },
        { status: { $regex: regex } },
        { "key.topicKey": { $regex: regex } },
        { "key.regionCode": { $regex: regex } },
        { "key.slug": { $regex: regex } },
      ],
    })
    .sort({ updatedAt: -1 })
    .limit(LIMIT_REPORT_ASSETS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    orgId: doc.orgId ? String(doc.orgId) : null,
    kind: doc.kind,
    status: doc.status,
    key: doc.key,
    updatedAt: doc.updatedAt ?? null,
  }));
}

type ResearchTaskDoc = {
  _id: any;
  title?: string;
  description?: string;
  kind?: string;
  level?: string;
  status?: string;
  tags?: string[];
  createdAt?: Date;
};

type ResearchTaskHit = {
  id: string;
  title: string;
  description?: string;
  kind?: string;
  level?: string;
  status?: string;
  tags?: string[];
};

async function loadResearchTasks(regex: RegExp): Promise<ResearchTaskHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];

  // IMPORTANT: coreCol(...) is async in your setup => await it
  const col = await coreCol<ResearchTaskDoc>("researchTasks");

  const docs = await col
    .find({
      $or: [{ title: { $regex: regex } }, { description: { $regex: regex } }, { tags: { $regex: regex } }],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_TASKS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    title: doc.title ?? "Research Task",
    description: doc.description ?? undefined,
    kind: doc.kind ?? undefined,
    level: doc.level ?? undefined,
    status: doc.status ?? undefined,
    tags: doc.tags ?? undefined,
  }));
}

type ResearchContributionDoc = {
  _id: any;
  taskId: any;
  authorId?: any;
  summary?: string;
  details?: string;
  status?: string;
  reviewNote?: string;
  createdAt?: Date;
};

type ResearchContributionHit = {
  id: string;
  taskId: string;
  summary?: string;
  status?: string;
  taskTitle?: string | null;
};

async function loadResearchContributions(regex: RegExp): Promise<ResearchContributionHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];

  const col = await coreCol<ResearchContributionDoc>("researchContributions");
  const docs = await col
    .find({
      $or: [
        { summary: { $regex: regex } },
        { details: { $regex: regex } },
        { reviewNote: { $regex: regex } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_CONTRIBUTIONS)
    .toArray();

  if (!docs.length) return [];

  const taskIds = Array.from(new Set(docs.map((doc) => toId(doc.taskId)).filter(Boolean)));
  const taskObjectIds = taskIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const taskMap = new Map<string, string>();
  if (taskObjectIds.length) {
    const tasksCol = await coreCol<ResearchTaskDoc>("researchTasks");
    const taskDocs = await tasksCol
      .find({ _id: { $in: taskObjectIds } } as any)
      .toArray();
    taskDocs.forEach((task) => taskMap.set(toId(task._id), task.title ?? "Research Task"));
  }

  return docs.map((doc) => {
    const taskId = toId(doc.taskId);
    return {
      id: toId(doc._id),
      taskId,
      summary: doc.summary ?? doc.details ?? undefined,
      status: doc.status ?? undefined,
      taskTitle: taskMap.get(taskId) ?? null,
    };
  });
}

type AccessPolicyHit = Pick<
  RoutePolicy,
  "routeId" | "label" | "pathPattern" | "defaultGroups" | "allowAnonymous" | "loginOnly"
>;

async function loadAccessPolicies(regex: RegExp): Promise<AccessPolicyHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const policies = await getEffectiveRoutePolicies();
  const filtered = policies.filter((policy) => {
    const haystack = [
      policy.routeId,
      policy.label,
      policy.pathPattern,
      ...(policy.defaultGroups ?? []),
    ]
      .filter(Boolean)
      .join(" ");
    return regex.test(haystack);
  });
  return filtered.slice(0, LIMIT_POLICIES).map((policy) => ({
    routeId: policy.routeId,
    label: policy.label,
    pathPattern: policy.pathPattern,
    defaultGroups: policy.defaultGroups,
    allowAnonymous: policy.allowAnonymous,
    loginOnly: policy.loginOnly,
  }));
}

type AccessOverrideDoc = UserRouteOverride & {
  _id?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

type AccessOverrideHit = {
  userId: string;
  routeId: string;
  mode: UserRouteOverride["mode"];
  reason?: string | null;
  expiresAt?: Date | null;
};

async function loadAccessOverrides(regex: RegExp, userIds: string[]): Promise<AccessOverrideHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await coreCol<AccessOverrideDoc>("route_overrides");
  const orFilters: any[] = [{ routeId: { $regex: regex } }, { userId: { $regex: regex } }];
  if (userIds.length) {
    orFilters.push({ userId: { $in: userIds } });
  }
  const docs = await col
    .find({ $or: orFilters })
    .sort({ updatedAt: -1 })
    .limit(LIMIT_OVERRIDES)
    .toArray();

  return docs.map((doc) => ({
    userId: doc.userId,
    routeId: doc.routeId,
    mode: doc.mode,
    reason: doc.reason ?? null,
    expiresAt: doc.expiresAt ?? null,
  }));
}

type FeedDraftHit = {
  id: string;
  title: string;
  status?: VoteDraftDoc["status"];
  regionCode?: VoteDraftDoc["regionCode"];
  pipeline?: VoteDraftDoc["pipeline"];
};

async function loadFeedDrafts(regex: RegExp): Promise<FeedDraftHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];

  const drafts = await voteDraftsCol();
  const docs = await drafts
    .find({ $or: [{ title: { $regex: regex } }, { sourceUrl: { $regex: regex } }] })
    .sort({ createdAt: -1 })
    .limit(LIMIT_DRAFTS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    title: doc.title ?? "Feed Draft",
    status: doc.status,
    regionCode: doc.regionCode ?? undefined,
    pipeline: doc.pipeline ?? undefined,
  }));
}

async function loadEventualitySnapshots(regex: RegExp): Promise<EventualitySnapshotDoc[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await eventualitySnapshotsCol();
  return col
    .find({ $or: [{ contributionId: { $regex: regex } }, { userIdMasked: { $regex: regex } }] })
    .sort({ updatedAt: -1 })
    .limit(LIMIT_EVENTUALITIES)
    .toArray();
}

type ResponsibilityActorDoc = {
  _id: any;
  actorKey?: string | null;
  name?: string | null;
  level?: string | null;
  role?: string | null;
  regionId?: string | null;
  description?: string | null;
  isActive?: boolean;
};

type ResponsibilityActorHit = {
  id: string;
  actorKey?: string | null;
  name?: string | null;
  level?: string | null;
  role?: string | null;
  regionId?: string | null;
  isActive?: boolean;
};

async function loadResponsibilityActors(regex: RegExp): Promise<ResponsibilityActorHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await coreCol<ResponsibilityActorDoc>("responsibilityActors");
  const docs = await col
    .find({
      $or: [
        { name: { $regex: regex } },
        { actorKey: { $regex: regex } },
        { description: { $regex: regex } },
        { regionId: { $regex: regex } },
      ],
    })
    .sort({ name: 1 })
    .limit(LIMIT_ACTORS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    actorKey: doc.actorKey ?? null,
    name: doc.name ?? null,
    level: doc.level ?? null,
    role: doc.role ?? null,
    regionId: doc.regionId ?? null,
    isActive: doc.isActive,
  }));
}

type AuditEventHit = {
  id: string;
  scope: AuditEventDoc["scope"];
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
};

async function loadAuditEvents(regex: RegExp): Promise<AuditEventHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await coreCol<AuditEventDoc>("audit_events");
  const docs = await col
    .find({
      $or: [
        { action: { $regex: regex } },
        { scope: { $regex: regex } },
        { "target.type": { $regex: regex } },
        { "target.id": { $regex: regex } },
        { reason: { $regex: regex } },
      ],
    })
    .sort({ at: -1 })
    .limit(LIMIT_AUDIT_EVENTS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    scope: doc.scope,
    action: doc.action,
    targetType: doc.target?.type ?? null,
    targetId: doc.target?.id ?? null,
    reason: doc.reason ?? null,
  }));
}

type GraphRepairHit = {
  id: string;
  type: GraphRepairDoc["type"];
  status: GraphRepairDoc["status"];
  payload?: GraphRepairDoc["payload"];
  createdAt?: Date | null;
};

async function loadGraphRepairs(regex: RegExp): Promise<GraphRepairHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await graphRepairsCol();
  const docs = await col
    .find({
      $or: [
        { type: { $regex: regex } },
        { status: { $regex: regex } },
        { "payload.aId": { $regex: regex } },
        { "payload.bId": { $regex: regex } },
        { "payload.fromId": { $regex: regex } },
        { "payload.toId": { $regex: regex } },
        { "payload.reason": { $regex: regex } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_GRAPH_REPAIRS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    type: doc.type,
    status: doc.status,
    payload: doc.payload,
    createdAt: doc.createdAt ?? null,
  }));
}

async function loadEvidenceClaims(query: string): Promise<EvidenceClaimWithMeta[]> {
  if (query.length < MIN_QUERY_LEN) return [];
  const result = await findEvidenceClaims({ textQuery: query, limit: LIMIT_CLAIMS, offset: 0 });
  return result.items ?? [];
}

async function loadEvidenceItems(query: string, regex: RegExp): Promise<EvidenceItemDoc[]> {
  if (query.length < MIN_QUERY_LEN) return [];
  const col = await evidenceItemsCol();
  return col
    .find({
      $and: [
        {
          $or: [{ shortTitle: { $regex: regex } }, { publisher: { $regex: regex } }, { url: { $regex: regex } }],
        },
        { $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }] },
      ],
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(LIMIT_ITEMS)
    .toArray();
}

async function loadAiTelemetry(query: string): Promise<AiTelemetryEvent[]> {
  if (query.length < MIN_QUERY_LEN) return [];
  const normalized = query.toLowerCase();
  const events = recentEvents(200);
  const filtered = events.filter((event) => {
    const haystack = [
      event.task,
      event.pipeline,
      event.provider,
      event.model,
      event.errorKind,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
  return filtered.slice(-LIMIT_AI_EVENTS).reverse();
}

async function loadAiUsageDaily(query: string, regex: RegExp): Promise<AiUsageDailyRow[]> {
  if (query.length < MIN_QUERY_LEN) return [];
  const col = await coreCol<AiUsageDailyRow>("ai_usage_daily");
  const docs = await col
    .find({
      $or: [
        { provider: { $regex: regex } },
        { pipeline: { $regex: regex } },
        { region: { $regex: regex } },
        { date: { $regex: regex } },
      ],
    })
    .sort({ date: -1 })
    .limit(LIMIT_USAGE_DAILY)
    .toArray();
  return docs;
}

type ErrorLogHit = {
  id: string;
  message: string;
  level?: string | null;
  traceId?: string | null;
  path?: string | null;
};

async function loadErrorLogs(regex: RegExp): Promise<ErrorLogHit[]> {
  if (regex.source.length < MIN_QUERY_LEN) return [];
  const col = await ErrorLogModel.collection();
  const docs = await col
    .find(
      {
        $or: [
          { message: { $regex: regex } },
          { traceId: { $regex: regex } },
          { path: { $regex: regex } },
        ],
      },
      { projection: { message: 1, level: 1, traceId: 1, path: 1, timestamp: 1 } },
    )
    .sort({ timestamp: -1 })
    .limit(LIMIT_ERRORS)
    .toArray();

  return docs.map((doc) => ({
    id: toId(doc._id),
    message: doc.message ?? "System Error",
    level: doc.level ?? null,
    traceId: doc.traceId ?? null,
    path: doc.path ?? null,
  }));
}

/* --------------------------------- helpers -------------------------------- */

function buildSafeRegex(input: string): RegExp {
  // Escape to prevent regex injection; keep "i" for UX
  return new RegExp(escapeRegExp(input), "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toId(v: any): string {
  return v?.toString?.() ?? String(v);
}

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function dedupeById(items: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function shortId(value: string | null | undefined): string | null {
  if (!value) return null;
  const str = String(value);
  return str.length <= 6 ? str : str.slice(-6);
}

function formatRepairPayload(payload?: GraphRepairDoc["payload"]): string | null {
  if (!payload) return null;
  const parts = [
    payload.aId ? `a:${shortId(payload.aId) ?? payload.aId}` : null,
    payload.bId ? `b:${shortId(payload.bId) ?? payload.bId}` : null,
    payload.fromId ? `from:${shortId(payload.fromId) ?? payload.fromId}` : null,
    payload.toId ? `to:${shortId(payload.toId) ?? payload.toId}` : null,
    payload.reason ?? null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
