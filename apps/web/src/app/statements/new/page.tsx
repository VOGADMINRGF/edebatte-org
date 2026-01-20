import AnalyzeWorkspace from "@/components/analyze/AnalyzeWorkspace";
import { getDraft } from "@/server/draftStore";

export default async function StatementNewPage({
  searchParams,
}: {
  searchParams?: { prefill?: string; draftId?: string };
}) {
  const prefill = searchParams?.prefill ? decodeURIComponent(searchParams.prefill) : undefined;
  const draftId = searchParams?.draftId ?? null;
  const draft = draftId ? await getDraft(draftId).catch(() => null) : null;
  const initialText = draft?.text ?? prefill;

  return (
    <AnalyzeWorkspace
      mode="statement"
      defaultLevel={1}
      storageKey="vog_statement_draft_v1"
      analyzeEndpoint="/api/contributions/analyze"
      saveEndpoint="/api/contributions/save"
      finalizeEndpoint="/api/contributions/finalize"
      afterFinalizeNavigateTo="/swipes"
      initialText={initialText}
    />
  );
}
