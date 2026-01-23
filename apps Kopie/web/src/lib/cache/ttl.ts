type Entry<T> = { t: number; ttl: number; v: T };
const mem = new Map<string, Entry<any>>();
export function ttlGet<T>(k:string): T|undefined {
  const e = mem.get(k); if (!e) return;
  if (Date.now() - e.t > e.ttl) { mem.delete(k); return; }
  return e.v as T;
}
export function ttlSet<T>(k:string, v:T, ttlMs:number){ mem.set(k, { t: Date.now(), ttl: ttlMs, v }); }
