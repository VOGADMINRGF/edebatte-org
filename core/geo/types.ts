export type GeoProvider = "osm_nominatim" | "photon" | "custom";

export interface GeoAddressSuggestion {
  id: string;
  label: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  state?: string;
  countryCode: string;
  lat: number;
  lon: number;
  provider: GeoProvider;
  raw?: unknown;
}

export interface RegionInfo {
  countryCode: string;
  postalCode?: string;
  city?: string;
  municipalityName?: string;
  municipalityKey?: string;
  districtName?: string;
  bundestagWahlkreisId?: string;
  bundestagWahlkreisName?: string;
  landtagWahlkreisId?: string;
  landtagWahlkreisName?: string;
  lat: number;
  lon: number;
}
