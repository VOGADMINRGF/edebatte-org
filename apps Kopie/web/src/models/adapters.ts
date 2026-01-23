// apps/web/src/models/adapters.ts
import { StatementSchema, type StatementDTO } from "./statement";

export function feedItemToStatement(item: any): StatementDTO {
  const s = item.claim ?? item.summary ?? "";
  const claim = s ? String(s).slice(0, 280) : "Platzhalter-Claim";

  const draft = {
    id: item.id ?? cryptoRandom(),
    headline: item.title ?? "Ohne Titel",
    prompt: item.prompt ?? `Angeregt durch: ${item.title ?? "Beitrag"}. Was sollten wir entscheiden?`,
    claim,
    region: item.region ?? null,
    authority: item.authority ?? null,
    categoryMain: item.category ?? null,
    categorySubs: item.tags ?? [],
    timeSpan: item.date ?? null,
    affected: item.affected ?? [],
    metrics: {
      trust: item.trust ?? 0.5,
      factcheckStatus: "unknown",
      votesYes: 0, votesNo: 0, votesNeutral: 0,
    },
    evidence: (item.links ?? []).map((l: any)=>({ url:l.url, title:l.title ?? l.url })),
    source: { url: item.url, outlet: item.outlet, publishedAt: item.publishedAt },
  };
  return StatementSchema.parse(draft);
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return "st_" + Math.random().toString(36).slice(2, 10);
}
