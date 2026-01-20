// core/logic/news/agencyKanon.ts
// Kanon der globalen Nachrichtenagenturen für eDebatte.
// DPA, Reuters und AFP sind bewusst enthalten, damit die Gewichtung
// später transparent gesteuert werden kann.

export type NewsAgencyTier =
  | 0  // global führende Agentur (weltweit relevant)
  | 1  // große Region / Sprachraum
  | 2; // ergänzend / regional

export type NewsAgencyId =
  | "dpa"
  | "reuters"
  | "afp"
  | "ap"
  | "xinhua"
  | "tass"
  | "efe"
  | "kyodo"
  | "yonhap"
  | "pti"
  | "ansa"
  | "apa"
  | "keystone_sda"
  | "cp"
  | "aap"
  | "cna"
  | "tt";

export type NewsAgencyMeta = {
  id: NewsAgencyId;
  displayName: string;
  shortName: string;
  isoCountries: string[]; // ISO-3166 Ländercodes, in denen die Agentur verankert ist
  languages: string[];    // Haupt-Sprachen, z.B. ["de","en","es"]
  tiers: NewsAgencyTier[];
  // Nur Meta – hier KEINE geheimen Feed-URLs, die z.B. lizenzpflichtig sein könnten.
  notes?: string[];
};

export const NEWS_AGENCIES: readonly NewsAgencyMeta[] = [
  {
    id: "dpa",
    displayName: "Deutsche Presse-Agentur",
    shortName: "dpa",
    isoCountries: ["DE"],
    languages: ["de", "en"],
    tiers: [0],
    notes: ["Leitagentur im deutschsprachigen Raum"]
  },
  {
    id: "reuters",
    displayName: "Reuters",
    shortName: "Reuters",
    isoCountries: ["GB", "US"],
    languages: ["en"],
    tiers: [0],
    notes: ["Globale Wirtschafts- und Politikberichterstattung"]
  },
  {
    id: "afp",
    displayName: "Agence France-Presse",
    shortName: "AFP",
    isoCountries: ["FR"],
    languages: ["fr", "en", "es", "ar"],
    tiers: [0],
    notes: ["Starke Abdeckung Afrika, Nahost, Frankophonie"]
  },
  {
    id: "ap",
    displayName: "Associated Press",
    shortName: "AP",
    isoCountries: ["US"],
    languages: ["en", "es"],
    tiers: [0],
    notes: ["US-basierte globale Agentur, Genossenschaftsmodell"]
  },
  {
    id: "xinhua",
    displayName: "Xinhua News Agency",
    shortName: "Xinhua",
    isoCountries: ["CN"],
    languages: ["zh", "en", "fr", "es", "ar", "ru"],
    tiers: [0],
    notes: ["Staatsagentur der VR China"]
  },
  {
    id: "tass",
    displayName: "TASS Russian News Agency",
    shortName: "TASS",
    isoCountries: ["RU"],
    languages: ["ru", "en"],
    tiers: [1],
    notes: ["Russische Staatsagentur; Terms-of-use streng beachten"]
  },
  {
    id: "efe",
    displayName: "Agencia EFE",
    shortName: "EFE",
    isoCountries: ["ES"],
    languages: ["es", "pt", "en"],
    tiers: [1],
    notes: ["Größte Agentur im spanischsprachigen Raum"]
  },
  {
    id: "kyodo",
    displayName: "Kyodo News",
    shortName: "Kyodo",
    isoCountries: ["JP"],
    languages: ["ja", "en"],
    tiers: [1],
    notes: ["Japanische Genossenschaftsagentur"]
  },
  {
    id: "yonhap",
    displayName: "Yonhap News Agency",
    shortName: "Yonhap",
    isoCountries: ["KR"],
    languages: ["ko", "en"],
    tiers: [1],
    notes: ["Führende Agentur Südkoreas"]
  },
  {
    id: "pti",
    displayName: "Press Trust of India",
    shortName: "PTI",
    isoCountries: ["IN"],
    languages: ["en", "hi"],
    tiers: [1],
    notes: ["Größte indische Nachrichtenagentur"]
  },
  {
    id: "ansa",
    displayName: "Agenzia Nazionale Stampa Associata",
    shortName: "ANSA",
    isoCountries: ["IT"],
    languages: ["it", "en"],
    tiers: [1],
    notes: ["Führende Agentur Italiens"]
  },
  {
    id: "apa",
    displayName: "Austria Presse Agentur",
    shortName: "APA",
    isoCountries: ["AT"],
    languages: ["de"],
    tiers: [2],
    notes: ["Nationale Agentur Österreichs"]
  },
  {
    id: "keystone_sda",
    displayName: "Keystone-SDA",
    shortName: "SDA",
    isoCountries: ["CH"],
    languages: ["de", "fr", "it"],
    tiers: [2],
    notes: ["Schweizer Nachrichtenagentur"]
  },
  {
    id: "cp",
    displayName: "The Canadian Press",
    shortName: "CP",
    isoCountries: ["CA"],
    languages: ["en", "fr"],
    tiers: [2],
    notes: ["Kanadische Genossenschaftsagentur"]
  },
  {
    id: "aap",
    displayName: "Australian Associated Press",
    shortName: "AAP",
    isoCountries: ["AU"],
    languages: ["en"],
    tiers: [2],
    notes: ["Unabhängige Agentur in Australien"]
  },
  {
    id: "cna",
    displayName: "Central News Agency",
    shortName: "CNA",
    isoCountries: ["TW"],
    languages: ["zh", "en"],
    tiers: [2],
    notes: ["Nationale Agentur Taiwans"]
  },
  {
    id: "tt",
    displayName: "Tidningarnas Telegrambyrå",
    shortName: "TT",
    isoCountries: ["SE"],
    languages: ["sv", "en"],
    tiers: [2],
    notes: ["Schwedische Nachrichtenagentur"]
  }
] as const;

export const NEWS_AGENCY_IDS: readonly NewsAgencyId[] =
  NEWS_AGENCIES.map(a => a.id) as NewsAgencyId[];

// Hilfsfunktion: Meta-Lookup
export function getNewsAgencyMeta(id: NewsAgencyId): NewsAgencyMeta | undefined {
  return NEWS_AGENCIES.find(a => a.id === id);
}
