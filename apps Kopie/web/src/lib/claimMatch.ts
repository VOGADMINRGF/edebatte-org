export type VerifiedHit = { id:string; title:string; trust:number; version:number; evidenceCount:number; sim:number };
export type ClusterHit = { id:string; title:string; trust:number; evidenceCount:number; sim:number };
export type ClaimMatch =
  | { kind:"verified"; stmt: VerifiedHit }
  | { kind:"cluster"; top: ClusterHit[]; clusterId: string }
  | { kind:"none" };

export async function getClaimMatch(text: string): Promise<ClaimMatch> {
  try {
    const r = await fetch("/api/statements/similar?text="+encodeURIComponent(text));
    if (!r.ok) return { kind:"none" };
    return await r.json();
  } catch { return { kind:"none" }; }
}
