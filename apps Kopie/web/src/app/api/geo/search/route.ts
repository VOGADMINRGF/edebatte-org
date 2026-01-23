import { NextRequest, NextResponse } from "next/server";
import type { GeoAddressSuggestion } from "@core/geo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER = process.env.GEO_PROVIDER ?? "nominatim";
const NOMINATIM_BASE = process.env.GEO_NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
const NOMINATIM_EMAIL = process.env.GEO_NOMINATIM_EMAIL ?? "";
const DEFAULT_COUNTRY = (process.env.GEO_DEFAULT_COUNTRY ?? "de").toLowerCase();
const SEARCH_LIMIT = Number(process.env.GEO_SEARCH_LIMIT ?? "8");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const country = (searchParams.get("country") || DEFAULT_COUNTRY).toLowerCase();

  if (q.length < 3) {
    return NextResponse.json({ ok: false, error: "query_too_short" }, { status: 400 });
  }

  if (PROVIDER !== "nominatim") {
    return NextResponse.json({ ok: false, error: "provider_not_supported" }, { status: 501 });
  }

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(SEARCH_LIMIT),
    countrycodes: country,
  });

  const url = `${NOMINATIM_BASE}/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": NOMINATIM_EMAIL ? `eDebatte/${NOMINATIM_EMAIL}` : "eDebatte",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "upstream_failed" }, { status: 502 });
  }

  const data = (await res.json().catch(() => [])) as any[];
  const suggestions: GeoAddressSuggestion[] = data
    .map((item, idx) => {
      const addr = item.address ?? {};
      const labelParts = [
        [addr.road, addr.house_number].filter(Boolean).join(" ").trim(),
        [addr.postcode, addr.city || addr.town || addr.village || addr.municipality].filter(Boolean).join(" ").trim(),
      ].filter(Boolean);
      const label = labelParts.join(", ");
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        id: item.place_id ? String(item.place_id) : `osm-${idx}`,
        label: label || item.display_name || q,
        street: addr.road,
        houseNumber: addr.house_number,
        postalCode: addr.postcode,
        city: addr.city || addr.town || addr.village,
        municipality: addr.municipality || addr.city || addr.town || addr.village,
        state: addr.state,
        countryCode: (addr.country_code || DEFAULT_COUNTRY).toUpperCase(),
        lat,
        lon,
        provider: "osm_nominatim" as const,
        raw: item,
      } satisfies GeoAddressSuggestion;
    })
    .filter(Boolean) as GeoAddressSuggestion[];

  return NextResponse.json({ ok: true, suggestions });
}
