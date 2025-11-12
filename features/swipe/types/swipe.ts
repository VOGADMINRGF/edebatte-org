//Finale Version 04.August 2025
 
export interface Alternative {
  text: string;
  type: string;
  impact: string;
  votes?: {
    agree?: number;
    neutral?: number;
    disagree?: number;
  };
}

export interface ImpactLogic {
  type: string;
  description: {
    einfach: string;
    eloquent?: string;
  };
}

export interface AISummary {
  toxicity?: number;
  sentiment?: string;
  subjectAreas?: string[];
}

export interface RegionObj {
  ags?: string;
  nuts1?: string;
  nuts2?: string;
  nuts3?: string;
  iso?: string;
  name: string;
  type?: string;
  population?: number;
}

export interface VotesSummary {
  agree?: number;
  neutral?: number;
  disagree?: number;
  requiredMajority?: number;
}

export interface SwipeStatement {
  id: string;
  title: string;
  statement: string;
  shortText?: string;
  plainStatement?: string;
  category: string;
  tags?: string[];
  context?: string;
  language?: string;
  regionScope?: RegionObj[];
  imageUrl?: string;
  media?: { src: string; alt?: string }[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  votes: VotesSummary;
  userVote?: "agree" | "neutral" | "disagree";
  impactLogic: ImpactLogic[];
  myImpact?: string;
  alternatives: Alternative[];
  eventualities?: string[];
  arguments?: {
    pro?: string[];
    contra?: string[];
  };
  summary?: {
    einfach?: string;
    eloquent?: string;
  };
  recommendation?: {
    einfach?: string;
    eloquent?: string;
  };
  facts?: Array<{
    text: string;
    source?: { name: string; url?: string; trustScore?: number };
  }>;
  aiAnnotations?: AISummary;
  accessibilityStatus?: string;
  barrierescore?: number;
  topComments?: Array<{
    user: string;
    text: string;
    agree?: boolean;
    createdAt?: string;
  }>;
  relatedStatements?: string[];
  relatedReports?: string[];
  reportAvailable?: boolean;
  visibility?: string;
  status?: string;
  importance?: string;
  // ... weitere Felder nach Bedarf
}
export type SwipeChoice = "agree" | "neutral" | "disagree";

export interface SwipeCard {
  id: string;
  question: string;       // 1-Satz-Frage
  sachverhalt?: string;   // optionaler Kontext
  zustaendigkeit?: "EU" | "Bund" | "Land" | "Kommune" | "-";
  tags?: string[];
  evidenceCount?: number; // Belege/Quellen vorhanden
}
