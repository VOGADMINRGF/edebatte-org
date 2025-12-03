// core/utils/random.ts

/**
 * Umgebungssichere UUID-v4-Erzeugung
 * - nutzt globalThis.crypto.randomUUID, wenn vorhanden
 * - sonst globalThis.crypto.getRandomValues
 * - sonst Fallback über Math.random (nur zur Not, aber besser als Crash)
 */
type MaybeCrypto = {
    randomUUID?: () => string;
    getRandomValues?: (array: Uint8Array) => Uint8Array;
  };
  
  function getGlobalCrypto(): MaybeCrypto | undefined {
    const g = globalThis as typeof globalThis & { crypto?: MaybeCrypto };
    return g.crypto;
  }
  
  function uuidFromRandomBytes(bytes: Uint8Array): string {
    // RFC4122-Version setzen
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
    const hex: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
      hex.push(bytes[i].toString(16).padStart(2, "0"));
    }
  
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }
  
  /**
   * Liefert eine UUID-ähnliche ID, ohne in älteren Browsern zu crashen.
   */
  export function safeRandomId(): string {
    const c = getGlobalCrypto();
  
    // 1) modern: crypto.randomUUID
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }
  
    // 2) Web-Crypto: getRandomValues
    if (c && typeof c.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return uuidFromRandomBytes(bytes);
    }
  
    // 3) Fallback: Math.random (nicht kryptografisch, aber stabil)
    let s = "";
    for (let i = 0; i < 32; i++) {
      s += Math.floor(Math.random() * 16).toString(16);
    }
    // Einfaches UUID-Format
    return [
      s.slice(0, 8),
      s.slice(8, 12),
      s.slice(12, 16),
      s.slice(16, 20),
      s.slice(20),
    ].join("-");
  }
  