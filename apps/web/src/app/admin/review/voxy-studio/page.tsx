import VoxyStudioAgentReviewPanel from "./VoxyStudioAgentReviewPanel";
import VoxyStudioAutonomyPanel from "./VoxyStudioAutonomyPanel";
import VoxyStudioBoundTruthPanel from "./VoxyStudioBoundTruthPanel";
import VoxyStudioEvidenceReviewPanel from "./VoxyStudioEvidenceReviewPanel";
import VoxyStudioFineTunePanel from "./VoxyStudioFineTunePanel";
import VoxyStudioFramePreviewPanel from "./VoxyStudioFramePreviewPanel";
import VoxyStudioLocaleReviewMatrixPanel from "./VoxyStudioLocaleReviewMatrixPanel";
import VoxyStudioOperator from "./VoxyStudioOperator";
import VoxyStudioPreviewReviewPanel from "./VoxyStudioPreviewReviewPanel";
import VoxyStudioProductionContextPanel from "./VoxyStudioProductionContextPanel";
import VoxyStudioRenderQueuePanel from "./VoxyStudioRenderQueuePanel";
import VoxyStudioSourceBindingPanel from "./VoxyStudioSourceBindingPanel";
import VoxyStudioVisualInvariantGuide from "./VoxyStudioVisualInvariantGuide";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voxy Admin Video Studio · eDebatte",
};

export default function VoxyStudioReviewPage() {
  return (
    <>
      <h1 className="sr-only">Admin Video Studio</h1>
      <VoxyStudioOperator />
      <VoxyStudioProductionContextPanel />
      <VoxyStudioLocaleReviewMatrixPanel />
      <VoxyStudioAutonomyPanel />
      <VoxyStudioAgentReviewPanel />
      <VoxyStudioEvidenceReviewPanel />
      <VoxyStudioBoundTruthPanel />
      <VoxyStudioSourceBindingPanel />
      <VoxyStudioFineTunePanel />
      <VoxyStudioFramePreviewPanel />
      <VoxyStudioRenderQueuePanel />
      <VoxyStudioVisualInvariantGuide />
      <VoxyStudioPreviewReviewPanel />
    </>
  );
}
