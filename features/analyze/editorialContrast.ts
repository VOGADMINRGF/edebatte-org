import type { EditorialContrastFinding, EditorialInternationalContrast } from "./schemas";
import type { AnySource } from "./editorialSourceClassifier";
import { hostFromUrl, pickUrl, getPublisherKey } from "./editorialSourceClassifier";
import { canonicalizeUrl } from "./urlCanonical";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function localeHintFromHost(host: string): "de_like" | "international_like" | "unknown" {
  if (!host) return "unknown";
  if (host.endsWith(".de") || host.includes("tagesschau") || host.includes("spiegel") || host.includes("zeit")) return "de_like";
  if (host.endsWith(".com") || host.endsWith(".co.uk") || host.endsWith(".net") || host.endsWith(".org")) return "international_like";
  return "unknown";
}

function hasAttribution(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(laut|nach angaben|sagte|erklaerte|teilte mit|according to|said|stated|announced)\b/.test(t);
}

function hasEvidenceCaveat(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(ohne beweis|ohne belege|nicht unabhaengig verifiziert|unbestaetigt|without evidence|could not be verified|unverified)\b/.test(
    t,
  );
}

function usesPassiveAgency(text: string): boolean {
  return (
    /\b(wurde|wurden|ist|sind)\b.*\b(getoetet|verletzt|zerstoert|angegriffen)\b/i.test(text) ||
    /\b(was|were)\b.*\b(killed|injured|destroyed|hit)\b/i.test(text)
  );
}

function outletName(s: AnySource): string {
  const pub = safeStr(s.publisher) || safeStr(s.source);
  if (pub) return pub;
  const host = hostFromUrl(pickUrl(s));
  return host || "unknown";
}

export function computeInternationalContrast(args: { sources: AnySource[] }): EditorialInternationalContrast {
  const sources = Array.isArray(args.sources) ? args.sources : [];
  if (sources.length === 0) return { findings: [], differences: [], notes: ["Keine Quellen fuer Kontrastblick vorhanden."] };

  const picked: AnySource[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    const url = pickUrl(s);
    const canon = url ? canonicalizeUrl(url).key : "";
    const pk = getPublisherKey(s);
    const out = outletName(s).toLowerCase();
    const key = `${pk !== "unknown" ? pk : out}::${canon}`;
    if (!out || out === "unknown") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(s);
    if (picked.length >= 6) break;
  }

  const findings: EditorialContrastFinding[] = picked.map((s) => {
    const url = pickUrl(s);
    const host = hostFromUrl(url);
    const title = safeStr(s.title);
    const snippet = safeStr(s.snippet);
    const blob = `${title}. ${snippet}`.trim();
    return {
      outlet: outletName(s),
      url: url || undefined,
      localeHint: localeHintFromHost(host),
      hasAttribution: hasAttribution(blob),
      hasEvidenceCaveat: hasEvidenceCaveat(blob),
      usesPassiveAgency: usesPassiveAgency(blob),
      headlineOrTitle: title || undefined,
    };
  });

  const differences: string[] = [];
  const deLike = findings.filter((f) => f.localeHint === "de_like");
  const intlLike = findings.filter((f) => f.localeHint === "international_like");

  const rate = (xs: EditorialContrastFinding[], k: keyof EditorialContrastFinding): number => {
    if (xs.length === 0) return 0;
    const yes = xs.filter((x) => Boolean(x[k])).length;
    return yes / xs.length;
  };

  const deCaveat = rate(deLike, "hasEvidenceCaveat");
  const intlCaveat = rate(intlLike, "hasEvidenceCaveat");
  if (deLike.length > 0 && intlLike.length > 0 && Math.abs(deCaveat - intlCaveat) >= 0.34) {
    differences.push(
      `Unterschied bei Beweislast-Hinweisen: DE-like=${Math.round(deCaveat * 100)}% vs International-like=${Math.round(
        intlCaveat * 100,
      )}%.`,
    );
  }

  const deAttr = rate(deLike, "hasAttribution");
  const intlAttr = rate(intlLike, "hasAttribution");
  if (deLike.length > 0 && intlLike.length > 0 && Math.abs(deAttr - intlAttr) >= 0.34) {
    differences.push(
      `Unterschied in Attribution (laut/said): DE-like=${Math.round(deAttr * 100)}% vs International-like=${Math.round(
        intlAttr * 100,
      )}%.`,
    );
  }

  const dePassive = rate(deLike, "usesPassiveAgency");
  const intlPassive = rate(intlLike, "usesPassiveAgency");
  if (deLike.length > 0 && intlLike.length > 0 && Math.abs(dePassive - intlPassive) >= 0.34) {
    differences.push(
      `Unterschied bei agentlosem Passiv: DE-like=${Math.round(dePassive * 100)}% vs International-like=${Math.round(
        intlPassive * 100,
      )}%.`,
    );
  }

  const notes: string[] = [];
  if (picked.length < 2) notes.push("Zu wenige unterschiedliche Outlets fuer echten Kontrastblick.");
  notes.push("Kontrastblick basiert nur auf Metadaten (Titel/Snippet/URL), ohne Artikeltext zu replizieren.");

  return { findings, differences, notes };
}
