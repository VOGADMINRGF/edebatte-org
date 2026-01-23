// Minimal static neighbor mapping (extend as needed).
// NOTE: We only need country-level neighbors for the "Nachbarlaender" bucket.
export const NEIGHBORS: Record<string, string[]> = {
  DE: ["AT", "CH", "FR", "NL", "BE", "LU", "DK", "PL", "CZ"],
  AT: ["DE", "CH", "IT", "SI", "HU", "SK", "CZ"],
  CH: ["DE", "AT", "IT", "FR", "LI"],
  FR: ["BE", "LU", "DE", "CH", "IT", "MC", "ES", "AD"],
  NL: ["BE", "DE"],
  BE: ["NL", "DE", "LU", "FR"],
  PL: ["DE", "CZ", "SK", "UA", "BY", "LT", "RU"],
  CZ: ["DE", "AT", "SK", "PL"],
  DK: ["DE"],
  IT: ["FR", "CH", "AT", "SI", "SM", "VA"],
  ES: ["FR", "PT", "AD", "GI"],
  PT: ["ES"],
};

export function getNeighbors(country: string | undefined): string[] {
  if (!country) return [];
  return NEIGHBORS[country.toUpperCase()] || [];
}
