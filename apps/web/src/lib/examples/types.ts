export type ExampleKind = "Debattenpunkt" | "Abstimmung";

export type ExampleStats = {
  votes?: number;
  participants?: number;
  updatedHoursAgo?: number;
};

export type ExampleItem = {
  id: string;
  kind: ExampleKind;
  topics: string[];
  topics_en?: string[];
  title_de: string;
  title_en?: string;

  // targeting
  scope: "WORLD" | "EU" | "COUNTRY" | "REGION";
  country?: string; // ISO-2
  region?: string; // provider dependent (e.g. "BW")
  stats?: ExampleStats;
};
