import crypto from "node:crypto";
import type { RunReceipt } from "./schemas";
import type { AnySource } from "./editorialSourceClassifier";
import { pickUrl, hostFromUrl, classifySource, getPublisherKey } from "./editorialSourceClassifier";
import { canonicalizeUrl } from "./urlCanonical";

function stableStringify(value: any): string {
  const seen = new WeakSet<object>();
  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
      const keys = Object.keys(v).sort();
      const out: Record<string, any> = {};
      for (const k of keys) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function isoNow(): string {
  return new Date().toISOString();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function computeRunReceipt(args: {
  inputText: string;
  sources: AnySource[];
  outputJson: unknown;
  language?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  pipelineVersion?: string;
}): RunReceipt {
  const createdAt = isoNow();
  const pipelineVersion = args.pipelineVersion || "E150+editorialAudit+drift5";
  const inputText = safeStr(args.inputText);

  const sourceSet = (Array.isArray(args.sources) ? args.sources : [])
    .map((s) => {
      const url = pickUrl(s);
      const canon = canonicalizeUrl(url || "");
      const title = safeStr((s as any).title).slice(0, 160) || undefined;
      const publisher = safeStr((s as any).publisher || (s as any).source).slice(0, 80) || undefined;
      const fetchedAt = safeStr((s as any).fetchedAt || (s as any).publishedAt || (s as any).date);
      return {
        canonicalUrl: canon.canonicalUrl || url || "",
        host: canon.host || hostFromUrl(url || "") || undefined,
        publisher,
        publisherKey: getPublisherKey(s),
        sourceClass: classifySource(s),
        fetchedAt: fetchedAt || undefined,
        title,
      };
    })
    .filter((x) => Boolean(x.canonicalUrl))
    .sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));

  const inputHash = sha256Hex(stableStringify({ inputText }));
  const sourcesHash = sha256Hex(stableStringify({ sourceSet: sourceSet.map((s) => ({ ...s, title: undefined })) }));
  const outputHash = sha256Hex(stableStringify({ outputJson: args.outputJson }));

  const snapshotId = sha256Hex(
    stableStringify({
      snapshot: sourceSet.map((s) => ({ u: s.canonicalUrl, t: s.fetchedAt || "" })),
    }),
  );

  const receiptCore = {
    createdAt,
    pipelineVersion,
    provider: args.provider,
    model: args.model,
    promptVersion: args.promptVersion,
    language: args.language,
    inputHash,
    sourcesHash,
    outputHash,
    snapshotId,
    sourceSet,
    contentPolicy: {
      maxSnippetChars: 240,
      storeFullText: false,
      storeSnippets: false,
      storeTitles: true,
    },
  };

  const receiptHash = sha256Hex(stableStringify(receiptCore));
  const id = `rr_${receiptHash.slice(0, 16)}`;

  return {
    id,
    createdAt,
    pipelineVersion,
    provider: args.provider,
    model: args.model,
    promptVersion: args.promptVersion,
    language: args.language,
    inputHash,
    sourcesHash,
    outputHash,
    receiptHash,
    snapshotId,
    sourceSet,
    contentPolicy: receiptCore.contentPolicy,
  };
}
