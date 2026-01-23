export type Region = {
  code: string; // z.B. DE-BE, DE-BY oder NUTS/AGS Schlüssel
  name: string;
  level: "country" | "state" | "city";
};

export const REGIONS: Region[] = [
  { code: "DE", name: "Deutschland", level: "country" },
  { code: "DE-BE", name: "Berlin", level: "state" },
  { code: "DE-BY", name: "Bayern", level: "state" },
  { code: "DE-HH", name: "Hamburg", level: "state" },
  { code: "DE-NW", name: "Nordrhein‑Westfalen", level: "state" },
  { code: "DE-BE-11000000", name: "Berlin (Stadt)", level: "city" },
];
