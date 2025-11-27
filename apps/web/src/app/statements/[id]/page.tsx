// apps/web/src/app/statements/[id]/page.tsx
export const dynamic = "force-dynamic";
import { ObjectId } from "@core/db/triMongo";
import { notFound } from "next/navigation";

import StatementDetailClient from "@features/statement/components/StatementDetailClient";
import ResponsibilityNavigator from "@features/statement/components/ResponsibilityNavigator";
import {
  ConsequencesPreviewCard,
  ResponsibilityPreviewCard,
} from "@features/statement/components/StatementImpactPreview";
import { getActors, type ResponsibilityPath } from "@core/responsibility";
import type { ConsequenceRecord, ResponsibilityRecord } from "@features/analyze/schemas";

type Stats = {
  votesTotal: number;
  votesAgree: number;
  votesNeutral: number;
  votesDisagree: number;
};

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tri: any = await import("@core/db/triMongo");
  const stmts = tri.coreCol
    ? await tri.coreCol("statements")
    : (await tri.getDb()).collection("statements");

  const selector = ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : { id };

  const doc = await stmts.findOne(selector);
  if (!doc) return notFound();

  const statementId: string = doc.id ?? String(doc._id);
  const content: string | undefined = doc.text ?? doc.content ?? undefined;

  const stats: Stats = doc.stats ?? {
    votesTotal: 0,
    votesAgree: 0,
    votesNeutral: 0,
    votesDisagree: 0,
  };

  const consequences: ConsequenceRecord[] =
    (doc.analysis?.consequences?.consequences as ConsequenceRecord[] | undefined) ?? [];
  const responsibilities: ResponsibilityRecord[] =
    (doc.analysis?.consequences?.responsibilities as ResponsibilityRecord[] | undefined) ?? [];

  const responsibilityPaths: ResponsibilityPath[] =
    (doc.analysis?.responsibilityPaths as ResponsibilityPath[] | undefined) ??
    (doc.responsibilityPaths as ResponsibilityPath[] | undefined) ??
    [];

  const actors = await getActors();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{doc.title}</h1>
        {doc.category && (
          <p className="text-sm text-neutral-500">{doc.category}</p>
        )}
      </header>

      {content && <p className="text-lg leading-relaxed">{content}</p>}

      <StatementDetailClient statementId={statementId} initialStats={stats} />

      <ConsequencesPreviewCard
        consequences={consequences}
        responsibilities={responsibilities}
      />

      <ResponsibilityPreviewCard
        responsibilities={responsibilities}
        paths={responsibilityPaths}
        showPathOverlay
      />

      <ResponsibilityNavigator
        paths={responsibilityPaths}
        actors={actors}
        statementTitle={doc.title}
      />

      {doc.analysis?.summary && (
        <section className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Analyse</h2>
          <pre className="text-sm whitespace-pre-wrap">
            {doc.analysis.summary}
          </pre>
        </section>
      )}
    </div>
  );
}
