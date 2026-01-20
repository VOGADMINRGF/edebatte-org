import { notFound } from "next/navigation";
import Link from "next/link";
import {
  dossierClaimsCol,
  dossierFindingsCol,
  dossierSourcesCol,
  dossierEdgesCol,
  dossierRevisionsCol,
  openQuestionsCol,
} from "@features/dossier/db";
import { findDossierByAnyId } from "@features/dossier/lookup";
import { selectEffectiveFindings } from "@features/dossier/effective";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ dossierId: string }>;
};

function formatDate(value?: Date | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "2-digit" });
}

const statusStyles: Record<string, string> = {
  supported: "border-emerald-200 bg-emerald-50 text-emerald-800",
  supports: "border-emerald-200 bg-emerald-50 text-emerald-800",
  refuted: "border-rose-200 bg-rose-50 text-rose-800",
  refutes: "border-rose-200 bg-rose-50 text-rose-800",
  mixed: "border-sky-200 bg-sky-50 text-sky-800",
  unclear: "border-amber-200 bg-amber-50 text-amber-800",
  open: "border-slate-200 bg-slate-50 text-slate-700",
  in_review: "border-slate-200 bg-slate-50 text-slate-700",
  answered: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-slate-200 bg-slate-50 text-slate-700",
};

const claimKindLabels: Record<string, string> = {
  fact: "Fakt",
  interpretation: "Interpretation",
  value: "Werturteil",
  question: "Frage",
};

const verdictLabels: Record<string, string> = {
  supports: "stuetzt",
  refutes: "widerlegt",
  unclear: "unklar",
  mixed: "gemischt",
};

