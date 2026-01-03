import { NextRequest, NextResponse } from "next/server";
import { coreCol, getCol } from "@core/db/triMongo";
import { evidenceItemsCol } from "@core/evidence/db";
import { findEvidenceClaims, type EvidenceClaimWithMeta } from "@core/evidence/query";
import type { EvidenceItemDoc } from "@core/evidence/types";
import { voteDraftsCol } from "@features/feeds/db";
import type { VoteDraftDoc } from "@features/feeds/types";
import { eventualitySnapshotsCol } from "@core/eventualities/db";
import type { EventualitySnapshotDoc } from "@core/eventualities/types";
import type { UserRole } from "@/types/user";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

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

type SearchItem = {
  id: string;
  group:
    | "Nutzer"
    | "Newsletter"
    | "Research Tasks"
    | "Feed Drafts"
    | "Eventualitaeten"
    | "Evidence Claims"
    | "Evidence Items"
    | "Reports";
  label: string;
  description?: string | null;
  href: string;
  badge?: string | null;
};

const LIMIT_USERS = 6;
const LIMIT_NEWSLETTER = 5;
const LIMIT_TASKS = 5;
const LIMIT_DRAFTS = 5;
const LIMIT_EVENTUALITIES = 5;
const LIMIT_CLAIMS = 5;
const LIMIT_ITEMS = 5;

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ ok: true, items: [] as SearchItem[] });
  }

  const regex = new RegExp(escapeRegExp(query), "i");

  const [users, newsletter, tasks, drafts, eventualities, claims, items] = await Promise.all([
    loadUsers(regex),
    loadNewsletter(regex),
    loadResearchTasks(regex),
    loadFeedDrafts(regex),
    loadEventualitySnapshots(regex),
    loadEvidenceClaims(query),
    loadEvidenceItems(query, regex),
  ]);

  const results: SearchItem[] = [];

  users.forEach((doc) => {
    const roles = Array.isArray(doc.roles)
      ? doc.roles
      : doc.role
      ? [doc.role]
      : [];
    const name = doc.name?.trim() || null;
    const label = name || doc.email || "Unbekannter Nutzer";
    const descriptionParts: string[] = [];
    if (name) descriptionParts.push(doc.email);
    if (roles.length) descriptionParts.push(roles.join(", "));
    if (doc.settings?.newsletterOptIn || doc.newsletterOptIn) descriptionParts.push("Newsletter");
    const description = descriptionParts.filter(Boolean).join(" · ");
    const hrefQuery = doc.email || name || query;
    results.push({
      id: `user:${String(doc._id)}`,
      group: "Nutzer",
      label,
      description,
      href: `/admin/users?q=${encodeURIComponent(hrefQuery)}`,
      badge: roles[0] ?? null,
    });
  });

  newsletter.forEach((doc) => {
    const name = doc.name?.trim() || null;
    const label = doc.email || "Newsletter Abo";
    const description = name ? name : null;
    results.push({
      id: `newsletter:${String(doc._id)}`,
      group: "Newsletter",
      label,
      description,
      href: `/admin/newsletter?q=${encodeURIComponent(doc.email)}`,
    });
  });

  tasks.forEach((task) => {
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
  });

  drafts.forEach((draft) => {
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
  });

  eventualities.forEach((snapshot) => {
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
  });

  claims.forEach((entry) => {
    const claim = entry.claim;
    const label = claim.text?.trim() || "Claim";
    const descParts = [
      claim.locale ?? null,
      claim.regionCode ?? "global",
      claim.meta?.pipeline ?? null,
    ].filter(Boolean);
    results.push({
      id: `claim:${claim._id.toString()}`,
      group: "Evidence Claims",
      label: label.length > 140 ? `${label.slice(0, 140)}…` : label,
      description: descParts.join(" · "),
      href: `/admin/evidence/claims/${claim._id.toString()}`,
    });
  });

  items.forEach((doc) => {
    const label = doc.shortTitle?.trim() || doc.publisher || doc.url;
    const descParts = [doc.publisher, doc.sourceKind].filter(Boolean);
    results.push({
      id: `evidence:${doc._id.toString()}`,
      group: "Evidence Items",
      label,
      description: descParts.join(" · "),
      href: `/admin/evidence/items/${doc._id.toString()}`,
    });
  });

  if (query.length >= 2) {
    results.push(
      {
        id: `report-topic:${query}`,
        group: "Reports",
        label: `Topic Report: ${query}`,
        description: "Oeffnet den Topic-Report",
        href: `/admin/reports/topic/${encodeURIComponent(query)}`,
      },
      {
        id: `report-region:${query}`,
        group: "Reports",
        label: `Region Report: ${query}`,
        description: "Oeffnet den Region-Report",
        href: `/admin/reports/region/${encodeURIComponent(query)}`,
      },
    );
  }

  return NextResponse.json({ ok: true, items: results });
}

