"use client";

import AnalyzeWorkspace from "@/components/analyze/AnalyzeWorkspace";

export default function StatementNewPage() {
  return (
    <AnalyzeWorkspace
      mode="statement"
      defaultLevel={1}
      storageKey="vog_statement_draft_v1"
      analyzeEndpoint="/api/contributions/analyze"
      saveEndpoint="/api/contributions/save"
      finalizeEndpoint="/api/contributions/finalize"
      afterFinalizeNavigateTo="/swipes"
    />
  );
}
