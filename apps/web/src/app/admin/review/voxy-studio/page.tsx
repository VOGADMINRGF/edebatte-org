import VoxyStudioOperator from "./VoxyStudioOperator";
import VoxyStudioPreviewReviewPanel from "./VoxyStudioPreviewReviewPanel";
import VoxyStudioRenderQueuePanel from "./VoxyStudioRenderQueuePanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voxy Admin Video Studio · eDebatte",
};

export default function VoxyStudioReviewPage() {
  return (
    <>
      <h1 className="sr-only">Admin Video Studio</h1>
      <VoxyStudioOperator />
      <VoxyStudioRenderQueuePanel />
      <VoxyStudioPreviewReviewPanel />
    </>
  );
}