async function loadUsers(regex: RegExp): Promise<UserDoc[]> {
  const users = await getCol<UserDoc>("users");
  const docs = await users
    .find({
      $or: [
        { email: { $regex: regex } },
        { email_lc: { $regex: regex } },
        { name: { $regex: regex } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_USERS)
    .toArray();
  return docs;
}

async function loadNewsletter(regex: RegExp): Promise<UserDoc[]> {
  const users = await getCol<UserDoc>("users");
  const docs = await users
    .find({
      $and: [
        {
          $or: [
            { email: { $regex: regex } },
            { email_lc: { $regex: regex } },
            { name: { $regex: regex } },
          ],
        },
        {
          $or: [{ "settings.newsletterOptIn": true }, { newsletterOptIn: true }],
        },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_NEWSLETTER)
    .toArray();
  return docs;
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

async function loadResearchTasks(regex: RegExp): Promise<
  Array<{
    id: string;
    title: string;
    description?: string;
    kind?: string;
    level?: string;
    status?: string;
    tags?: string[];
  }>
> {
  if (regex.source.length < 2) return [];
  const col = coreCol<ResearchTaskDoc>("researchTasks");
  const docs = await col
    .find({
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { tags: { $regex: regex } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_TASKS)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id?.toString?.() ?? String(doc._id),
    title: doc.title ?? "Research Task",
    description: doc.description ?? undefined,
    kind: doc.kind ?? undefined,
    level: doc.level ?? undefined,
    status: doc.status ?? undefined,
    tags: doc.tags ?? undefined,
  }));
}

async function loadFeedDrafts(regex: RegExp): Promise<
  Array<{
    id: string;
    title: string;
    status?: VoteDraftDoc["status"];
    regionCode?: VoteDraftDoc["regionCode"];
    pipeline?: VoteDraftDoc["pipeline"];
  }>
> {
  if (regex.source.length < 2) return [];
  const drafts = await voteDraftsCol();
  const docs = await drafts
    .find({
      $or: [
        { title: { $regex: regex } },
        { sourceUrl: { $regex: regex } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(LIMIT_DRAFTS)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id?.toString?.() ?? String(doc._id),
    title: doc.title ?? "Feed Draft",
    status: doc.status,
    regionCode: doc.regionCode ?? undefined,
    pipeline: doc.pipeline ?? undefined,
  }));
}

async function loadEventualitySnapshots(regex: RegExp): Promise<EventualitySnapshotDoc[]> {
  if (regex.source.length < 2) return [];
  const col = await eventualitySnapshotsCol();
  const docs = await col
    .find({
      $or: [
        { contributionId: { $regex: regex } },
        { userIdMasked: { $regex: regex } },
      ],
    })
    .sort({ updatedAt: -1 })
    .limit(LIMIT_EVENTUALITIES)
    .toArray();
  return docs;
}

async function loadEvidenceClaims(query: string): Promise<EvidenceClaimWithMeta[]> {
  if (query.length < 2) return [];
  const result = await findEvidenceClaims({
    textQuery: query,
    limit: LIMIT_CLAIMS,
    offset: 0,
  });
  return result.items ?? [];
}

async function loadEvidenceItems(query: string, regex: RegExp): Promise<EvidenceItemDoc[]> {
  if (query.length < 2) return [];
  const col = await evidenceItemsCol();
  const docs = await col
    .find({
      $and: [
        {
          $or: [
            { shortTitle: { $regex: regex } },
            { publisher: { $regex: regex } },
            { url: { $regex: regex } },
          ],
        },
        { $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }] },
      ],
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(LIMIT_ITEMS)
    .toArray();
  return docs;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
