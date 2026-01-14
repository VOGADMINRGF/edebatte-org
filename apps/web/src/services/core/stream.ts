import crypto from "crypto";
import StreamEvent from "@/models/core/StreamEvent";

function sha1(s: string) {
  return crypto.createHash("sha1").update(s).digest("hex");
}
function stableStringify(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort();
    return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(o[k])).join(",")}}`;
  }
  return JSON.stringify(v);
}

export type EmitInput = {
  kind: "EVENT" | "METRIC" | "LOG";
  type: string;
  ts?: string | number | Date;
  sourceId?: string;
  partitionKey?: string;
  seq?: number;
  topicRef?: string;
  statementRef?: string;
  userRef?: string;
  domainRef?: string;
  payload?: unknown;
  meta?: unknown;
  provider?: string;
  extId?: string;
};

export async function emitStreamEvent(input: EmitInput) {
  const idempotencyKey = sha1(
    stableStringify({
      provider: input.provider ?? "",
      extId: input.extId ?? "",
      type: input.type,
      payload: input.payload ?? null,
    }),
  );

  const ts = input.ts ? new Date(input.ts) : new Date();

  const onInsert: Record<string, unknown> = {
    kind: input.kind,
    type: input.type,
    ts,
    idempotencyKey,
    status: "ACCEPTED",
    payload: input.payload ?? {},
    meta: input.meta ?? {},
  };

  const setIfString = (k: string, v: unknown) => {
    if (typeof v === "string" && v.trim() !== "") onInsert[k] = v;
  };
  const setIfNumber = (k: string, v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) onInsert[k] = v;
  };

  setIfString("provider", input.provider);
  setIfString("extId", input.extId);
  setIfString("sourceId", input.sourceId);
  setIfString("partitionKey", input.partitionKey);
  setIfNumber("seq", input.seq);
  setIfString("topicRef", input.topicRef);
  setIfString("statementRef", input.statementRef);
  setIfString("userRef", input.userRef);
  setIfString("domainRef", input.domainRef);

  const res = await StreamEvent.updateOne(
    { idempotencyKey },
    { $setOnInsert: onInsert },
    { upsert: true, setDefaultsOnInsert: false },
  );

  return { created: Boolean((res as any).upsertedCount), idempotencyKey };
}
