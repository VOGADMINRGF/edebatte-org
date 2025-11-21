import { cookies } from "next/headers";
import Link from "next/link";
import { getPublicVoteDetail } from "@features/votes/service";
import { VoteButtons } from "./VoteButtons";

export const dynamic = "force-dynamic";

export default async function VoteDetailPage({ params }: { params: { id: string } }) {
  const userId = (await cookies()).get("u_id")?.value ?? null;
  const result = await getPublicVoteDetail(params.id, userId);
  if (!result.ok) {
    const levelHint =
      result.error === "login_required"
        ? "Bitte melde dich an, um an Votes teilzunehmen."
        : result.error === "insufficient_level"
        ? "Diese Vote erfordert eine bestätigte Identität (Level E-Mail oder höher)."
        : "Vote konnte nicht geladen werden.";
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center text-slate-600">
        <p className="text-sm">{levelHint}</p>
        <Link href="/register/identity" className="text-sm font-semibold text-sky-600 underline">
          Verification starten
        </Link>
      </main>
    );
  }

  const vote = result.vote;
  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/votes" className="text-xs font-semibold uppercase text-slate-400">
          &larr; Zur Übersicht
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vote · Evidence</p>
        <h1 className="text-3xl font-semibold text-slate-900">{vote.title}</h1>
        {vote.summary && <p className="text-sm text-slate-600 max-w-3xl">{vote.summary}</p>}
        <p className="text-xs text-slate-500">
          Status: {vote.status} · Erstellt am {new Date(vote.createdAt).toLocaleDateString("de-DE")}
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Kern-Claims dieser Vote</h2>
        {vote.claims.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Claims hinterlegt.</p>
        ) : (
          <ol className="space-y-3">
            {vote.claims.map((claim, idx) => (
              <li key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                <span className="text-xs font-semibold text-slate-400">Claim #{idx + 1}</span>
                <p>{claim.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Evidence & Quellen</h3>
          {vote.regionCode && (
            <p className="text-sm text-slate-600">
              Region: {vote.regionCode} –{" "}
              <Link href={`/evidence/${vote.regionCode}`} className="text-sky-600 underline">
                Evidence-Ansicht öffnen
              </Link>
            </p>
          )}
          {vote.sourceUrl ? (
            <p className="text-xs text-slate-500">
              Quelle:{" "}
              <a href={vote.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-600 underline">
                {vote.sourceUrl}
              </a>
            </p>
          ) : (
            <p className="text-xs text-slate-500">Keine externe Quelle verlinkt.</p>
          )}
        </div>
        {vote.statementId ? (
          <VoteButtons statementId={vote.statementId} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
            Vote ist noch nicht live geschaltet.
          </div>
        )}
      </section>
    </main>
  );
}
