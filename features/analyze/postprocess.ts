// features/analyze/postprocess.ts
// Aggressives Dedupe + leichtes Clustering für kurze Sätze

export type PostItem = {
    text: string;
    sachverhalt?: string;
    zeitraum?: string;
    ort?: string;
    zustaendigkeit?: "EU" | "Bund" | "Land" | "Kommune" | "-";
    betroffene?: string[];
    messgroesse?: string;
    unsicherheiten?: string;
    sources?: string[];
  };
  
  type Cluster = { repIndex: number; members: number[] };
  
  function norm(s: string): string {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[„“"'\(\)\[\]\{\}:;<>]/g, " ")
      .replace(/[.,!?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function jaccard(a: string, b: string): number {
    const A = new Set(a.split(" ").filter(Boolean));
    const B = new Set(b.split(" ").filter(Boolean));
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / (A.size + B.size - inter);
  }
  
  export function postprocessClaims(
    items: PostItem[],
    opts?: { simThresh?: number }
  ): {
    clusters: Array<{ rep: PostItem; members: number[] }>;
    statements: Array<{ rep: PostItem; members: number[] }>;
  } {
    const simT = opts?.simThresh ?? 0.78;
  
    const N = items.length;
    const norms = items.map((it) => norm(it.text));
    const used = new Array(N).fill(false);
    const clusters: Cluster[] = [];
  
    for (let i = 0; i < N; i++) {
      if (used[i]) continue;
      used[i] = true;
      const m = [i];
      for (let j = i + 1; j < N; j++) {
        if (used[j]) continue;
        if (jaccard(norms[i], norms[j]) >= simT) {
          used[j] = true;
          m.push(j);
        }
      }
      // Repräsentant = längster Text in der Gruppe
      let rep = i;
      for (const k of m) if (items[k].text.length > items[rep].text.length) rep = k;
      clusters.push({ repIndex: rep, members: m });
    }
  
    // aufbereiten
    const out = clusters.map((c) => ({
      rep: items[c.repIndex],
      members: c.members,
    }));
  
    // Statements = einfach die Cluster-Repräsentanten
    return { clusters: out, statements: out };
  }
  