export function hashCanonical(s: string): string {
    let h = 0; for (let i = 0; i < s.length; i++) h = ((h<<5) - h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
  }
  
  export function clamp01(n: number){ return Math.max(0, Math.min(1, n)); }
  
  export async function withTimeout<T>(p: Promise<T>, ms: number, label="task"): Promise<T> {
    let to: NodeJS.Timeout;
    const timeout = new Promise<never>((_,rej)=>{ to = setTimeout(()=>rej(new Error(`${label} timeout (${ms}ms)`)), ms); });
    try { return await Promise.race([p, timeout]); } finally { clearTimeout(to!); }
  }
  
  export function lang(input?: string): "de"|"en" {
    const L = (input ?? "de").toLowerCase();
    return L.startsWith("en") ? "en" : "de";
  }
  