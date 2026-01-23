import { notFound } from "next/navigation";
import { coreCol } from "@core/db/triMongo";
import { getEngagementLevel } from "@features/user/engagement";

export const dynamic = "force-dynamic";

type UserDoc = {
  name?: string | null;
  createdAt?: Date | string | null;
  profile?: {
    displayName?: string | null;
    headline?: string | null;
    bio?: string | null;
    tagline?: string | null;
    publicLocation?: {
      city?: string | null;
      region?: string | null;
      countryCode?: string | null;
    };
    topTopics?: Array<{ key?: string; title?: string; statement?: string | null }>;
    publicFlags?: {
      showRealName?: boolean;
      showCity?: boolean;
      showJoinDate?: boolean;
      showEngagementLevel?: boolean;
      showStats?: boolean;
      showMembership?: boolean;
    };
  };
  publicFlags?: {
    showRealName?: boolean;
    showCity?: boolean;
    showJoinDate?: boolean;
    showEngagementLevel?: boolean;
    showStats?: boolean;
    showMembership?: boolean;
  };
  usage?: {
    xp?: number;
    swipeCountTotal?: number;
  };
  stats?: {
    xp?: number;
    swipeCountTotal?: number;
  };
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const Users = await coreCol<UserDoc>("users");
  const user = await Users.findOne(
    { "profile.publicShareId": shareId },
    {
      projection: {
        name: 1,
        createdAt: 1,
        profile: 1,
        publicFlags: 1,
        usage: 1,
        stats: 1,
      },
    },
  );

  if (!user) {
    notFound();
  }

  const flags = user.profile?.publicFlags ?? user.publicFlags ?? {};
  if (!flags.showMembership) {
    notFound();
  }

  const displayName = flags.showRealName
    ? user.profile?.displayName?.trim() || user.name?.trim() || "Mitglied bei eDebatte"
    : "Mitglied bei eDebatte";
  const headline = user.profile?.headline?.trim() || null;
  const tagline = user.profile?.tagline?.trim() || null;
  const bio = user.profile?.bio?.trim() || null;
  const location = user.profile?.publicLocation
    ? [user.profile.publicLocation.city, user.profile.publicLocation.region, user.profile.publicLocation.countryCode]
        .filter(Boolean)
        .join(" · ")
    : null;
  const topTopics = Array.isArray(user.profile?.topTopics)
    ? user.profile.topTopics
        .map((topic) => ({
          title: topic.title || topic.key || "Thema",
          statement: topic.statement ?? null,
        }))
        .filter((topic) => Boolean(topic.title))
        .slice(0, 3)
    : [];

  const xp = user.usage?.xp ?? user.stats?.xp ?? 0;
  const swipesTotal = user.usage?.swipeCountTotal ?? user.stats?.swipeCountTotal ?? 0;
  const engagementLevel = getEngagementLevel(Number(xp));
  const joinedAt =
    user.createdAt instanceof Date
      ? user.createdAt
      : user.createdAt
        ? new Date(user.createdAt)
        : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <section className="rounded-3xl bg-white/95 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
              {getInitials(displayName)}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Öffentliches Profil</p>
              <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
              {tagline && <p className="text-sm text-slate-600">{tagline}</p>}
              {flags.showCity && location && <p className="text-xs text-slate-500">{location}</p>}
            </div>
            <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Mitglied
            </div>
          </div>

          {(headline || bio) && (
            <div className="mt-5 space-y-2">
              {headline && <p className="text-lg font-semibold text-slate-900">{headline}</p>}
              {bio && <p className="text-sm leading-relaxed text-slate-700">{bio}</p>}
            </div>
          )}
        </section>

        {(flags.showStats || flags.showEngagementLevel || flags.showJoinDate) && (
          <section className="grid gap-3 rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-100 sm:grid-cols-3">
            {flags.showEngagementLevel && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Engagement</p>
                <p className="text-lg font-semibold text-slate-900">{engagementLevel}</p>
              </div>
            )}
            {flags.showStats && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">XP</p>
                <p className="text-lg font-semibold text-slate-900">{xp}</p>
              </div>
            )}
            {flags.showStats && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Swipes</p>
                <p className="text-lg font-semibold text-slate-900">{swipesTotal}</p>
              </div>
            )}
            {flags.showJoinDate && joinedAt && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mitglied seit</p>
                <p className="text-lg font-semibold text-slate-900">{joinedAt.toLocaleDateString("de-DE")}</p>
              </div>
            )}
          </section>
        )}

        {topTopics.length > 0 && (
          <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Top-Themen</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topTopics.map((topic) => (
                <div key={topic.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
                  {topic.statement && <p className="text-xs text-slate-600">{topic.statement}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 text-xs text-slate-500">
          Dieses Profil wird nur angezeigt, wenn der/die Nutzer:in der öffentlichen Darstellung zugestimmt hat.
        </section>
      </div>
    </main>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