export default async function DossierViewerPage({ params }: PageProps) {
  const { dossierId } = await params;

  let dossier = await findDossierByAnyId(dossierId);
  if (!dossier) {
    return notFound();
  }

  if (!dossier) return notFound();

  const dossierKey = dossier.dossierId;
  const [claims, sources, findings, openQuestions, edges, revisions] = await Promise.all([
    (await dossierClaimsCol()).find({ dossierId: dossierKey }).sort({ createdAt: 1 }).toArray(),
    (await dossierSourcesCol()).find({ dossierId: dossierKey }).sort({ publishedAt: -1, createdAt: -1 }).toArray(),
    (await dossierFindingsCol()).find({ dossierId: dossierKey }).sort({ updatedAt: -1 }).toArray(),
    (await openQuestionsCol()).find({ dossierId: dossierKey }).sort({ status: 1, createdAt: 1 }).toArray(),
    (await dossierEdgesCol()).find({ dossierId: dossierKey, active: { $ne: false } }).sort({ createdAt: 1 }).toArray(),
    (await dossierRevisionsCol()).find({ dossierId: dossierKey }).sort({ timestamp: -1 }).limit(80).toArray(),
  ]);

  const claimById = new Map(claims.map((c) => [c.claimId, c]));
  const sourceById = new Map(sources.map((s) => [s.sourceId, s]));
  const findingById = new Map(findings.map((f) => [f.findingId, f]));
  const questionById = new Map(openQuestions.map((q) => [q.questionId, q]));
  const effectiveFindings = selectEffectiveFindings(findings);

  const counts = {
    claims: claims.length,
    sources: sources.length,
    findings: effectiveFindings.length,
    edges: edges.length,
    openQuestions: openQuestions.length,
  };
  const relLabels: Record<string, string> = {
    supports: "stuetzt",
    refutes: "widerlegt",
    mentions: "erwaehnt",
    depends_on: "haengt ab von",
    questions: "fragt",
    context_for: "kontext fuer",
  };

  const nodeLabel = (type: string, id: string) => {
    if (type === "claim") return claimById.get(id)?.text ?? id;
    if (type === "source") return sourceById.get(id)?.title ?? id;
    if (type === "finding") return findingById.get(id)?.verdict ?? id;
    if (type === "open_question") return questionById.get(id)?.text ?? id;
    return id;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Dossier Viewer</p>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-slate-900">
            {dossier.title ?? "Dossier"}
          </h1>
          <p className="text-sm text-slate-600">
            Statement-ID: <span className="font-mono">{dossier.statementId}</span>
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Status: {dossier.status ?? "active"}
            </span>
            {dossier.lastFactcheckedAt ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Letzter Factcheck: {formatDate(dossier.lastFactcheckedAt) ?? "-"}
              </span>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-2 text-xs text-slate-600">
            {[
              { id: "claims", label: "Claims" },
              { id: "sources", label: "Quellen" },
              { id: "findings", label: "Findings" },
              { id: "graph", label: "Graph" },
              { id: "questions", label: "Offene Fragen" },
              { id: "revisions", label: "Verlauf" },
            ].map((item) => (
              <a key={item.id} href={`#${item.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Claims", value: counts.claims },
            { label: "Quellen", value: counts.sources },
            { label: "Findings", value: counts.findings },
            { label: "Offene Fragen", value: counts.openQuestions },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm shadow-sm"
            >
              <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </section>

        <section id="claims" className="space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Claims</h2>
            <Link href={`/api/dossiers/${encodeURIComponent(dossierKey)}`} className="text-xs text-sky-700 underline">
              Daten anzeigen
            </Link>
          </div>
          {claims.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">
              Noch keine Claims erfasst.
            </div>
          ) : (
            <div className="grid gap-3">
              {claims.map((claim) => (
                <article
                  key={claim.claimId}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                      {claimKindLabels[claim.kind] ?? claim.kind}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${statusStyles[claim.status] ?? statusStyles.open}`}>
                      {claim.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-800">{claim.text}</p>

                  {Array.isArray(claim.uncertaintyNotes) && claim.uncertaintyNotes.length > 0 ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
                      {claim.uncertaintyNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}

                  {claim.evidenceIndicator?.reasons?.length ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      <div className="font-semibold text-slate-700">
                        Evidenz-Indikator: {claim.evidenceIndicator.score.toFixed(2)}
                      </div>
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {claim.evidenceIndicator.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="sources" className="space-y-4 scroll-mt-24">
          <h2 className="text-lg font-semibold text-slate-900">Quellen</h2>
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">
              Noch keine Quellen dokumentiert.
            </div>
          ) : (
            <div className="grid gap-3">
              {sources.map((source) => (
                <article
                  key={source.sourceId}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      {source.type}
                    </span>
                    {source.publisher ? <span>{source.publisher}</span> : null}
                    {source.publishedAt ? <span>{formatDate(source.publishedAt)}</span> : null}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">
                    <a href={source.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </h3>
                  {source.snippet ? <p className="mt-2 text-xs text-slate-600">{source.snippet}</p> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="findings" className="space-y-4 scroll-mt-24">
          <h2 className="text-lg font-semibold text-slate-900">Findings</h2>
          {effectiveFindings.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">
              Noch keine Findings vorhanden.
            </div>
          ) : (
            <div className="grid gap-3">
              {effectiveFindings.map((finding) => {
                const claim = claimById.get(finding.claimId);
                return (
                  <article
                    key={finding.findingId}
                    className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className={`rounded-full border px-2 py-0.5 ${statusStyles[finding.verdict] ?? statusStyles.open}`}>
                        {verdictLabels[finding.verdict] ?? finding.verdict}
                      </span>
                      {finding.updatedAt ? <span>Stand: {formatDate(finding.updatedAt)}</span> : null}
                    </div>
                    {claim ? <p className="mt-2 text-sm text-slate-800">{claim.text}</p> : null}
                    {finding.rationale?.length ? (
                      <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
                        {finding.rationale.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    {finding.citations?.length ? (
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        {finding.citations.map((cite, idx) => {
                          const source = sourceById.get(cite.sourceId);
                          return (
                            <div key={`${finding.findingId}-cite-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <div className="font-semibold text-slate-700">
                                {source?.title ?? "Quelle"}
                              </div>
                              {cite.quote ? <div className="mt-1 text-slate-600">"{cite.quote}"</div> : null}
                              {cite.locator ? <div className="text-[11px] text-slate-500">{cite.locator}</div> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="graph" className="space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Evidenz-Graph</h2>
            <Link
              href={`/api/dossiers/${encodeURIComponent(dossierKey)}/graph`}
              className="text-xs text-sky-700 underline"
            >
              Graph JSON
            </Link>
          </div>
          {edges.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">
              Noch keine Graph-Edges erfasst.
            </div>
          ) : (
            <div className="grid gap-3">
              {edges.map((edge) => (
                <article
                  key={edge.edgeId}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm shadow-sm"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500">{edge.rel}</div>
                  <div className="mt-2 text-slate-800">
                    <span className="font-semibold text-slate-900">
                      {nodeLabel(edge.fromType, edge.fromId)}
                    </span>{" "}
                    <span className="text-slate-500">{relLabels[edge.rel] ?? edge.rel}</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {nodeLabel(edge.toType, edge.toId)}
                    </span>
                  </div>
                  {edge.justification ? (
                    <p className="mt-2 text-xs text-slate-600">{edge.justification}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="questions" className="space-y-4 scroll-mt-24">
          <h2 className="text-lg font-semibold text-slate-900">Offene Fragen</h2>
          {openQuestions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">
              Noch keine offenen Fragen erfasst.
            </div>
          ) : (
            <div className="grid gap-3">
              {openQuestions.map((q) => (
                <article
                  key={q.questionId}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className={`rounded-full border px-2 py-0.5 ${statusStyles[q.status] ?? statusStyles.open}`}>
                      {q.status}
                    </span>
                    {q.responsibility?.label ? <span>{q.responsibility.label}</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-800">{q.text}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="revisions" className="space-y-4 scroll-mt-24">
          <h2 className="text-lg font-semibold text-slate-900">Verlauf</h2>
          {revisions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">
              Noch keine Revisionen vorhanden.
            </div>
          ) : (
            <div className="grid gap-3">
              {revisions.map((rev) => (
                <article
                  key={rev.revId}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      {rev.entityType}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      {rev.action}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      {rev.byRole}
                    </span>
                    <span>{formatDate(rev.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-slate-800">{rev.diffSummary}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
