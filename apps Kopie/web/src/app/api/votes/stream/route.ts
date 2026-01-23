// apps/web/src/app/api/votes/stream/route.ts
import { redisSubscribe, voteChannel } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statementId = searchParams.get("statementId") || "";
  if (!statementId)
    return new Response("statementId required", { status: 400 });

  const ch = voteChannel(statementId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const sendRaw = (s: string) => controller.enqueue(enc.encode(s));

      // Browser Reconnect-Hint
      sendRaw(`retry: 5000\n\n`);

      // Subscribe (SSE)
      const unsubscribe = await redisSubscribe(ch, (msg: string) => {
        try {
          send(JSON.parse(msg));
        } catch {
          /* ignore non-JSON payloads */
        }
      });

      // Hello + Keep-Alive-Kommentare
      send({ type: "hello", ch, ts: Date.now() });
      const iv = setInterval(
        () => controller.enqueue(enc.encode(`: ping\n\n`)),
        15_000,
      );

      // Sauberes Schließen bei Abbruch
      const abort = (req as any).signal as AbortSignal | undefined;
      abort?.addEventListener("abort", async () => {
        clearInterval(iv);
        try {
          await unsubscribe();
        } catch {
          /* ignore */
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
