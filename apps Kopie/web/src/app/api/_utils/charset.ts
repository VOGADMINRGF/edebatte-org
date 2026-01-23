import * as iconv from "iconv-lite";

export function sniffCharsetFromHeaders(h: Headers): string|undefined {
  const ct = h.get("content-type") || "";
  const m = /charset=([^;]+)/i.exec(ct);
  return m?.[1]?.trim()?.toLowerCase();
}

export function sniffCharsetFromXml(buf: Buffer): string|undefined {
  // <?xml version="1.0" encoding="iso-8859-1"?>
  const head = buf.subarray(0, 200).toString("ascii");
  const m = /encoding=["']([^"']+)["']/i.exec(head);
  return m?.[1]?.trim()?.toLowerCase();
}

export function decodeWithCharset(buf: Buffer, charset?: string): string {
  const cs = (charset||"").toLowerCase();
  const tried = new Set<string>();
  const tryDecode = (name: string) => {
    if (tried.has(name)) return undefined;
    tried.add(name);
    try { return iconv.decode(buf, name); } catch { return undefined; }
  };
  return (
    (cs && tryDecode(cs)) ||
    tryDecode("utf-8") ||
    tryDecode("latin1") ||
    tryDecode("win1252") ||
    buf.toString("utf8")
  );
}
