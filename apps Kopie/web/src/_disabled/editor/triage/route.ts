export type Claim = {
  text: string;
  language?: string;
  falsifiable: boolean;
};

function normalizeWhitespace(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

export function decomposeClaims(raw: string, language = "de"): Claim[] {
  if (!raw || !raw.trim()) return [];

  // 1) grob nach Satzendezeichen/Zeilenumbrüchen splitten
  const parts = raw
    .split(/(\.|\?|!|;|\n)/g) // trenner behalten
    .reduce<string[]>((acc, cur, i) => {
      if (i % 2 === 0)
        acc.push(cur); // nur die Inhalte sammeln
      else acc[acc.length - 1] += cur;
      return acc;
    }, [])
    .map(normalizeWhitespace)
    .filter(Boolean);

  // 2) filtern: kurze Fetzen raus, aber nicht zu aggressiv
  let claims = parts
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).length >= MIN_WORDS)
    .map<Claim>((p) => ({ text: p, language, falsifiable: true }));

  // 3) Fallback: Wenn nichts erkannt → gesamten Text als EIN Claim
  if (claims.length === 0) {
    const single = normalizeWhitespace(raw);
    if (single.length >= 10) {
      claims = [{ text: single, language, falsifiable: true }];
    }
  }

  return claims;
}
