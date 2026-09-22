import VoxyStudioAgentReviewPanel from "./VoxyStudioAgentReviewPanel";
import VoxyStudioAutonomyPanel from "./VoxyStudioAutonomyPanel";
import VoxyStudioEvidenceReviewPanel from "./VoxyStudioEvidenceReviewPanel";
import VoxyStudioFineTunePanel from "./VoxyStudioFineTunePanel";
import VoxyStudioLocaleReviewMatrixPanel from "./VoxyStudioLocaleReviewMatrixPanel";
import VoxyStudioOperator from "./VoxyStudioOperator";
import VoxyStudioPreviewReviewPanel from "./VoxyStudioPreviewReviewPanel";
import VoxyStudioRenderQueuePanel from "./VoxyStudioRenderQueuePanel";
import VoxyStudioSourceBindingPanel from "./VoxyStudioSourceBindingPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voxy Admin Video Studio · eDebatte",
};

export default function VoxyStudioReviewPage() {
  return (
    <>
      <h1 className="sr-only">Admin Video Studio</h1>
      <VoxyStudioOperator />
      <VoxyStudioLocaleReviewMatrixPanel />
      <VoxyStudioAutonomyPanel />
      <VoxyStudioAgentReviewPanel />
      <VoxyStudioEvidenceReviewPanel />
      <VoxyStudioSourceBindingPanel />
      <VoxyStudioFineTunePanel />
      <VoxyStudioRenderQueuePanel />
      <VoxyStudioPreviewReviewPanel />
    </>
  );
}
