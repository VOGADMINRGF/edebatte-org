export type GeoResult = {
  label: string;
  lat: number;
  lon: number;
  regionKey?: string; // e.g., DE:BE:11000000
  source: string;
};

export interface GeoProvider {
  geocode(query: string, countryHint?: string): Promise<GeoResult[]>;
}

export class NominatimProvider implements GeoProvider {
  base = "https://nominatim.openstreetmap.org/search";
  async geocode(query: string, countryHint?: string): Promise<GeoResult[]> {
    const url = new URL(this.base);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    if (countryHint) url.searchParams.set("countrycodes", countryHint.toLowerCase());
    const res = await fetch(url.toString(), { headers: { "User-Agent": "e-debatte/1.0" }});
    const json = await res.json();
    return (json || []).slice(0,10).map((r: any)=>({ label: r.display_name, lat: Number(r.lat), lon: Number(r.lon), source: "nominatim" }));
  }
}

export class GeoNamesProvider implements GeoProvider {
  constructor(private username: string) {}
  async geocode(query: string, countryHint?: string): Promise<GeoResult[]> {
    const url = new URL("http://api.geonames.org/searchJSON");
    url.searchParams.set("q", query);
    url.searchParams.set("maxRows", "10");
    if (countryHint) url.searchParams.set("country", countryHint.toUpperCase());
    url.searchParams.set("username", this.username);
    const res = await fetch(url.toString());
    const json = await res.json();
    return (json.geonames||[]).map((g:any)=>({ label: g.name, lat: g.lat, lon: g.lng, source: "geonames" }));
  }
}

export async function geocodeSmart(query: string, countryHint?: string): Promise<GeoResult[]> {
  const providers: GeoProvider[] = [];
  if (process.env.GEONAMES_USERNAME) providers.push(new GeoNamesProvider(process.env.GEONAMES_USERNAME));
  providers.push(new NominatimProvider());
  for (const p of providers) {
    try {
      const r = await p.geocode(query, countryHint);
      if (r.length) return r;
    } catch {}
  }
  return [];
}
