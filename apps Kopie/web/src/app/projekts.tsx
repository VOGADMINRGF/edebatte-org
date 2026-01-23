// apps/web/src/app/projekts.tsx  (oder /projekt/page.tsx – je nach Route)
// Server Component
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/dbWeb";
// Wenn du die Enums sauber typisieren willst, kannst du auch aus deinem Client importieren:
// import { ContentKind, PublishStatus } from "@/db/web";

export default async function Projekt() {
  // Topics = "Projekte"
  const topics = await prisma.topic.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      tags: { select: { tag: { select: { slug: true, label: true } } } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  // Events-Teaser (zuletzt veröffentlicht)
  const events = await prisma.contentItem.findMany({
    where: {
      // kind: ContentKind.EVENT,
      kind: "EVENT" as any,
      // status: PublishStatus.published,
      status: "published" as any,
      // publishAt in der Vergangenheit ODER null → bereits live
      OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
    },
    select: {
      id: true,
      title: true,
      text: true,
      publishAt: true,
      createdAt: true,
      topic: { select: { slug: true, title: true } },
    },
    orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    take: 6,
  });

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Projekte</h1>
        <p className="text-gray-600">
          Aktuelle Themen & Initiativen aus der Community.
        </p>
      </header>

      {/* Projekte (Topics) */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Themen</h2>
          <Link
            href="/topics"
            className="text-sm text-purple-700 hover:underline"
          >
            alle Themen
          </Link>
        </div>

        {topics.length === 0 ? (
          <p className="text-gray-500">Keine Projekte vorhanden.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t: any) => (
              <li
                key={t.id}
                className="rounded-2xl border p-4 shadow-sm hover:shadow"
              >
                <Link href={`/topics/${t.slug}`} className="block">
                  <h3 className="mb-1 line-clamp-2 text-lg font-semibold">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="mb-3 line-clamp-3 text-sm text-gray-600">
                      {t.description}
                    </p>
                  )}
                  {t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {t.tags.slice(0, 4).map(({ tag }: any) => (
                        <span
                          key={tag.slug}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Events (Teaser) */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Events</h2>
          <Link
            href="/events"
            className="text-sm text-purple-700 hover:underline"
          >
            alle Events
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="text-gray-500">Aktuell keine Events veröffentlicht.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e: any) => (
              <li
                key={e.id}
                className="rounded-2xl border p-4 shadow-sm hover:shadow"
              >
                <h3 className="mb-1 line-clamp-2 text-lg font-semibold">
                  {e.title ?? "Event"}
                </h3>
                <p className="mb-2 text-sm text-gray-500">
                  {(e.publishAt ?? e.createdAt).toLocaleString()}
                  {e.topic ? ` • ${e.topic.title}` : null}
                </p>
                <p className="line-clamp-3 text-sm text-gray-700">{e.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
