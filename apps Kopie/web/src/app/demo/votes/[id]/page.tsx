import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoVote } from "@features/votes/demoVotes";

const STATUS_STYLES: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  planned: "bg-slate-100 text-slate-600",
};

export default async function DemoVoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vote = getDemoVote(id);
  if (!vote) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <Link href="/demo/votes" className="text-xs font-semibold uppercase text-slate-400">
          &larr; Zur Uebersicht
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo - Abstimmung</p>
        <h1 className="text-3xl font-semibold text-slate-900">{vote.title}</h1>
        <p className="text-sm text-slate-600 max-w-3xl">{vote.summary}</p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {vote.regionLabel}
          </span>
          <span>Status: {vote.status}</span>
          <span>{vote.participationTarget}</span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Optionen</h2>
          <div className="space-y-3">
            {vote.options.map((opt) => (
              <div key={opt.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">{opt.label}</p>
                <p className="text-slate-600">{opt.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Claims & Evidenz</h2>
          <ol className="space-y-3 text-sm">
            {vote.claims.map((claim, idx) => (
              <li key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-slate-800">{claim.text}</p>
                {claim.sourceHint && (
                  <p className="mt-1 text-xs text-slate-500">Quelle: {claim.sourceHint}</p>
                )}
              </li>
            ))}
          </ol>
          <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
            {vote.evidence.map((item) => (
              <div key={item.label} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-600">{item.label}</span>
                <span>{item.source}</span>
                {item.url && (
                  <a href={item.url} className="text-sky-600 underline" target="_blank" rel="noreferrer">
                    Link
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Entscheidungsbaum</h2>
          <ol className="space-y-3 text-sm">
            {vote.decisionTree.map((step, idx) => (
              <li key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-1">
                <p className="font-semibold text-slate-800">{step.title}</p>
                <p className="text-slate-600">{step.detail}</p>
                <p className="text-xs text-slate-500">Dann: {step.outcome}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          <ol className="space-y-3 text-sm">
            {vote.timeline.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString("de-DE")}</p>
                </div>
                <span
                  className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                >
                  {item.status === "done"
                    ? "erledigt"
                    : item.status === "in_progress"
                    ? "laeuft"
                    : "geplant"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
