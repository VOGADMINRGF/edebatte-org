import { StreamOverlayClient } from "./StreamOverlayClient";

export default async function StreamOverlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StreamOverlayClient sessionId={id} />;
}
