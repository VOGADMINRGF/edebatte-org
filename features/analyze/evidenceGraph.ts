import type { EvidenceGraph } from "./schemas";
import type { AnySource } from "./editorialSourceClassifier";
import { pickUrl, classifySource } from "./editorialSourceClassifier";
import { canonicalizeUrl } from "./urlCanonical";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function idFromText(prefix: string, text: string): string {
  const t = text.toLowerCase().slice(0, 120);
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return `${prefix}_${h.toString(16)}`;
}

function looksRefuting(snippet: string): boolean {
  const t = snippet.toLowerCase();
  return /\b(bestreetet|widerspricht|dementiert|zurueckgewiesen|refuted|denied|contradict|false|misleading)\b/.test(t);
}

export function computeEvidenceGraph(args: {
  claims?: unknown;
  claimEvidence?: Array<{ claim: string; linkedSources?: Array<{ url?: string; title?: string; publisher?: string; sourceClass?: string; score?: number }> }>;
  sources?: AnySource[];
}): EvidenceGraph {
  const nodes: EvidenceGraph["nodes"] = [];
  const edges: EvidenceGraph["edges"] = [];

  const claimTexts: string[] = [];
  if (Array.isArray(args.claimEvidence)) {
    for (const ce of args.claimEvidence) if (ce?.claim) claimTexts.push(String(ce.claim));
  } else if (Array.isArray(args.claims)) {
    for (const c of args.claims as any[]) {
      const t = safeStr((c as any)?.text || (c as any)?.claim || (c as any)?.statement || (c as any)?.content);
      if (t) claimTexts.push(t);
    }
  }

  const claimIds = new Map<string, string>();
  for (const claim of claimTexts.slice(0, 24)) {
    const id = idFromText("claim", claim);
    claimIds.set(claim, id);
    nodes.push({ id, type: "claim", label: claim.slice(0, 220) });
  }

  const evidenceByCanon = new Map<string, string>();
  const addEvidenceNode = (url: string, meta?: { title?: string; publisher?: string; sourceClass?: string; weight?: number; snippet?: string }) => {
    const canon = canonicalizeUrl(url || "");
    const key = canon.key || url;
    if (!key) return "";
    if (evidenceByCanon.has(key)) return evidenceByCanon.get(key)!;
    const id = idFromText("ev", key);
    evidenceByCanon.set(key, id);
    nodes.push({
      id,
      type: "evidence",
      label: safeStr(meta?.title).slice(0, 220) || canon.host || url,
      url: canon.canonicalUrl || url,
      publisher: safeStr(meta?.publisher).slice(0, 80) || undefined,
      sourceClass: safeStr(meta?.sourceClass) || undefined,
      weight: meta?.weight,
    });
    return id;
  };

  if (Array.isArray(args.claimEvidence)) {
    for (const ce of args.claimEvidence.slice(0, 24)) {
      const claim = String(ce.claim || "");
      const from = claimIds.get(claim);
      if (!from) continue;
      const linked = Array.isArray(ce.linkedSources) ? ce.linkedSources : [];
      for (const ls of linked.slice(0, 4)) {
        const url = safeStr(ls.url);
        if (!url) continue;
        const to = addEvidenceNode(url, {
          title: ls.title,
          publisher: ls.publisher,
          sourceClass: ls.sourceClass,
          weight: typeof ls.score === "number" ? Math.max(0, Math.min(1, ls.score)) : undefined,
        });
        if (!to) continue;
        edges.push({
          from,
          to,
          kind: "supports",
          weight: typeof ls.score === "number" ? Math.max(0, Math.min(1, ls.score)) : 0.5,
        });
      }
    }
  } else if (Array.isArray(args.sources)) {
    const sources = args.sources.slice(0, 8);
    for (const claim of claimTexts.slice(0, 12)) {
      const from = claimIds.get(claim);
      if (!from) continue;
      for (const s of sources) {
        const url = pickUrl(s);
        if (!url) continue;
        const to = addEvidenceNode(url, {
          title: safeStr((s as any).title),
          publisher: safeStr((s as any).publisher || (s as any).source),
          sourceClass: classifySource(s),
          snippet: safeStr((s as any).snippet),
        });
        if (!to) continue;
        const snippet = safeStr((s as any).snippet);
        edges.push({
          from,
          to,
          kind: looksRefuting(snippet) ? "refutes" : "mentions",
          weight: 0.35,
        });
      }
    }
  }

  const claimCount = nodes.filter((n) => n.type === "claim").length;
  const evidenceCount = nodes.filter((n) => n.type === "evidence").length;
  const linkedClaimIds = new Set(edges.map((e) => e.from));
  const linkedClaimCount = linkedClaimIds.size;
  const unlinkedClaimCount = Math.max(0, claimCount - linkedClaimCount);

  return {
    nodes,
    edges,
    summary: { claimCount, evidenceCount, linkedClaimCount, unlinkedClaimCount },
  };
}
