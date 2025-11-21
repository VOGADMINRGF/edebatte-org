import { cookies } from "next/headers";
import Link from "next/link";
import { listPublicVotes } from "@features/votes/service";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const userId = (await cookies()).get("u_id")?.value ?? null;
  const { items } = await listPublicVotes({ limit: 50, includeDraft: false, userId });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence · Votes</p>
        <h1 className="text-3xl font-semibold text-slate-900">Öffentliche Votes &amp; Survey-Vorlagen</h1>
        <p className="text-sm text-slate-600">
          Diese Abstimmungen stammen aus der Feeds-Pipeline und wurden redaktionell freigegeben. Jede Vote-Vorlage
          verlinkt auf Evidence-Claims, damit du direkt prüfen kannst, welche Quellen und Entscheidungen dahinter stehen.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((vote) => (
          <article key={vote.id} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                {vote.regionLabel || vote.regionCode || "GLOBAL"}
              </span>
              <span>{new Date(vote.createdAt).toLocaleDateString("de-DE")}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{vote.title}</h2>
              {vote.summary && <p className="text-sm text-slate-600 mt-2">{vote.summary}</p>}
            </div>
            <div className="text-xs text-slate-500">
              <p>Eingehende Claims: {vote.claimCount ?? vote.claims.length}</p>
              <p>Status: {vote.status === "published" ? "Veröffentlicht" : vote.status}</p>
            </div>
            <Link
              href={`/votes/${vote.id}`}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Vote ansehen
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
