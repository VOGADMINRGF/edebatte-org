import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Research/Guidance Endpoint
 * Liefert nur Recherche-Hinweise (keine harten Fakten).
 * Funktioniert auch mit 0 Claims.
 */

const ClaimSchema = z.object({
  id: z.string().optional(),
  text: z.string().optional(),
  domain: z.string().optional().nullable(),
  domains: z.array(z.string()).optional().nullable(),
});

const RequestSchema = z.object({
  locale: z.string().default("de"),
  claims: z.array(ClaimSchema).optional().default([]),
  focusCountries: z.array(z.string()).optional(),
});

type GuidanceBlock = {
  focus: string[];
  stakeholders: string[];
  sources: string[];
  queries: string[];
  feeds: string[];
  risks: string[];
};

function buildGuidance(locale: string, claims: Array<z.infer<typeof ClaimSchema>>): GuidanceBlock {
  const isDe = locale.toLowerCase().startsWith("de");
  const base = {
    focus: isDe
      ? ["Deutschland", "EU-Institutionen", "Nachbarländer"]
      : ["Germany", "EU institutions", "Neighbouring countries"],
    stakeholders: isDe
      ? ["Bundesministerien", "Landesbehörden", "Kommunen", "Verbände/NGOs", "Betroffene Gruppen"]
      : ["Federal ministries", "State agencies", "Municipalities", "Associations/NGOs", "Affected groups"],
    sources: isDe
      ? ["Amtliche Veröffentlichungen", "Parlamentsdokumente", "Fachverbände", "Qualitätspresse", "Wissenschaftliche Datenbanken"]
      : ["Official publications", "Parliament documents", "Professional associations", "Quality press", "Scientific databases"],
    queries: isDe
      ? ["\"Bundesministerium\" + Thema", "\"EU Verordnung\" + Thema", "\"Landesamt\" + Thema", "\"Positionspapier\" + Verband + Thema"]
      : ["\"federal ministry\" + topic", "\"EU regulation\" + topic", "\"state agency\" + topic", "\"position paper\" + association + topic"],
    feeds: isDe
      ? ["Bundesanzeiger RSS", "Eur-Lex RSS", "Landespresseportale", "Fachverbands-Newsletter"]
      : ["Federal gazette RSS", "Eur-Lex RSS", "State press portals", "Professional association newsletters"],
    risks: isDe
      ? ["Keine Behauptungen ohne Quelle", "Stakeholder-Bias prüfen", "Aktualität der Quellen sicherstellen"]
      : ["Avoid claims without sources", "Check stakeholder bias", "Ensure source freshness"],
  };

  // Einfache Ableitung aus Domains/Topics der Claims (wenn vorhanden)
  const topics: string[] = [];
  claims.forEach((c) => {
    if (typeof c.text === "string" && c.text.trim()) topics.push(c.text.trim().slice(0, 80));
    if (Array.isArray(c.domains)) {
      c.domains
        .filter((d) => typeof d === "string" && d.trim())
        .forEach((d) => topics.push(d.trim()));
    } else if (typeof c.domain === "string" && c.domain.trim()) {
      topics.push(c.domain.trim());
    }
  });

  if (topics.length) {
    const example = topics.slice(0, 3).join(" · ");
    base.queries = [
      ...base.queries,
      ...(isDe ? [`"Gesetzesentwurf" + ${example}`, `"Gutachten" + ${example}`] : [`"draft law" + ${example}`, `"expert report" + ${example}`]),
    ];
  }

  return base;
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { locale, claims } = parsed.data;
    const guidance = buildGuidance(locale, claims ?? []);

    return NextResponse.json({
      ok: true,
      guidance,
      meta: { claimsCount: claims?.length ?? 0 },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "unknown",
      },
      { status: 500 },
    );
  }
}
